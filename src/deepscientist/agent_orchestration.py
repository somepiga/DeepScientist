from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .shared import append_jsonl, read_jsonl_tail, utc_now
from .skills import discover_skill_bundles


STAGE_AGENT_CONTEXT_SCOPES: dict[str, dict[str, tuple[str, ...]]] = {
    "scout": {
        "quest": ("papers", "knowledge", "decisions"),
        "global": ("papers", "knowledge", "templates"),
    },
    "baseline": {
        "quest": ("papers", "decisions", "episodes", "knowledge"),
        "global": ("knowledge", "templates", "papers"),
    },
    "idea": {
        "quest": ("papers", "ideas", "decisions", "knowledge"),
        "global": ("papers", "knowledge", "templates"),
    },
    "optimize": {
        "quest": ("episodes", "decisions", "ideas", "knowledge"),
        "global": ("knowledge", "templates"),
    },
    "experiment": {
        "quest": ("ideas", "decisions", "episodes", "knowledge"),
        "global": ("knowledge", "templates"),
    },
    "analysis-campaign": {
        "quest": ("ideas", "decisions", "episodes", "knowledge", "papers"),
        "global": ("knowledge", "templates", "papers"),
    },
    "write": {
        "quest": ("papers", "decisions", "knowledge", "ideas"),
        "global": ("templates", "knowledge", "papers"),
    },
    "finalize": {
        "quest": ("decisions", "knowledge", "episodes"),
        "global": ("knowledge", "templates"),
    },
    "decision": {
        "quest": ("decisions", "knowledge", "episodes", "ideas"),
        "global": ("knowledge", "templates"),
    },
}

STAGE_AGENT_MODES: dict[str, tuple[str, ...]] = {
    "scout": ("exploration",),
    "baseline": ("exploration", "validation", "paper_track"),
    "idea": ("exploration",),
    "optimize": ("exploration", "validation"),
    "experiment": ("exploration", "validation", "paper_track"),
    "analysis-campaign": ("exploration", "validation", "paper_track"),
    "write": ("paper_track",),
    "finalize": ("paper_track",),
    "decision": ("exploration", "validation", "paper_track"),
}

DEFAULT_AGENT_CONTEXT_SCOPE = {
    "quest": ("decisions", "knowledge"),
    "global": ("knowledge", "templates"),
}


@dataclass(frozen=True)
class AgentDefinition:
    agent_id: str
    skill_id: str
    name: str
    role: str
    description: str
    prompt_file: str
    context_scope: dict[str, tuple[str, ...]]
    modes: tuple[str, ...]

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.agent_id,
            "skill_id": self.skill_id,
            "name": self.name,
            "role": self.role,
            "description": self.description,
            "prompt_file": self.prompt_file,
            "context_scope": {
                "quest": list(self.context_scope.get("quest", ())),
                "global": list(self.context_scope.get("global", ())),
            },
            "modes": list(self.modes),
        }


def list_agent_definitions(repo_root: Path) -> list[AgentDefinition]:
    definitions: list[AgentDefinition] = []
    for bundle in discover_skill_bundles(Path(repo_root)):
        scope = STAGE_AGENT_CONTEXT_SCOPES.get(bundle.skill_id, DEFAULT_AGENT_CONTEXT_SCOPE)
        definitions.append(
            AgentDefinition(
                agent_id=bundle.skill_id,
                skill_id=bundle.skill_id,
                name=bundle.name,
                role=bundle.role,
                description=bundle.description,
                prompt_file=f"{bundle.skill_id}/SKILL.md",
                context_scope={
                    "quest": tuple(scope.get("quest", ())),
                    "global": tuple(scope.get("global", ())),
                },
                modes=STAGE_AGENT_MODES.get(bundle.skill_id, ()),
            )
        )
    return definitions


def get_agent_definition(repo_root: Path, agent_id: str) -> AgentDefinition:
    normalized = str(agent_id or "").strip()
    for definition in list_agent_definitions(Path(repo_root)):
        if definition.agent_id == normalized:
            return definition
    raise KeyError(f"Unknown agent id: {agent_id!r}")


def agent_runs_path(quest_root: Path) -> Path:
    return Path(quest_root) / ".ds" / "agent_runs.jsonl"


def agent_handoffs_path(quest_root: Path) -> Path:
    return Path(quest_root) / ".ds" / "agent_handoffs.jsonl"


def record_agent_run(quest_root: Path, payload: dict[str, Any]) -> dict[str, Any]:
    record = {**payload, "created_at": str(payload.get("created_at") or utc_now())}
    append_jsonl(agent_runs_path(quest_root), record)
    return record


def record_agent_handoff(quest_root: Path, payload: dict[str, Any]) -> dict[str, Any]:
    record = {**payload, "created_at": str(payload.get("created_at") or utc_now())}
    append_jsonl(agent_handoffs_path(quest_root), record)
    return record


def recent_agent_runs(quest_root: Path, *, limit: int = 30) -> list[dict[str, Any]]:
    return read_jsonl_tail(agent_runs_path(quest_root), limit)


def recent_agent_handoffs(
    quest_root: Path,
    *,
    limit: int = 20,
    to_agent_id: str | None = None,
) -> list[dict[str, Any]]:
    records = read_jsonl_tail(agent_handoffs_path(quest_root), max(limit * 4, limit))
    normalized_target = str(to_agent_id or "").strip()
    if normalized_target:
        records = [item for item in records if str(item.get("to_agent_id") or "").strip() == normalized_target]
    return records[-limit:]

