from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ..shared import append_jsonl, generate_id, utc_now
from .base import RunRequest


@dataclass(frozen=True)
class RunnerEventWriter:
    """Writes DeepScientist's stable runner-event envelope for any runtime."""

    request: RunRequest
    source: str

    @property
    def path(self):
        return self.request.quest_root / ".ds" / "events.jsonl"

    def emit(self, event_type: str, **fields: Any) -> None:
        payload = {
            "event_id": generate_id("evt"),
            "type": event_type,
            "quest_id": self.request.quest_id,
            "run_id": self.request.run_id,
            "source": self.source,
            "skill_id": self.request.skill_id,
            "created_at": utc_now(),
            **fields,
        }
        append_jsonl(self.path, payload)

    def turn_started(self) -> None:
        self.emit(
            "runner.turn_start",
            model=self.request.model,
            runtime_capabilities=list(self.request.runtime_capabilities),
        )

    def turn_finished(self, *, exit_code: int, stderr_text: str, summary: str) -> None:
        self.emit(
            "runner.turn_finish",
            model=self.request.model,
            exit_code=exit_code,
            stderr_text=stderr_text[:2000],
            summary=summary[:1000],
        )
