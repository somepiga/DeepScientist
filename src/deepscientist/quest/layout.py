from __future__ import annotations

from pathlib import Path

from ..contracts import normalize_claim_type
from ..shared import utc_now


RESEARCH_MODES = {"exploration", "validation", "paper_track"}


def explicit_research_mode(startup_contract: dict | None = None) -> str | None:
    if not isinstance(startup_contract, dict):
        return None
    research_mode = str(startup_contract.get("research_mode") or "").strip().lower()
    return research_mode if research_mode in RESEARCH_MODES else None


def normalize_research_mode(startup_contract: dict | None = None, *, default: str = "exploration") -> str:
    research_mode = explicit_research_mode(startup_contract)
    if research_mode is not None:
        return research_mode
    return default if default in RESEARCH_MODES else "exploration"


def normalized_startup_contract(startup_contract: dict | None = None, *, inject_default: bool = False) -> dict | None:
    if not isinstance(startup_contract, dict):
        return {"research_mode": "exploration", "claim_type": "research"} if inject_default else None
    normalized = dict(startup_contract)
    research_mode = explicit_research_mode(normalized)
    if research_mode is not None:
        normalized["research_mode"] = research_mode
    elif inject_default:
        normalized["research_mode"] = "exploration"
    else:
        normalized.pop("research_mode", None)
    claim_type = normalize_claim_type(normalized.get("claim_type"), default="research" if inject_default else None)
    if claim_type is not None:
        normalized["claim_type"] = claim_type
    else:
        normalized.pop("claim_type", None)
    return normalized


def default_baseline_gate(startup_contract: dict | None = None) -> str:
    return "waived" if explicit_research_mode(startup_contract) == "exploration" else "pending"


def default_active_anchor(startup_contract: dict | None = None) -> str:
    startup_contract = normalized_startup_contract(startup_contract)
    research_mode = explicit_research_mode(startup_contract)
    workspace_mode = (
        str((startup_contract or {}).get("workspace_mode") or "").strip().lower()
        if isinstance(startup_contract, dict)
        else ""
    )
    if research_mode == "exploration":
        return "scout"
    if research_mode == "paper_track":
        return "analysis-campaign"
    if research_mode == "validation":
        return "baseline"
    return "scout" if workspace_mode == "copilot" else "baseline"


QUEST_DIRECTORIES = (
    "artifacts/approvals",
    "artifacts/baselines",
    "artifacts/decisions",
    "artifacts/graphs",
    "artifacts/ideas",
    "artifacts/milestones",
    "artifacts/progress",
    "artifacts/reports",
    "artifacts/runs",
    "baselines/imported",
    "baselines/local",
    "experiments/analysis",
    "experiments/main",
    "handoffs",
    "literature",
    "userfiles",
    "tmp",
    "memory/decisions",
    "memory/episodes",
    "memory/ideas",
    "memory/knowledge",
    "memory/papers",
    "paper",
    "release/open_source",
    ".codex/prompts",
    ".codex/skills",
    ".claude/agents",
    ".kimi/skills",
    ".opencode/skills",
    ".ds/bash_exec",
    ".ds/conversations",
    ".ds/codex_history",
    ".ds/runs",
    ".ds/worktrees",
)


def initial_quest_yaml(
    quest_id: str,
    goal: str,
    quest_root: Path,
    runner: str,
    title: str | None = None,
    *,
    requested_baseline_ref: dict | None = None,
    startup_contract: dict | None = None,
) -> dict:
    startup_contract = normalized_startup_contract(startup_contract)
    timestamp = utc_now()
    workspace_mode = (
        str((startup_contract or {}).get("workspace_mode") or "").strip().lower()
        if isinstance(startup_contract, dict)
        else ""
    )
    initial_status_value = "idle" if workspace_mode == "copilot" else "active"
    return {
        "quest_id": quest_id,
        "title": title or goal,
        "quest_root": str(quest_root.resolve()),
        "status": initial_status_value,
        "active_anchor": default_active_anchor(startup_contract),
        "baseline_gate": default_baseline_gate(startup_contract),
        "confirmed_baseline_ref": None,
        "requested_baseline_ref": requested_baseline_ref,
        "startup_contract": startup_contract,
        "default_runner": runner,
        "created_at": timestamp,
        "updated_at": timestamp,
    }


def initial_brief(goal: str, startup_contract: dict | None = None) -> str:
    research_mode = normalize_research_mode(startup_contract)
    claim_type = normalize_claim_type((startup_contract or {}).get("claim_type"), default="research")
    if research_mode == "validation":
        initial_notes = [
            "- Ground the quest against a strong reusable baseline.",
            "- Narrow to the most promising hypotheses and validate them rigorously.",
        ]
    elif research_mode == "paper_track":
        initial_notes = [
            "- Harden validated findings into claim-ready evidence.",
            "- Prioritize analysis, synthesis, and manuscript-facing artifacts.",
        ]
    else:
        initial_notes = [
            "- Start broad: scout multiple candidate directions before converging.",
            "- Prefer novelty discovery, explicit kill criteria, and fast route switching.",
        ]
    if claim_type == "algorithmic_sota":
        initial_notes.extend(
            [
                "- The primary deliverable is a new algorithmic method, not only a diagnosis or benchmark.",
                "- Promote a method only with a closest-prior-work comparison and a falsifiable SOTA validation plan.",
            ]
        )
    return "\n".join(
        [
            f"# Quest Brief",
            "",
            f"## Goal",
            "",
            goal,
            "",
            "## Initial Notes",
            "",
            *initial_notes,
            "",
        ]
    )


def initial_plan(startup_contract: dict | None = None) -> str:
    research_mode = normalize_research_mode(startup_contract)
    claim_type = normalize_claim_type((startup_contract or {}).get("claim_type"), default="research")
    if research_mode == "validation":
        items = [
            "- [ ] Establish or attach a reusable baseline",
            "- [ ] Select the strongest surviving hypothesis",
            "- [ ] Run validation-grade experiments against the baseline",
            "- [ ] Record a decision artifact with explicit evidence and next gate",
        ]
    elif research_mode == "paper_track":
        items = [
            "- [ ] Identify the manuscript-level claim set to harden",
            "- [ ] Fill the highest-priority evidence and robustness gaps",
            "- [ ] Run or complete the analysis campaign for paper-facing artifacts",
            "- [ ] Prepare writing-ready outputs, figures, and decision rationale",
        ]
    else:
        items = [
            "- [ ] Scout multiple candidate directions or mechanisms",
            "- [ ] Record explicit abandonment criteria for weak paths",
            "- [ ] Run fast exploratory probes to maximize information gain",
            "- [ ] Promote only the most promising path into validation",
        ]
    if claim_type == "algorithmic_sota":
        items.extend(
            [
                "- [ ] Select a differentiated method proposal with direct prior-work evidence",
                "- [ ] Validate the promoted method against the accepted SOTA comparison contract",
            ]
        )
    return "\n".join(
        [
            "# Plan",
            "",
            *items,
            "",
        ]
    )


def initial_status(startup_contract: dict | None = None) -> str:
    research_mode = normalize_research_mode(startup_contract)
    workspace_mode = (
        str((startup_contract or {}).get("workspace_mode") or "").strip().lower()
        if isinstance(startup_contract, dict)
        else ""
    )
    if workspace_mode == "copilot":
        return "# Status\n\nReady for your first instruction.\n"
    if research_mode == "validation":
        return "# Status\n\nConfirm the comparison target, then start disciplined validation.\n"
    if research_mode == "paper_track":
        return "# Status\n\nFocus on claim hardening, analysis closure, and manuscript-facing evidence.\n"
    return "# Status\n\nStart broad, test aggressively, and converge only after strong signals emerge.\n"


def initial_summary() -> str:
    return "# Summary\n\nNo completed milestones yet.\n"


def gitignore() -> str:
    return "\n".join(
        [
            ".ds/*.pid",
            ".ds/*.sock",
            ".ds/*.tmp",
            ".ds/worktrees/",
            "tmp/",
            "__pycache__/",
            ".pytest_cache/",
            "",
        ]
    )
