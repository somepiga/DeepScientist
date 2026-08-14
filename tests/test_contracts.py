from __future__ import annotations

from pathlib import Path

import pytest

from deepscientist.artifact import ArtifactService
from deepscientist.config import ConfigManager
from deepscientist.contracts import (
    inferred_evidence_type,
    normalize_claim_type,
    normalize_runtime_capabilities,
    validate_evidence_payload,
)
from deepscientist.home import ensure_home_layout
from deepscientist.memory.frontmatter import dump_markdown_document, load_markdown_document
from deepscientist.quest import QuestService
from deepscientist.shared import read_jsonl, read_yaml, write_text, write_yaml


def _clear_novelty_audit() -> dict:
    return {
        "claim_signature": {
            "target": "rare-class accuracy under a fixed evaluation protocol",
            "mechanism": "couple prototype transport with class-conditional uncertainty",
            "intervention": "replace the baseline's independent rare-class updates",
            "claim_boundary": "improve the rare class without using unavailable labels at inference",
        },
        "prior_work_comparisons": [
            {
                "reference": "https://arxiv.org/abs/2401.00001",
                "mechanism_overlap": "Both use prototype transport.",
                "claim_overlap": "Both target long-tail classification.",
                "delta": "This route couples transport to uncertainty rather than static prototypes.",
                "is_strongest_overlap": True,
            },
            {
                "reference": "arXiv:2402.00002",
                "mechanism_overlap": "Both adapt rare-class updates.",
                "claim_overlap": "Both report rare-class metrics.",
                "delta": "This route changes the update rule instead of reweighting loss.",
            },
            {
                "reference": "10.1000/example.3",
                "mechanism_overlap": "Both model uncertainty.",
                "claim_overlap": "Both seek calibrated predictions.",
                "delta": "This route makes uncertainty control the transport intervention.",
            },
        ],
        "search_coverage": {
            "direct": ["long-tail prototype and uncertainty methods through 2026-08"],
            "adjacent": ["domain adaptation transport methods"],
            "temporal": ["citation chains from foundations through 2026-08"],
        },
        "collision_verdict": "clear",
        "collision_rationale": "The strongest neighbor lacks uncertainty-controlled transport and does not make this claim.",
        "outside_family_alternative": "A calibration-only objective change remains a plausible alternative.",
        "falsification_plan": "Ablate uncertainty control and compare against the strongest transport neighbor on rare-class accuracy.",
        "evidence_paths": ["artifacts/reports/related_work.md"],
    }


def test_contract_normalizers_keep_the_surface_small() -> None:
    assert normalize_claim_type("ALGORITHMIC_SOTA") == "algorithmic_sota"
    assert normalize_claim_type("unknown", default="research") == "research"
    assert normalize_runtime_capabilities(["start", "tool_events", "unknown", "start"]) == (
        "start",
        "tool_events",
    )


def test_runner_trace_is_not_experiment_evidence(temp_home: Path) -> None:
    ensure_home_layout(temp_home)
    ConfigManager(temp_home).ensure_files()
    quest = QuestService(temp_home).create("evidence classification quest")
    quest_root = Path(quest["quest_root"])

    result = ArtifactService(temp_home).record(
        quest_root,
        {
            "kind": "run",
            "run_kind": "scout",
            "summary": "The agent inspected the workspace.",
        },
        checkpoint=False,
    )

    assert result["ok"] is True
    assert result["record"]["evidence_type"] == "execution_trace"
    assert inferred_evidence_type({"kind": "run", "run_kind": "scout"}) == "execution_trace"
    assert validate_evidence_payload({"kind": "run", "evidence_type": "experiment", "run_kind": "scout"})

    experiment = ArtifactService(temp_home).record(
        quest_root,
        {
            "kind": "run",
            "evidence_type": "experiment",
            "run_kind": "main_experiment",
            "summary": "Measured against the accepted baseline.",
            "paths": {"result_json": "experiments/main/result.json"},
        },
        checkpoint=False,
    )
    assert experiment["ok"] is True
    assert experiment["record"]["evidence_type"] == "experiment"
    events = read_jsonl(quest_root / ".ds" / "events.jsonl")
    recorded_events = [event for event in events if event.get("type") == "artifact.recorded"]
    assert recorded_events[-2]["evidence_type"] == "execution_trace"
    assert recorded_events[-1]["evidence_type"] == "experiment"


def test_algorithmic_sota_idea_requires_method_and_prior_work_evidence(temp_home: Path) -> None:
    ensure_home_layout(temp_home)
    ConfigManager(temp_home).ensure_files()
    quest = QuestService(temp_home).create(
        "algorithmic method quest",
        startup_contract={"claim_type": "algorithmic_sota"},
    )
    quest_root = Path(quest["quest_root"])
    quest_yaml = read_yaml(quest_root / "quest.yaml", {})
    assert quest_yaml["startup_contract"]["claim_type"] == "algorithmic_sota"

    # This isolated test exercises proposal validation, not baseline admission.
    quest_yaml["baseline_gate"] = "waived"
    write_yaml(quest_root / "quest.yaml", quest_yaml)

    with pytest.raises(ValueError, match="Algorithmic SOTA proposals require"):
        ArtifactService(temp_home).submit_idea(
            quest_root,
            title="Unspecified route",
            hypothesis="It should work.",
            decision_reason="Try it.",
        )


def test_algorithmic_sota_candidate_can_explore_but_line_requires_clear_novelty_audit(temp_home: Path) -> None:
    ensure_home_layout(temp_home)
    ConfigManager(temp_home).ensure_files()
    quest = QuestService(temp_home).create(
        "algorithmic novelty quest",
        startup_contract={"claim_type": "algorithmic_sota"},
    )
    quest_root = Path(quest["quest_root"])
    quest_yaml = read_yaml(quest_root / "quest.yaml", {})
    quest_yaml["baseline_gate"] = "waived"
    write_yaml(quest_root / "quest.yaml", quest_yaml)
    artifact = ArtifactService(temp_home)

    candidate = artifact.submit_idea(
        quest_root,
        submission_mode="candidate",
        title="Unverified direction",
        hypothesis="A new update rule may help.",
    )
    assert candidate["ok"] is True

    collision_audit = _clear_novelty_audit()
    collision_audit["collision_verdict"] = "collision"
    with pytest.raises(ValueError, match="collision_verdict: clear"):
        artifact.submit_idea(
            quest_root,
            title="Colliding route",
            mechanism="Use uncertainty-controlled prototype transport.",
            method_brief="Couple prototype transport to class-conditional uncertainty.",
            source_lens="related-work audit",
            expected_gain="Improve rare-class accuracy.",
            evidence_paths=["artifacts/reports/related_work.md"],
            novelty_audit=collision_audit,
            next_target="idea",
        )

    accepted = artifact.submit_idea(
        quest_root,
        title="Differentiated route",
        hypothesis="Uncertainty-controlled prototype transport improves rare-class accuracy.",
        mechanism="Use uncertainty to determine prototype transport updates.",
        method_brief="Couple prototype transport to class-conditional uncertainty.",
        selection_scores={"novelty": 8, "feasibility": 7},
        mechanism_family="prototype transport",
        change_layer="optimization",
        source_lens="related-work audit",
        expected_gain="Improve rare-class accuracy without inference-time labels.",
        evidence_paths=["artifacts/reports/related_work.md"],
        risks=["Uncertainty estimates may be noisy on rare classes."],
        novelty_audit=_clear_novelty_audit(),
        next_target="idea",
    )
    metadata, body = load_markdown_document(Path(accepted["idea_md_path"]))
    assert metadata["novelty_audit"]["collision_verdict"] == "clear"
    assert "strongest overlap" in body

    assert artifact._idea_experiment_readiness_issues(
        quest_root,
        idea_md_path=Path(accepted["idea_md_path"]),
        idea_draft_path=Path(accepted["idea_draft_path"]),
        workspace_root=Path(accepted["worktree_root"]),
    ) == []

    metadata["novelty_audit"]["collision_verdict"] = "collision"
    write_text(Path(accepted["idea_md_path"]), dump_markdown_document(metadata, body))
    issues = artifact._idea_experiment_readiness_issues(
        quest_root,
        idea_md_path=Path(accepted["idea_md_path"]),
        idea_draft_path=Path(accepted["idea_draft_path"]),
        workspace_root=Path(accepted["worktree_root"]),
    )
    assert any("novelty audit" in issue and "collision_verdict: clear" in issue for issue in issues)
