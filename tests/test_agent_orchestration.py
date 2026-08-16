from __future__ import annotations

from pathlib import Path

from deepscientist import cli
from deepscientist.agent_orchestration import get_agent_definition, list_agent_definitions
from deepscientist.config import ConfigManager
from deepscientist.home import ensure_home_layout, repo_root
from deepscientist.quest import QuestService
from deepscientist.runners import RunResult
from deepscientist.shared import ensure_dir, read_jsonl, write_json, write_yaml
from deepscientist.team import StageAgentTeamService


def test_stage_agent_registry_exposes_backend_context_policies() -> None:
    definitions = {item.agent_id: item for item in list_agent_definitions(repo_root())}

    assert definitions["scout"].role == "stage"
    assert definitions["idea"].context_scope["quest"] == ("papers", "ideas", "decisions", "knowledge")
    assert definitions["experiment"].modes == ("exploration", "validation", "paper_track")
    assert get_agent_definition(repo_root(), "analysis-campaign").skill_id == "analysis-campaign"


def test_stage_agent_team_records_runs_and_handoffs(tmp_path: Path) -> None:
    quest_root = tmp_path / "quest"
    (quest_root / ".ds").mkdir(parents=True)
    write_yaml(
        quest_root / "quest.yaml",
        {"quest_id": "q-agent-team", "active_anchor": "idea", "updated_at": "2026-08-16T00:00:00+00:00"},
    )
    write_json(
        quest_root / ".ds" / "runtime_state.json",
        {
            "active_agent_id": "idea",
            "active_agent_instance_id": "run-idea-1",
            "last_agent_id": "baseline",
            "last_agent_instance_id": "run-baseline-1",
        },
    )
    team = StageAgentTeamService(tmp_path, repo_root=repo_root())
    assignment = team.assignment(skill_id="idea", turn_id="turn-1", run_id="run-idea-1")

    assert assignment["agent_id"] == "idea"
    assert assignment["team_mode"] == "stage_agents"
    assert assignment["agent_context_scope"]["quest"] == ("papers", "ideas", "decisions", "knowledge")

    team.record_started(
        quest_root,
        quest_id="q-agent-team",
        run_id="run-idea-1",
        turn_id="turn-1",
        skill_id="idea",
        agent_id="idea",
        agent_instance_id="run-idea-1",
        runner_name="codex",
        model="inherit",
        attempt_index=1,
    )
    team.record_finished(
        quest_root,
        quest_id="q-agent-team",
        run_id="run-idea-1",
        turn_id="turn-1",
        skill_id="idea",
        agent_id="idea",
        agent_instance_id="run-idea-1",
        ok=True,
        exit_code=0,
    )
    team.handoff(
        quest_root,
        quest_id="q-agent-team",
        run_id="run-idea-1",
        turn_id="turn-1",
        from_agent_id="idea",
        to_agent_id="experiment",
        summary="Selected a falsifiable idea.",
        reason="active_anchor_changed",
        durable_refs={"active_idea_id": "idea-001"},
    )

    snapshot = team.snapshot(quest_root)
    assert snapshot["mode"] == "stage_agents"
    assert snapshot["active_agent_id"] == "idea"
    assert [item["type"] for item in snapshot["recent_runs"]] == ["agent.run_started", "agent.run_finished"]
    assert snapshot["recent_handoffs"][-1]["to_agent_id"] == "experiment"


def test_stage_agent_team_builds_handoff_from_latest_anchor(tmp_path: Path) -> None:
    quest_root = tmp_path / "quest"
    (quest_root / ".ds").mkdir(parents=True)
    write_yaml(
        quest_root / "quest.yaml",
        {"quest_id": "q-agent-handoff", "active_anchor": "experiment"},
    )
    team = StageAgentTeamService(tmp_path, repo_root=repo_root())

    record = team.handoff_after_run(
        quest_root,
        quest_id="q-agent-handoff",
        run_id="run-idea-1",
        turn_id="turn-1",
        from_agent_id="idea",
        output_text="Selected a falsifiable idea with a concrete evaluation plan.",
        snapshot={"active_anchor": "idea", "active_idea_id": "idea-001"},
    )

    assert record is not None
    assert record["from_agent_id"] == "idea"
    assert record["to_agent_id"] == "experiment"
    assert record["durable_refs"]["active_idea_id"] == "idea-001"


def test_cli_run_uses_stage_agent_identity_and_records_history(
    tmp_path: Path,
    monkeypatch,
) -> None:
    home = tmp_path / "home"
    ensure_home_layout(home)
    ConfigManager(home).ensure_files()
    quest = QuestService(home).create("CLI stage agent quest")
    captured = {}

    class FakeRunner:
        def run(self, request):
            captured["request"] = request
            history_root = ensure_dir(request.quest_root / ".ds" / "codex_history" / request.run_id)
            run_root = ensure_dir(request.quest_root / ".ds" / "runs" / request.run_id)
            return RunResult(
                ok=True,
                run_id=request.run_id,
                model=request.model,
                output_text="Decision stage completed.",
                exit_code=0,
                history_root=history_root,
                run_root=run_root,
                stderr_text="",
            )

    fake_runner = FakeRunner()
    monkeypatch.setattr(cli, "register_builtin_runners", lambda **_kwargs: None)
    monkeypatch.setattr(cli, "get_runner_factory", lambda _name: lambda **_kwargs: fake_runner)

    exit_code = cli.run_command(
        home,
        quest["quest_id"],
        "decision",
        "Choose the next route.",
        "inherit",
        None,
    )

    assert exit_code == 0
    request = captured["request"]
    assert request.agent_id == "decision"
    assert request.agent_instance_id == request.run_id
    assert request.team_mode == "stage_agents"
    run_records = read_jsonl(Path(quest["quest_root"]) / ".ds" / "agent_runs.jsonl")
    assert [item["type"] for item in run_records] == ["agent.run_started", "agent.run_finished"]
    history = QuestService(home).history(quest["quest_id"])
    assert history[-1]["agent_id"] == "decision"
