# 33 Quest Automation API Guide

DeepScientist already uses HTTP routes to create quests. This guide makes the supported automation path explicit for scripts, schedulers, and local orchestration layers.

## What This Guide Covers

This is the supported v1 automation surface for creating a new quest over HTTP:

- `GET /api/quest-id/next`
- `POST /api/quests`

This guide does **not** cover:

- importing an existing local directory as a quest
- bulk-creating many quests in one request
- a second schema separate from the current `Start Research` payload

The supported payload is the same structure that the `Start Research` dialog already submits.

## Authentication

By default, local browser auth is disabled, so local HTTP calls to `/api/*` do not need an auth header.

If you started DeepScientist with `ds --auth true`, or enabled `ui.auth_enabled: true`, include:

```http
Authorization: Bearer <auth_token>
```

You can read the current token from:

- `ds --status`
- the terminal where `ds` was started

See [31 Local Browser Auth](./31_LOCAL_BROWSER_AUTH.md) for the full local auth behavior.

## 1. Get The Next Quest ID

If you want DeepScientist's next sequential numeric id before creating a quest:

```bash
curl http://127.0.0.1:20999/api/quest-id/next
```

Example response:

```json
{
  "quest_id": "015"
}
```

## 2. Use The Same Payload As Start Research

`POST /api/quests` accepts the same contract shape that the frontend uses for `Start Research`.

That means the payload may include:

- `goal` (required)
- `title`
- `quest_id`
- `source`
- `auto_start`
- `initial_message`
- `requested_baseline_ref`
- `requested_connector_bindings`
- `startup_contract`

For field-by-field semantics of `startup_contract`, see [02 Start Research Guide](./02_START_RESEARCH_GUIDE.md).

For automation callers, it is recommended to set:

```json
{
  "source": "external-api"
}
```

This is only a source label. It does not change the quest creation flow.

## 3. Minimal Create Request

The smallest supported request only needs a `goal`:

```bash
curl -X POST http://127.0.0.1:20999/api/quests \
  -H 'Content-Type: application/json' \
  -d '{
    "goal": "Reproduce the baseline faithfully and identify one justified next direction.",
    "source": "external-api"
  }'
```

Example success response:

```json
{
  "ok": true,
  "snapshot": {
    "quest_id": "015",
    "title": "Reproduce the baseline faithfully and identify one justified next direction."
  }
}
```

## 4. Structured Create Request

For a full structured launch, send the same payload shape that `Start Research` would send:

```bash
curl -X POST http://127.0.0.1:20999/api/quests \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Sparse Adapter Robustness",
    "goal": "Investigate whether sparse routing improves robustness without hurting compute efficiency.",
    "quest_id": "012",
    "source": "external-api",
    "auto_start": true,
    "initial_message": "Investigate whether sparse routing improves robustness without hurting compute efficiency.",
    "requested_baseline_ref": {
      "baseline_id": "adapter-baseline",
      "variant_id": "default"
    },
    "requested_connector_bindings": [
      {
        "connector": "qq",
        "conversation_id": "qq:direct:OPENID_123"
      }
    ],
    "startup_contract": {
      "schema_version": 3,
      "user_language": "en",
      "need_research_paper": true,
      "research_intensity": "balanced",
      "decision_policy": "autonomous",
      "launch_mode": "standard",
      "custom_profile": "freeform",
      "scope": "baseline_plus_direction",
      "baseline_mode": "existing",
      "resource_policy": "balanced",
      "time_budget_hours": 24,
      "git_strategy": "semantic_head_plus_controlled_integration",
      "runtime_constraints": "One 24 GB GPU. Keep data local.",
      "objectives": [
        "verify the reusable baseline",
        "test one justified sparse-routing direction"
      ],
      "baseline_urls": [],
      "paper_urls": [
        "https://arxiv.org/abs/2401.00001"
      ],
      "review_materials": [],
      "entry_state_summary": "",
      "review_summary": "",
      "custom_brief": ""
    }
  }'
```

## 5. `auto_start` And `initial_message`

- If `auto_start` is omitted or `false`, DeepScientist only creates the quest.
- If `auto_start` is `true`, DeepScientist immediately enqueues the first user-facing message.
- If `auto_start` is `true` and `initial_message` is empty, DeepScientist uses `goal` as the first message.

This keeps the creation contract and the initial kickoff behavior in one request when automation wants a “create and begin” flow.

## 6. Python `requests` Example

```python
import requests

base_url = "http://127.0.0.1:20999"
headers = {"Content-Type": "application/json"}

payload = {
    "goal": "Reproduce the benchmark baseline and prepare one stronger follow-up idea.",
    "source": "external-api",
    "auto_start": True,
}

response = requests.post(f"{base_url}/api/quests", json=payload, headers=headers, timeout=30)
response.raise_for_status()
data = response.json()
print(data["snapshot"]["quest_id"])
```

If local browser auth is enabled:

```python
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer <auth_token>",
}
```

## 7. Response And Error Model

Success:

- `200 OK`
- body shape: `{ "ok": true, "snapshot": ..., "startup": ...? }`

Validation errors:

- `400 Bad Request`
- examples:
  - missing `goal`
  - non-string `goal`, `title`, `quest_id`, `source`, or `initial_message`
  - non-object `requested_baseline_ref` or `startup_contract`
  - non-array `requested_connector_bindings`

Conflict-style failures:

- `409 Conflict`
- examples:
  - quest id already exists
  - selected connector target is already bound elsewhere and rebinding is not allowed
  - requested baseline could not be materialized during quest creation

## 8. Practical Notes

- `POST /api/quests` is the supported v1 automation entrypoint; there is no parallel `/api/quests/import` route.
- The frontend already uses this same contract. Automation callers are not reverse-engineering a private UI-only payload.
- Quest creation still runs the normal server-side flow:
  - quest scaffold initialization
  - optional baseline attach / confirm
  - optional connector binding
  - `startup_contract` persistence
  - optional immediate kickoff through `auto_start`
