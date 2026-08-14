# Innovation-First Workflow Refactor Implementation Plan

> For Hermes: use this plan to implement the DeepScientist global workflow refactor from conservative baseline-first behavior to an innovation-first, fast-fail research workflow with explicit exploration, validation, and paper-track modes.

Goal: Refactor DeepScientist so that new and ongoing quests default to broader innovation search in the early phase, only converge later, and treat validation/paper hardening as later modes rather than the universal initial behavior.

Architecture: Introduce a first-class research mode layer carried by startup_contract and runtime research state. Map that layer into default active anchor selection, prompt policy generation, stage-view exposure, and stage skill guidance. Preserve existing baseline/idea/experiment/analysis/paper execution machinery, but change the default routing and policy text so the system explores multiple directions before narrowing.

Tech Stack: Python, Markdown prompt templates, SKILL.md stage skills, DeepScientist quest/runtime state.

---

## Findings locked during t1

1. Default quest creation is baseline-first.
   - `src/deepscientist/quest/layout.py`
   - `default_active_anchor()` returns `baseline` unless `workspace_mode == "copilot"`, which returns `scout`.
   - `initial_quest_yaml()` sets `baseline_gate: pending` and `active_anchor` from that function.
   - `initial_status()` says `Quest created. Waiting for baseline setup or reuse.`

2. Stage routing is heuristic and stage-key driven.
   - `src/deepscientist/quest/stage_views.py`
   - `_infer_stage_from_branch_name()` maps prefixes: `analysis/ -> analysis`, `run/ -> experiment`, `idea/ -> idea`, `paper/|write/ -> paper`, `baseline/ -> baseline`.
   - `_resolve_effective_stage_key()` falls back in order: explicit stage -> inferred branch -> analysis artifacts -> experiment artifacts -> idea artifacts -> paper state -> baseline artifacts.

3. Prompt policies are centrally injected in builder.
   - `src/deepscientist/prompts/builder.py`
   - Key functions already located:
     - `current_standard_skills`
     - `_workspace_mode`
     - `_decision_policy`
     - `_baseline_execution_policy`
     - `_review_followup_policy`
     - `_research_delivery_policy_block`
   - Current stage skill surface is:
     - standard: `scout`, `baseline`, `idea`, `optimize`, `experiment`, `analysis-campaign`, `write`, `finalize`, `decision`
     - companion: `paper-plot`, `figure-polish`, `intake-audit`, `review`, `rebuttal`

4. Startup contract already propagates through quest lifecycle.
   - `src/deepscientist/quest/service.py`
   - `read_quest_yaml()` normalizes `startup_contract`, default `baseline_gate`, and fills `active_anchor` from `default_active_anchor(startup_contract)`.
   - `create()` accepts `startup_contract` and writes initial scaffold files from it.
   - `_default_research_state()` already persists `workspace_mode`, so adding a first-class research mode is low-friction.

## Design target

Add a first-class `research_mode` with these values:
- `exploration`
- `validation`
- `paper_track`

This mode should be accepted in `startup_contract`, persisted into quest runtime state, and used to alter:
- default active anchor
- initial quest brief / plan / status scaffolding
- prompt policy blocks
- stage-view resolution and exposure
- stage skill instructions
- artifact guidance language

## High-level behavioral contract

### Exploration mode
Purpose: maximize innovation search density and kill weak directions quickly.

Rules:
- Do not force baseline establishment as the first required action.
- Prefer `scout` or `idea` style branching before committing to a single route.
- Generate multiple candidate mechanisms / experiment directions in parallel or rapid sequence.
- Permit lightweight sanity checks, but prevent them from becoming the main research narrative.
- Prefer information gain and novelty discovery over polish and workflow completion.
- Encourage explicit abandonment criteria and route switching.

### Validation mode
Purpose: convert promising directions into disciplined evidence.

Rules:
- Require comparison against stronger baselines and clearer experiment design.
- Narrow the active branch set to the most promising hypotheses.
- Emphasize reproducibility, metrics discipline, and robustness checks.
- Treat baseline grounding as necessary here, not universally at quest start.

### Paper-track mode
Purpose: turn validated findings into publishable claims.

Rules:
- Require claim-evidence alignment, artifact completeness, and figure/table readiness.
- Prefer analysis synthesis and paper-state progression.
- Block further random exploration unless it clearly de-risks a manuscript claim.

## Implementation tasks

### Task 1: Extend startup contract and runtime state to carry research_mode

Objective: make `research_mode` a first-class control field available across quest creation and runtime.

Files:
- Modify: `src/deepscientist/quest/service.py`
- Modify: `src/deepscientist/quest/layout.py`
- Modify: `docs/zh/02_START_RESEARCH_GUIDE.md`
- Modify: `docs/zh/33_QUEST_AUTOMATION_API_GUIDE.md`

Steps:
1. Add normalization for `startup_contract.research_mode` in quest service.
2. Default missing mode to `exploration` for normal quests.
3. Persist normalized `research_mode` into `.ds/research_state.json` default payload.
4. Document the new contract field in Chinese docs.

Verification:
- Create a quest with no `research_mode`; expect normalized mode `exploration`.
- Create a quest with `research_mode: validation`; expect quest yaml and research state to reflect it.

### Task 2: Change default quest scaffold from baseline-first to mode-aware startup

Objective: ensure new quests do not always begin with a baseline-first plan/status.

Files:
- Modify: `src/deepscientist/quest/layout.py`

Steps:
1. Replace `default_active_anchor()` logic with mode-aware routing.
   - `exploration` -> `scout` by default
   - `validation` -> `baseline` or `experiment` depending on confirmed/requested baseline presence
   - `paper_track` -> `analysis` or `paper` if paper state exists; otherwise `experiment`
2. Make `initial_brief()` mode-aware.
3. Make `initial_plan()` mode-aware.
4. Make `initial_status()` mode-aware.
5. Revisit default `baseline_gate` so it is not universally blocking in exploration mode.

Verification:
- New exploration quest should not say “Waiting for baseline setup or reuse.”
- New exploration quest should start from exploration/scout semantics.

### Task 3: Make prompt policy generation mode-aware

Objective: rewrite builder policy output so exploration is explicitly innovation-first and fast-fail.

Files:
- Modify: `src/deepscientist/prompts/builder.py`
- Modify: `src/prompts/system.md`
- Modify: `src/prompts/contracts/shared_interaction.md`

Steps:
1. Add helper(s) to read effective research mode from snapshot/startup contract.
2. Update `_workspace_mode` and `_decision_policy` adjacent logic to include mode-sensitive wording.
3. Rewrite `_baseline_execution_policy()` so baseline-first is only required in validation/paper-track contexts.
4. Rewrite `_research_delivery_policy_block()` to emit different rules per mode:
   - exploration: breadth, novelty search, fast fail, route switching, anti-premature-convergence
   - validation: stronger controls, benchmark rigor, hypothesis pruning
   - paper_track: claim hardening, synthesis, manuscript-targeted execution
5. Add explicit guardrails against making ultra-low-signal pilots the main narrative unless tagged as sanity/debug.

Verification:
- Prompt for exploration quest should explicitly encourage multiple hypotheses and abandonment criteria.
- Prompt for validation quest should explicitly demand disciplined baselines and stronger evidence.

### Task 4: Re-map stage routing and stage exposure to support the new modes

Objective: keep existing stages, but change which stage is treated as effective and what context is emphasized.

Files:
- Modify: `src/deepscientist/quest/stage_views.py`

Steps:
1. Add helpers to resolve effective `research_mode` from snapshot/research state.
2. Update `_resolve_effective_stage_key()` to prefer exploration-friendly stages before baseline when mode is `exploration`.
3. Preserve artifact-based inference, but reorder fallbacks by mode.
4. Add overview/detail fields that expose mode-specific context such as:
   - exploration portfolio / active alternatives / abandonment criteria
   - validation target claim / benchmark matrix / robustness gaps
   - paper-track claim map / manuscript targets / figure readiness
5. Ensure branch-prefix heuristics remain backward-compatible.

Verification:
- Exploration quest with idea artifacts but no baseline should resolve to idea/scout path rather than baseline fallback.
- Validation quest should still surface baseline and experiment context aggressively.

### Task 5: Update stage skills to encode new behavioral defaults

Objective: align skill guidance with the new system-level research philosophy.

Files:
- Modify: `src/skills/scout/SKILL.md`
- Modify: `src/skills/baseline/SKILL.md`
- Modify: `src/skills/idea/SKILL.md`
- Modify: `src/skills/experiment/SKILL.md`
- Modify: `src/skills/analysis-campaign/SKILL.md`
- Modify: `src/skills/write/SKILL.md`
- Modify: `src/skills/decision/SKILL.md`

Steps:
1. Scout skill: make it the default exploration-stage entrypoint for innovation search.
2. Idea skill: require multiple candidate directions and explicit kill criteria during exploration.
3. Baseline skill: reposition as grounding for validation, not mandatory first move in all quests.
4. Experiment skill: distinguish fast exploratory probes from validation-grade experiments.
5. Analysis/write/decision skills: add stronger paper-track expectations.

Verification:
- Skill text should no longer imply universal baseline-first sequencing.
- Exploration skills should clearly prioritize novelty search and rapid pruning of weak ideas.

### Task 6: Update artifact guidance so durable records match the new workflow

Objective: ensure artifacts preserve exploration breadth and paper-track convergence signals.

Files:
- Modify: `src/deepscientist/artifact/guidance.py`

Steps:
1. Add guidance for recording exploration alternatives and rejection reasons.
2. Add guidance for tagging sanity/debug runs versus claim-bearing experiments.
3. Add guidance for manuscript-targeted analysis slices and claim support status.

Verification:
- Exploration artifacts should capture why paths were dropped.
- Later-stage artifacts should explicitly map to claims, robustness, or figures.

### Task 7: Add tests or executable verification checks for the refactor

Objective: verify routing and prompt behavior changed as intended.

Files:
- Create or modify relevant test files under `tests/` if present
- If no test scaffold exists, add a lightweight focused test module near existing project conventions

Checks:
1. layout default anchor by research_mode
2. quest service normalization of startup contract research_mode
3. stage view resolution order by mode
4. prompt builder policy block contents by mode

## Initial patch order

1. `quest/layout.py`
2. `quest/service.py`
3. `prompts/builder.py`
4. `quest/stage_views.py`
5. `artifact/guidance.py`
6. prompt templates
7. stage skills
8. docs
9. tests

## Non-goals

- Do not remove existing baseline/idea/experiment/analysis/paper machinery.
- Do not require a new database or service.
- Do not restart the DeepScientist daemon during implementation unless explicitly requested.

## Acceptance criteria

- A fresh quest can start in exploration mode without baseline-first blocking language.
- Prompt policy text explicitly differentiates exploration, validation, and paper-track behavior.
- Stage routing no longer collapses unknown/general state back to baseline by default in exploration contexts.
- Stage skill guidance no longer biases all quests toward conservative incremental progression.
- Existing quests without `research_mode` remain functional via backward-compatible normalization.
