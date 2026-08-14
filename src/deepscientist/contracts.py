from __future__ import annotations

import re
from collections.abc import Iterable
from typing import Any


CLAIM_TYPES = frozenset({"research", "algorithmic_sota"})
EVIDENCE_TYPES = frozenset({"baseline", "proposal", "decision", "execution_trace", "experiment", "claim", "note"})
RUNTIME_CAPABILITIES = frozenset({"start", "stream", "steer", "cancel", "tool_events"})
NOVELTY_AUDIT_VERDICTS = frozenset({"clear", "incremental_but_valuable", "collision"})
_NOVELTY_SIGNATURE_FIELDS = ("target", "mechanism", "intervention", "claim_boundary")
_NOVELTY_COVERAGE_FIELDS = ("direct", "adjacent", "temporal")
_NOVELTY_COMPARISON_FIELDS = ("mechanism_overlap", "claim_overlap", "delta")


def normalize_claim_type(value: object, *, default: str | None = None) -> str | None:
    normalized = str(value or "").strip().lower()
    if normalized in CLAIM_TYPES:
        return normalized
    return default if default in CLAIM_TYPES else None


def is_algorithmic_sota(contract: dict[str, Any] | None) -> bool:
    return normalize_claim_type((contract or {}).get("claim_type")) == "algorithmic_sota"


def normalize_runtime_capabilities(values: Iterable[object] | None) -> tuple[str, ...]:
    normalized = {str(value or "").strip().lower() for value in values or ()}
    return tuple(sorted(normalized & RUNTIME_CAPABILITIES))


def inferred_evidence_type(payload: dict[str, Any]) -> str:
    explicit = str(payload.get("evidence_type") or "").strip().lower()
    if explicit:
        return explicit
    kind = str(payload.get("kind") or "").strip().lower()
    if kind == "baseline":
        return "baseline"
    if kind == "idea":
        return "proposal"
    if kind == "decision":
        return "decision"
    if kind == "run":
        return "execution_trace"
    return "note"


def validate_evidence_payload(payload: dict[str, Any]) -> list[str]:
    evidence_type = inferred_evidence_type(payload)
    if evidence_type not in EVIDENCE_TYPES:
        return [f"Unknown evidence type: {evidence_type}"]

    kind = str(payload.get("kind") or "").strip().lower()
    errors: list[str] = []
    if evidence_type == "experiment":
        if kind != "run" or str(payload.get("run_kind") or "").strip() != "main_experiment":
            errors.append("Experiment evidence requires a `run` artifact with `run_kind: main_experiment`.")
        if not isinstance(payload.get("paths"), dict) or not payload["paths"].get("result_json"):
            errors.append("Experiment evidence requires `paths.result_json`.")
    if evidence_type == "claim":
        evidence_ids = payload.get("evidence_ids")
        if kind not in {"report", "decision"}:
            errors.append("Claim evidence must be recorded as a `report` or `decision` artifact.")
        if not isinstance(evidence_ids, list) or not any(str(item or "").strip() for item in evidence_ids):
            errors.append("Claim evidence requires non-empty `evidence_ids`.")
    return errors


def _normalized_text_list(value: object) -> list[str]:
    if isinstance(value, (list, tuple, set)):
        values = value
    elif value is None:
        values = ()
    else:
        values = (value,)
    return [text for item in values if (text := str(item or "").strip())]


def normalize_novelty_audit(value: object) -> dict[str, Any] | None:
    """Normalize the proposal-level novelty evidence without adding a new contract type."""
    if not isinstance(value, dict):
        return None

    signature_source = value.get("claim_signature")
    signature_source = signature_source if isinstance(signature_source, dict) else {}
    comparisons_source = value.get("prior_work_comparisons")
    comparisons_source = comparisons_source if isinstance(comparisons_source, list) else []
    comparisons: list[dict[str, Any]] = []
    for item in comparisons_source:
        if not isinstance(item, dict):
            continue
        reference = next(
            (
                str(item.get(field) or "").strip()
                for field in ("reference", "url", "arxiv_id", "doi")
                if str(item.get(field) or "").strip()
            ),
            "",
        )
        comparisons.append(
            {
                "reference": reference,
                "title": str(item.get("title") or "").strip(),
                "mechanism_overlap": str(item.get("mechanism_overlap") or "").strip(),
                "claim_overlap": str(item.get("claim_overlap") or "").strip(),
                "delta": str(item.get("delta") or "").strip(),
                "is_strongest_overlap": bool(item.get("is_strongest_overlap", False)),
            }
        )

    coverage_source = value.get("search_coverage")
    coverage_source = coverage_source if isinstance(coverage_source, dict) else {}
    verdict = str(value.get("collision_verdict") or "").strip().lower()
    return {
        "claim_signature": {
            field: str(signature_source.get(field) or "").strip()
            for field in _NOVELTY_SIGNATURE_FIELDS
        },
        "prior_work_comparisons": comparisons,
        "search_coverage": {
            field: _normalized_text_list(coverage_source.get(field))
            for field in _NOVELTY_COVERAGE_FIELDS
        },
        "collision_verdict": verdict,
        "collision_rationale": str(value.get("collision_rationale") or "").strip(),
        "outside_family_alternative": str(value.get("outside_family_alternative") or "").strip(),
        "falsification_plan": str(value.get("falsification_plan") or "").strip(),
        "evidence_paths": _normalized_text_list(value.get("evidence_paths")),
    }


def _is_stable_paper_reference(value: str) -> bool:
    reference = value.strip().lower()
    if reference.startswith(("http://", "https://", "doi:")) or "doi.org/" in reference:
        return True
    if reference.startswith("arxiv:"):
        return True
    return bool(
        re.fullmatch(r"\d{4}\.\d{4,5}(v\d+)?", reference)
        or re.fullmatch(r"10\.\d{4,9}/[-._;()/:a-z0-9]+", reference)
    )


def validate_novelty_audit(value: object, *, require_clear: bool = False) -> list[str]:
    audit = normalize_novelty_audit(value)
    if audit is None:
        return ["Algorithmic SOTA line proposals require a structured `novelty_audit`."]

    errors: list[str] = []
    signature = audit["claim_signature"]
    missing_signature = [field for field in _NOVELTY_SIGNATURE_FIELDS if not signature[field]]
    if missing_signature:
        errors.append(
            "Novelty audit `claim_signature` is missing: " + ", ".join(f"`{field}`" for field in missing_signature) + "."
        )

    comparisons = audit["prior_work_comparisons"]
    if len(comparisons) < 3:
        errors.append("Novelty audit requires at least three direct prior-work comparisons.")
    elif not any(item["is_strongest_overlap"] for item in comparisons):
        errors.append("Novelty audit must mark one comparison as `is_strongest_overlap: true`.")
    for index, comparison in enumerate(comparisons, start=1):
        if not _is_stable_paper_reference(comparison["reference"]):
            errors.append(f"Novelty audit comparison {index} requires a stable paper `reference` (URL, arXiv id, or DOI).")
        missing_comparison = [field for field in _NOVELTY_COMPARISON_FIELDS if not comparison[field]]
        if missing_comparison:
            errors.append(
                f"Novelty audit comparison {index} is missing: "
                + ", ".join(f"`{field}`" for field in missing_comparison)
                + "."
            )

    coverage = audit["search_coverage"]
    missing_coverage = [field for field in _NOVELTY_COVERAGE_FIELDS if not coverage[field]]
    if missing_coverage:
        errors.append(
            "Novelty audit `search_coverage` is missing: " + ", ".join(f"`{field}`" for field in missing_coverage) + "."
        )
    for field in ("collision_rationale", "outside_family_alternative", "falsification_plan"):
        if not audit[field]:
            errors.append(f"Novelty audit requires `{field}`.")

    verdict = audit["collision_verdict"]
    if verdict not in NOVELTY_AUDIT_VERDICTS:
        errors.append("Novelty audit `collision_verdict` must be `clear`, `incremental_but_valuable`, or `collision`.")
    elif require_clear and verdict != "clear":
        errors.append("Algorithmic SOTA line proposals require novelty audit `collision_verdict: clear`.")
    if not audit["evidence_paths"]:
        errors.append("Novelty audit requires durable literature/related-work `evidence_paths`.")
    return errors


def validate_algorithmic_proposal(payload: dict[str, Any], *, require_novelty_audit: bool = False) -> list[str]:
    required = {
        "method_brief": "a method brief",
        "mechanism": "a mechanism",
        "source_lens": "closest prior-work comparison",
        "expected_gain": "an expected gain",
    }
    errors = [
        f"Algorithmic SOTA proposals require {label} (`{field}`)."
        for field, label in required.items()
        if not str(payload.get(field) or "").strip()
    ]
    evidence_paths = payload.get("evidence_paths")
    if not isinstance(evidence_paths, list) or not any(str(path or "").strip() for path in evidence_paths):
        errors.append("Algorithmic SOTA proposals require at least one literature or baseline `evidence_paths` entry.")
    if require_novelty_audit:
        errors.extend(validate_novelty_audit(payload.get("novelty_audit"), require_clear=True))
    return errors
