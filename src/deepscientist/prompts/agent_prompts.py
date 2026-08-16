from __future__ import annotations

from pathlib import Path
from typing import Any

from ..agent_orchestration import get_agent_definition, list_agent_definitions
from ..memory.frontmatter import load_markdown_document
from ..skills import discover_skill_bundles
from ..skills.registry import SkillBundle

_OVERRIDE_FILENAME = "prompt.override.md"
_QUEST_SKILLS_DIRNAME = "skills"


def _skills_root(repo_root: Path) -> Path:
    return repo_root / "src" / "skills"


def _obsolete_dir(repo_root: Path) -> Path:
    directory = repo_root / "_obsolete"
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def list_agents(repo_root: Path) -> list[dict[str, Any]]:
    """Enumerate every discovered agent (stage + companion) with metadata.

    Persisted per-agent prompt overrides are reported via ``has_override`` so the
    UI can show which agents already carry a customized dedicated prompt.
    """
    root = Path(repo_root)
    agents: list[dict[str, Any]] = []
    bundles = {bundle.skill_id: bundle for bundle in discover_skill_bundles(root)}
    for definition in list_agent_definitions(root):
        bundle = bundles[definition.skill_id]
        override_path = bundle.root / _OVERRIDE_FILENAME
        agents.append(
            {
                **definition.as_dict(),
                "has_override": override_path.exists(),
            }
        )
    return agents


def get_agent_default_prompt(repo_root: Path, agent_id: str) -> str:
    """Return the agent's default prompt template (its SKILL.md body, frontmatter stripped)."""
    root = Path(repo_root)
    bundle = _resolve_bundle(root, agent_id)
    metadata, body = load_markdown_document(bundle.skill_md)
    if isinstance(body, str) and body.strip():
        return body.strip() + "\n"
    # Fall back to the raw file if the frontmatter loader returned nothing useful.
    return bundle.skill_md.read_text(encoding="utf-8").strip() + "\n"


def get_agent_prompt(repo_root: Path, agent_id: str) -> tuple[str, bool]:
    """Return ``(prompt_text, has_override)``.

    The dedicated prompt is the override file when present, otherwise the
    agent's default SKILL.md template.
    """
    root = Path(repo_root)
    bundle = _resolve_bundle(root, agent_id)
    override_path = bundle.root / _OVERRIDE_FILENAME
    if override_path.exists():
        return override_path.read_text(encoding="utf-8"), True
    return get_agent_default_prompt(root, agent_id), False


def quest_agent_skill_path(quest_root: Path, agent_id: str) -> Path:
    """The task-local, fully editable copy of an Agent's SKILL.md."""
    return Path(quest_root) / ".ds" / _QUEST_SKILLS_DIRNAME / agent_id / "SKILL.md"


def get_quest_agent_skill(repo_root: Path, quest_root: Path, agent_id: str) -> dict[str, Any]:
    """Return the full Skill markdown used by ``agent_id`` for this Quest.

    A task starts from the repository Skill file. Once edited, its local copy
    becomes the complete runtime Skill for that Agent, rather than an appended
    instruction block.
    """
    bundle = _resolve_bundle(Path(repo_root), agent_id)
    override_path = quest_agent_skill_path(quest_root, agent_id)
    source_path = override_path if override_path.exists() else bundle.skill_md
    return {
        "agent_id": agent_id,
        "skill_markdown": source_path.read_text(encoding="utf-8"),
        "is_quest_override": override_path.exists(),
        "updated_at": str(int(override_path.stat().st_mtime)) if override_path.exists() else None,
    }


def set_quest_agent_skill(
    repo_root: Path,
    quest_root: Path,
    agent_id: str,
    skill_markdown: str,
) -> dict[str, Any]:
    """Replace this Quest's complete runtime SKILL.md for one Agent."""
    _resolve_bundle(Path(repo_root), agent_id)
    normalized = str(skill_markdown or "").strip()
    if not normalized:
        raise ValueError("`skill_markdown` must not be empty.")
    path = quest_agent_skill_path(quest_root, agent_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(normalized + "\n", encoding="utf-8")
    return get_quest_agent_skill(repo_root, quest_root, agent_id)


def get_agent_prompt_for_runtime(repo_root: Path, agent_id: str, *, quest_root: Path | None = None) -> str:
    """Resolve a dedicated prompt without making an embedded runner depend on a full source tree."""
    try:
        if quest_root is not None:
            quest_skill = get_quest_agent_skill(repo_root, quest_root, agent_id)
            if quest_skill["is_quest_override"]:
                _metadata, body = load_markdown_document(quest_agent_skill_path(quest_root, agent_id))
                return (body.strip() if isinstance(body, str) and body.strip() else quest_skill["skill_markdown"].strip()) + "\n"
        prompt = get_agent_prompt(repo_root, agent_id)[0]
    except KeyError:
        return ""
    return prompt


def set_agent_prompt(repo_root: Path, agent_id: str, prompt_text: str) -> dict[str, Any]:
    """Persist ``prompt_text`` as the agent's dedicated prompt override.

    The override is written to ``src/skills/<agent_id>/prompt.override.md`` so the
    runtime picks it up in preference to the base SKILL.md.
    """
    root = Path(repo_root)
    bundle = _resolve_bundle(root, agent_id)
    override_path = bundle.root / _OVERRIDE_FILENAME
    override_path.write_text(prompt_text, encoding="utf-8")
    return {
        "agent_id": agent_id,
        "override_path": f"{agent_id}/{_OVERRIDE_FILENAME}",
        "has_override": True,
    }


def reset_agent_prompt(repo_root: Path, agent_id: str) -> dict[str, Any]:
    """Drop the agent's dedicated prompt override, reverting to the default SKILL.md.

    The override file is moved into ``_obsolete/`` (rename) so the change is
    recoverable and we never hard-delete inside the sandbox.
    """
    root = Path(repo_root)
    bundle = _resolve_bundle(root, agent_id)
    override_path = bundle.root / _OVERRIDE_FILENAME
    if not override_path.exists():
        return {"agent_id": agent_id, "has_override": False, "reset": False}
    target = _obsolete_dir(root) / f"{agent_id}.{_OVERRIDE_FILENAME}.bak"
    # Avoid clobbering an existing backup with the same name.
    counter = 1
    while target.exists():
        target = _obsolete_dir(root) / f"{agent_id}.{_OVERRIDE_FILENAME}.bak.{counter}"
        counter += 1
    override_path.replace(target)
    return {"agent_id": agent_id, "has_override": False, "reset": True}


def _resolve_bundle(repo_root: Path, agent_id: str) -> SkillBundle:
    root = Path(repo_root)
    agent_id = str(agent_id or "").strip()
    definition = get_agent_definition(root, agent_id)
    for bundle in discover_skill_bundles(root):
        if bundle.skill_id == definition.skill_id:
            return bundle
    raise KeyError(f"Agent id resolved but bundle missing: {agent_id!r}")
