from __future__ import annotations

import json
import os
import signal
import subprocess
import threading
from pathlib import Path
from typing import Any

from ..artifact import ArtifactService
from ..gitops import export_git_graph
from ..process_control import process_session_popen_kwargs
from ..prompts import PromptBuilder
from ..runtime_logs import JsonlLogger
from ..shared import append_jsonl, ensure_dir, ensure_utf8_subprocess_env, generate_id, read_yaml, resolve_runner_binary, utc_now, write_json, write_text
from .base import RunRequest, RunResult
from .events import RunnerEventWriter


def _text_from_content(value: object) -> str:
    if isinstance(value, str):
        return value.strip()
    if not isinstance(value, list):
        return ""
    parts: list[str] = []
    for item in value:
        if isinstance(item, str) and item.strip():
            parts.append(item.strip())
        elif isinstance(item, dict) and str(item.get("type") or "").lower() in {"text", "output_text"}:
            text = str(item.get("text") or "").strip()
            if text:
                parts.append(text)
    return "\n".join(parts).strip()


def _compact_json(value: object, *, limit: int = 16_000) -> tuple[str, bool]:
    try:
        text = json.dumps(value, ensure_ascii=False, sort_keys=True)
    except (TypeError, ValueError):
        text = str(value or "")
    if len(text) <= limit:
        return text, False
    return f"{text[:limit]}\n[truncated {len(text) - limit} chars]", True


def _pi_events(
    payload: dict[str, Any],
    *,
    quest_id: str,
    run_id: str,
    skill_id: str,
    created_at: str,
) -> tuple[list[dict[str, Any]], list[str], bool]:
    """Translate Pi RPC events into the stable DeepScientist runner event set."""

    event_type = str(payload.get("type") or "")
    common = {
        "quest_id": quest_id,
        "run_id": run_id,
        "source": "pi",
        "skill_id": skill_id,
        "created_at": created_at,
    }
    if event_type == "message_update":
        update = payload.get("assistantMessageEvent")
        if not isinstance(update, dict):
            return [], [], False
        update_type = str(update.get("type") or "")
        content_index = str(update.get("contentIndex") or 0)
        stream_id = f"pi:{run_id}:{content_index}"
        delta = str(update.get("delta") or "")
        if update_type == "text_delta" and delta:
            return [
                {
                    "event_id": generate_id("evt"),
                    "type": "runner.delta",
                    "text": delta,
                    "stream_id": stream_id,
                    "message_id": stream_id,
                    "raw_event_type": event_type,
                    **common,
                }
            ], [delta], False
        if update_type == "thinking_delta" and delta:
            return [
                {
                    "event_id": generate_id("evt"),
                    "type": "runner.reasoning",
                    "text": delta,
                    "stream_id": stream_id,
                    "message_id": stream_id,
                    "kind": "thinking",
                    "raw_event_type": event_type,
                    **common,
                }
            ], [], False
        if update_type == "toolcall_end":
            tool_call = update.get("toolCall") if isinstance(update.get("toolCall"), dict) else {}
            tool_call_id = str(tool_call.get("id") or generate_id("tool"))
            tool_name = str(tool_call.get("name") or "tool")
            args, _ = _compact_json(tool_call.get("arguments"), limit=8_000)
            return [
                {
                    "event_id": generate_id("evt"),
                    "type": "runner.tool_call",
                    "tool_call_id": tool_call_id,
                    "tool_name": tool_name,
                    "status": "calling",
                    "args": args,
                    "raw_event_type": event_type,
                    **common,
                }
            ], [], False
        return [], [], False
    if event_type == "message_end":
        message = payload.get("message") if isinstance(payload.get("message"), dict) else {}
        if str(message.get("role") or "") != "assistant":
            return [], [], False
        text = _text_from_content(message.get("content"))
        if not text:
            return [], [], False
        message_id = str(message.get("id") or f"pi:{run_id}:assistant")
        return [
            {
                "event_id": generate_id("evt"),
                "type": "runner.agent_message",
                "text": text,
                "stream_id": message_id,
                "message_id": message_id,
                "raw_event_type": event_type,
                **common,
            }
        ], [text], False
    if event_type == "tool_execution_start":
        args, _ = _compact_json(payload.get("args"), limit=8_000)
        return [
            {
                "event_id": generate_id("evt"),
                "type": "runner.tool_call",
                "tool_call_id": str(payload.get("toolCallId") or generate_id("tool")),
                "tool_name": str(payload.get("toolName") or "tool"),
                "status": "calling",
                "args": args,
                "raw_event_type": event_type,
                **common,
            }
        ], [], False
    if event_type == "tool_execution_end":
        output, truncated = _compact_json(payload.get("result"))
        args, _ = _compact_json(payload.get("args"), limit=8_000)
        result_event: dict[str, Any] = {
            "event_id": generate_id("evt"),
            "type": "runner.tool_result",
            "tool_call_id": str(payload.get("toolCallId") or generate_id("tool")),
            "tool_name": str(payload.get("toolName") or "tool"),
            "status": "failed" if bool(payload.get("isError")) else "completed",
            "args": args,
            "output": output,
            "raw_event_type": event_type,
            **common,
        }
        if truncated:
            result_event["output_truncated"] = True
        return [result_event], [], False
    return [], [], event_type == "agent_settled"


class PiRunner:
    """Pi's JSONL RPC runtime adapter.

    Pi owns its model session, tool loop, and tool-permission policy.
    DeepScientist remains the authority for quest state, artifacts, and research
    evidence, but does not yet inject its MCP tools or sandbox policy into Pi.
    """

    runner_name = "pi"

    def __init__(
        self,
        *,
        home: Path,
        repo_root: Path,
        binary: str,
        logger: JsonlLogger,
        prompt_builder: PromptBuilder,
        artifact_service: ArtifactService,
    ) -> None:
        self.home = home
        self.repo_root = repo_root
        self.binary = binary
        self.logger = logger
        self.prompt_builder = prompt_builder
        self.artifact_service = artifact_service
        self._process_lock = threading.Lock()
        self._active_processes: dict[str, subprocess.Popen[str]] = {}

    @staticmethod
    def _subprocess_popen_kwargs(*, workspace_root: Path, env: dict[str, str]) -> dict[str, Any]:
        return {
            "cwd": str(workspace_root),
            "env": env,
            "stdin": subprocess.PIPE,
            "stdout": subprocess.PIPE,
            "stderr": subprocess.PIPE,
            "text": True,
            "encoding": "utf-8",
            "errors": "replace",
            **process_session_popen_kwargs(hide_window=True),
        }

    def run(self, request: RunRequest) -> RunResult:
        workspace_root = request.worktree_root or request.quest_root
        run_root = ensure_dir(request.quest_root / ".ds" / "runs" / request.run_id)
        history_root = ensure_dir(request.quest_root / ".ds" / "pi_history" / request.run_id)
        prompt = self.prompt_builder.build(
            quest_id=request.quest_id,
            skill_id=request.skill_id,
            user_message=request.message,
            model=request.model,
            turn_reason=request.turn_reason,
            turn_intent=request.turn_intent,
            turn_mode=request.turn_mode,
            retry_context=request.retry_context,
            runner_name=self.runner_name,
        )
        write_text(run_root / "prompt.md", prompt)
        runner_config = self._load_runner_config()
        command = self._build_command(request, history_root=history_root, runner_config=runner_config)
        write_json(run_root / "command.json", {"command": command, "cwd": str(workspace_root), "session_root": str(history_root)})
        env = ensure_utf8_subprocess_env(self._build_env(request, workspace_root=workspace_root, runner_config=runner_config))
        process = subprocess.Popen(command, **self._subprocess_popen_kwargs(workspace_root=workspace_root, env=env))
        with self._process_lock:
            self._active_processes[request.quest_id] = process
        assert process.stdin is not None
        assert process.stdout is not None
        assert process.stderr is not None
        stderr_chunks: list[str] = []
        stderr_thread = threading.Thread(target=lambda: stderr_chunks.extend(process.stderr or ()), name=f"pi-stderr-{request.run_id}", daemon=True)
        stderr_thread.start()
        event_writer = RunnerEventWriter(request=request, source=self.runner_name)
        history_events = history_root / "events.jsonl"
        stdout_events = run_root / "stdout.jsonl"
        output_parts: list[str] = []
        settled = False
        try:
            self._send(process, {"id": request.run_id, "type": "prompt", "message": prompt})
            event_writer.turn_started()
            for raw_line in process.stdout:
                line = raw_line.rstrip("\r\n")
                if not line:
                    continue
                timestamp = utc_now()
                append_jsonl(stdout_events, {"timestamp": timestamp, "line": line})
                try:
                    payload = json.loads(line)
                except json.JSONDecodeError:
                    payload = {"raw": line}
                append_jsonl(history_events, {"timestamp": timestamp, "event": payload})
                if isinstance(payload, dict):
                    if (
                        str(payload.get("type") or "") == "response"
                        and str(payload.get("command") or "") == "prompt"
                        and payload.get("success") is False
                    ):
                        rejection = str(payload.get("error") or payload.get("message") or "Pi rejected the prompt.").strip()
                        output_parts.append(rejection)
                        event_writer.emit(
                            "runner.runtime_error",
                            summary=rejection[:1000],
                            raw_event_type="response",
                        )
                        if process.poll() is None:
                            process.terminate()
                    translated, texts, is_settled = _pi_events(
                        payload,
                        quest_id=request.quest_id,
                        run_id=request.run_id,
                        skill_id=request.skill_id,
                        created_at=timestamp,
                    )
                    for event in translated:
                        append_jsonl(event_writer.path, event)
                    output_parts.extend(texts)
                    settled = settled or is_settled
                    if is_settled and process.poll() is None:
                        process.terminate()
                try:
                    self.artifact_service.quest_service.schedule_projection_refresh(request.quest_root, kinds=("details",))
                except Exception:
                    pass
            exit_code = process.wait()
            if settled:
                exit_code = 0
            stderr_thread.join(timeout=5)
            stderr_text = "".join(stderr_chunks)
            output_text = next((part for part in reversed(output_parts) if part.strip()), "")
            event_writer.turn_finished(exit_code=exit_code, stderr_text=stderr_text, summary=output_text)
            write_text(history_root / "assistant.md", (output_text + "\n") if output_text else "")
            write_text(run_root / "stderr.txt", stderr_text)
            payload = {
                "ok": exit_code == 0,
                "run_id": request.run_id,
                "model": request.model,
                "exit_code": exit_code,
                "history_root": str(history_root),
                "run_root": str(run_root),
                "output_text": output_text,
                "stderr_text": stderr_text,
                "completed_at": utc_now(),
            }
            write_json(run_root / "result.json", payload)
            write_json(history_root / "meta.json", payload)
            artifact_result = self.artifact_service.record(
                request.quest_root,
                {
                    "kind": "run",
                    "status": "completed" if exit_code == 0 else "failed",
                    "run_id": request.run_id,
                    "run_kind": request.skill_id,
                    "model": request.model,
                    "summary": output_text[:1000],
                    "history_root": str(history_root),
                    "run_root": str(run_root),
                    "exit_code": exit_code,
                },
                workspace_root=workspace_root,
                commit_message=f"run: {request.skill_id} {request.run_id}",
            )
            export_git_graph(request.quest_root, request.quest_root / "artifacts" / "graphs")
            write_json(run_root / "artifact.json", artifact_result)
            return RunResult(exit_code == 0, request.run_id, request.model, output_text, exit_code, history_root, run_root, stderr_text)
        finally:
            if process.poll() is None:
                try:
                    process.terminate()
                    process.wait(timeout=3)
                except (OSError, subprocess.TimeoutExpired):
                    try:
                        process.kill()
                    except OSError:
                        pass
            if stderr_thread.is_alive():
                stderr_thread.join(timeout=2)
            with self._process_lock:
                if self._active_processes.get(request.quest_id) is process:
                    self._active_processes.pop(request.quest_id, None)

    def interrupt(self, quest_id: str) -> bool:
        with self._process_lock:
            process = self._active_processes.get(quest_id)
        if process is None or process.poll() is not None:
            return False
        try:
            self._send(process, {"type": "abort"})
        except (OSError, ValueError):
            pass
        try:
            if os.name == "nt":
                process.send_signal(signal.CTRL_BREAK_EVENT)  # type: ignore[attr-defined]
            else:
                os.killpg(os.getpgid(process.pid), signal.SIGTERM)
        except (AttributeError, OSError, ProcessLookupError):
            try:
                process.terminate()
            except OSError:
                return False
        return True

    def steer(self, quest_id: str, message: str) -> bool:
        """Queue a Pi steering message for the active RPC session."""

        with self._process_lock:
            process = self._active_processes.get(quest_id)
        if process is None or process.poll() is not None or not str(message or "").strip():
            return False
        try:
            self._send(process, {"type": "steer", "message": str(message).strip()})
        except (OSError, ValueError):
            return False
        return True

    @staticmethod
    def _send(process: subprocess.Popen[str], payload: dict[str, Any]) -> None:
        if process.stdin is None:
            raise OSError("Pi RPC stdin is unavailable.")
        process.stdin.write(json.dumps(payload, ensure_ascii=False) + "\n")
        process.stdin.flush()

    def _build_command(self, request: RunRequest, *, history_root: Path, runner_config: dict[str, Any]) -> list[str]:
        binary = resolve_runner_binary(self.binary, runner_name=self.runner_name) or self.binary
        command = [binary, "--mode", "rpc", "--session-dir", str(history_root / "sessions")]
        provider = str(runner_config.get("provider") or "").strip()
        model = str(request.model or "").strip()
        if provider:
            command.extend(["--provider", provider])
        if model and model.lower() not in {"inherit", "default", "pi-default"}:
            command.extend(["--model", model])
        return command

    def _build_env(self, request: RunRequest, *, workspace_root: Path, runner_config: dict[str, Any]) -> dict[str, str]:
        env = dict(os.environ)
        configured_env = runner_config.get("env") if isinstance(runner_config.get("env"), dict) else {}
        for key, value in configured_env.items():
            if str(key or "").strip() and value is not None and str(value):
                env[str(key).strip()] = str(value)
        env.update(
            {
                "DEEPSCIENTIST_HOME": str(self.home),
                "DEEPSCIENTIST_REPO_ROOT": str(self.repo_root),
                "DS_HOME": str(self.home),
                "DS_QUEST_ID": request.quest_id,
                "DS_QUEST_ROOT": str(request.quest_root),
                "DS_WORKTREE_ROOT": str(workspace_root),
                "DS_RUN_ID": request.run_id,
                "DS_TURN_REASON": request.turn_reason,
                "DS_TURN_INTENT": request.turn_intent,
                "DS_TURN_MODE": request.turn_mode,
                "DS_AGENT_ROLE": request.skill_id,
                "DS_TEAM_MODE": "single",
            }
        )
        configured_agent_dir = str(runner_config.get("config_dir") or "").strip()
        if configured_agent_dir:
            env["PI_CODING_AGENT_DIR"] = str(Path(configured_agent_dir).expanduser())
        quest_yaml = read_yaml(request.quest_root / "quest.yaml", {})
        env["DS_ACTIVE_ANCHOR"] = str(quest_yaml.get("active_anchor", "baseline"))
        env["DS_CONVERSATION_ID"] = f"quest:{request.quest_id}"
        return env

    def _load_runner_config(self) -> dict[str, Any]:
        from ..config import ConfigManager

        try:
            config = ConfigManager(self.home).load_runners_config().get(self.runner_name)
        except OSError:
            return {}
        return dict(config) if isinstance(config, dict) else {}
