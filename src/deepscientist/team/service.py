from __future__ import annotations

from pathlib import Path
from typing import Any

from ..agent_orchestration import (
    get_agent_definition,
    list_agent_definitions,
    recent_agent_handoffs,
    recent_agent_runs,
    record_agent_handoff,
    record_agent_run,
)
from ..prompts.agent_prompts import get_quest_agent_skill
from ..home import repo_root as resolve_repo_root
from ..shared import append_jsonl, ensure_dir, generate_id, read_json, read_yaml, utc_now


class StageAgentTeamService:
    def __init__(self, home: Path, repo_root: Path | None = None) -> None:
        self.home = home
        self.repo_root = Path(repo_root or resolve_repo_root())

    def assignment(self, *, skill_id: str, turn_id: str, run_id: str) -> dict[str, Any]:
        definition = get_agent_definition(self.repo_root, skill_id)
        return {
            "agent_id": definition.agent_id,
            "agent_role": definition.agent_id,
            "agent_instance_id": run_id,
            "agent_context_scope": definition.context_scope,
            "team_mode": "stage_agents",
            "turn_id": turn_id,
        }

    def record_started(
        self,
        quest_root: Path,
        *,
        quest_id: str,
        run_id: str,
        turn_id: str,
        skill_id: str,
        agent_id: str,
        agent_instance_id: str,
        runner_name: str,
        model: str,
        attempt_index: int,
    ) -> dict[str, Any]:
        record = record_agent_run(
            quest_root,
            {
                "event_id": generate_id("evt"),
                "type": "agent.run_started",
                "quest_id": quest_id,
                "run_id": run_id,
                "turn_id": turn_id,
                "skill_id": skill_id,
                "agent_id": agent_id,
                "agent_role": agent_id,
                "agent_instance_id": agent_instance_id,
                "team_mode": "stage_agents",
                "runner": runner_name,
                "model": model,
                "attempt_index": attempt_index,
            },
        )
        append_jsonl(Path(quest_root) / ".ds" / "events.jsonl", record)
        return record

    def record_finished(
        self,
        quest_root: Path,
        *,
        quest_id: str,
        run_id: str,
        turn_id: str,
        skill_id: str,
        agent_id: str,
        agent_instance_id: str,
        ok: bool,
        exit_code: int | None,
    ) -> dict[str, Any]:
        record = record_agent_run(
            quest_root,
            {
                "event_id": generate_id("evt"),
                "type": "agent.run_finished",
                "quest_id": quest_id,
                "run_id": run_id,
                "turn_id": turn_id,
                "skill_id": skill_id,
                "agent_id": agent_id,
                "agent_role": agent_id,
                "agent_instance_id": agent_instance_id,
                "team_mode": "stage_agents",
                "ok": bool(ok),
                "exit_code": exit_code,
            },
        )
        append_jsonl(Path(quest_root) / ".ds" / "events.jsonl", record)
        return record

    def handoff(
        self,
        quest_root: Path,
        *,
        quest_id: str,
        run_id: str,
        turn_id: str,
        from_agent_id: str,
        to_agent_id: str,
        summary: str,
        reason: str,
        durable_refs: dict[str, Any],
    ) -> dict[str, Any] | None:
        if not from_agent_id or not to_agent_id or from_agent_id == to_agent_id:
            return None
        record = record_agent_handoff(
            quest_root,
            {
                "handoff_id": generate_id("handoff"),
                "type": "agent.handoff",
                "quest_id": quest_id,
                "run_id": run_id,
                "turn_id": turn_id,
                "from_agent_id": from_agent_id,
                "to_agent_id": to_agent_id,
                "reason": reason,
                "summary": summary,
                "durable_refs": durable_refs,
            },
        )
        append_jsonl(Path(quest_root) / ".ds" / "events.jsonl", record)
        return record

    def handoff_after_run(
        self,
        quest_root: Path,
        *,
        quest_id: str,
        run_id: str,
        turn_id: str,
        from_agent_id: str,
        output_text: str,
        snapshot: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        quest_root = Path(quest_root)
        quest_yaml = read_yaml(quest_root / "quest.yaml", {})
        projected = dict(snapshot or {})
        next_agent_id = str(
            quest_yaml.get("active_anchor") or projected.get("active_anchor") or ""
        ).strip()
        if not next_agent_id or next_agent_id == from_agent_id:
            return None
        try:
            get_agent_definition(self.repo_root, next_agent_id)
        except KeyError:
            return None

        summary = " ".join(str(output_text or "").split())
        if len(summary) > 1200:
            summary = summary[:1197].rstrip() + "..."
        durable_refs = {
            "active_anchor": next_agent_id,
            "active_baseline_id": projected.get("active_baseline_id"),
            "active_idea_id": projected.get("active_idea_id"),
            "active_analysis_campaign_id": projected.get("active_analysis_campaign_id"),
            "active_paper_line_ref": projected.get("active_paper_line_ref"),
            "current_workspace_branch": projected.get("current_workspace_branch"),
            "current_workspace_root": projected.get("current_workspace_root"),
        }
        return self.handoff(
            quest_root,
            quest_id=quest_id,
            run_id=run_id,
            turn_id=turn_id,
            from_agent_id=from_agent_id,
            to_agent_id=next_agent_id,
            summary=summary or f"Agent `{from_agent_id}` completed its stage and advanced the quest.",
            reason="active_anchor_changed",
            durable_refs={key: value for key, value in durable_refs.items() if value not in {None, ""}},
        )

    def snapshot(self, quest_root: Path) -> dict:
        quest_root = Path(quest_root)
        quest_yaml = read_yaml(quest_root / "quest.yaml", {})
        runtime_state = read_json(quest_root / ".ds" / "runtime_state.json", {})
        active_anchor = str(quest_yaml.get("active_anchor") or "decision").strip() or "decision"
        active_agent_id = str(runtime_state.get("active_agent_id") or "").strip() or None
        agents = []
        for definition in list_agent_definitions(self.repo_root):
            item = definition.as_dict()
            skill = get_quest_agent_skill(self.repo_root, quest_root, definition.agent_id)
            item["quest_configured"] = bool(skill.get("is_quest_override"))
            item["quest_config_updated_at"] = skill.get("updated_at")
            agents.append(item)
        return {
            "mode": "stage_agents",
            "selected_agent_id": active_anchor,
            "active_agent_id": active_agent_id,
            "active_agent_instance_id": runtime_state.get("active_agent_instance_id"),
            "last_agent_id": runtime_state.get("last_agent_id"),
            "last_agent_instance_id": runtime_state.get("last_agent_instance_id"),
            "updated_at": runtime_state.get("last_transition_at") or quest_yaml.get("updated_at") or utc_now(),
            "agents": agents,
            "recent_runs": recent_agent_runs(quest_root, limit=30),
            "recent_handoffs": recent_agent_handoffs(quest_root, limit=20),
        }

    def prepare_worktree_root(self, quest_root: Path, run_id: str) -> Path:
        return ensure_dir(quest_root / ".ds" / "worktrees" / run_id)


SingleTeamService = StageAgentTeamService
