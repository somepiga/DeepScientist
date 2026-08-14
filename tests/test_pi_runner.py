from __future__ import annotations

import io
import json
import threading

from deepscientist.runners.pi import PiRunner, _pi_events


def test_pi_rpc_events_translate_to_canonical_runner_events() -> None:
    created_at = "2026-08-14T00:00:00Z"
    delta_events, delta_text, settled = _pi_events(
        {
            "type": "message_update",
            "assistantMessageEvent": {"type": "text_delta", "contentIndex": 2, "delta": "Trying a new mechanism."},
        },
        quest_id="q-001",
        run_id="run-001",
        skill_id="idea",
        created_at=created_at,
    )
    tool_start, _, _ = _pi_events(
        {"type": "tool_execution_start", "toolCallId": "call-1", "toolName": "bash", "args": {"command": "ls"}},
        quest_id="q-001",
        run_id="run-001",
        skill_id="idea",
        created_at=created_at,
    )
    tool_end, _, _ = _pi_events(
        {
            "type": "tool_execution_end",
            "toolCallId": "call-1",
            "toolName": "bash",
            "result": {"content": [{"type": "text", "text": "ok"}]},
            "isError": False,
        },
        quest_id="q-001",
        run_id="run-001",
        skill_id="idea",
        created_at=created_at,
    )
    final_events, final_text, settled = _pi_events(
        {
            "type": "message_end",
            "message": {"id": "message-1", "role": "assistant", "content": [{"type": "text", "text": "Final method brief."}]},
        },
        quest_id="q-001",
        run_id="run-001",
        skill_id="idea",
        created_at=created_at,
    )

    assert delta_events[0]["type"] == "runner.delta"
    assert delta_events[0]["stream_id"] == "pi:run-001:2"
    assert delta_text == ["Trying a new mechanism."]
    assert tool_start[0]["type"] == "runner.tool_call"
    assert tool_end[0]["type"] == "runner.tool_result"
    assert tool_end[0]["tool_call_id"] == "call-1"
    assert final_events[0]["type"] == "runner.agent_message"
    assert final_events[0]["message_id"] == "message-1"
    assert final_text == ["Final method brief."]
    assert settled is False


def test_pi_rpc_agent_settled_marks_end_of_turn() -> None:
    events, text, settled = _pi_events(
        {"type": "agent_settled"},
        quest_id="q-001",
        run_id="run-001",
        skill_id="idea",
        created_at="2026-08-14T00:00:00Z",
    )

    assert events == []
    assert text == []
    assert settled is True


def test_pi_interrupt_sends_abort_before_stopping_process(monkeypatch) -> None:
    class FakeProcess:
        pid = 4242

        def __init__(self) -> None:
            self.stdin = io.StringIO()
            self.terminated = False

        def poll(self):
            return None

        def terminate(self) -> None:
            self.terminated = True

    process = FakeProcess()
    runner = PiRunner.__new__(PiRunner)
    runner._process_lock = threading.Lock()
    runner._active_processes = {"q-001": process}
    monkeypatch.setattr("deepscientist.runners.pi.os.killpg", lambda *_: (_ for _ in ()).throw(OSError("no process group")))

    assert runner.interrupt("q-001") is True
    assert json.loads(process.stdin.getvalue()) == {"type": "abort"}
    assert process.terminated is True
