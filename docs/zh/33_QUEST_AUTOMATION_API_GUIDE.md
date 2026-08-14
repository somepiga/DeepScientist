# 33 Quest 自动化创建 API 指南

DeepScientist 其实早就通过 HTTP 路由创建 quest 了。这篇文档把当前正式支持的自动化入口明确下来，方便脚本、定时任务和本地编排层直接依赖。

## 这篇文档覆盖什么

这是当前 v1 正式支持的 quest 自动化创建入口：

- `GET /api/quest-id/next`
- `POST /api/quests`

这篇文档 **不** 覆盖：

- 把一个已存在的本地目录接管成 quest
- 一次请求批量创建多个 quest
- 在现有 `Start Research` payload 之外再设计第二套 schema

当前支持的 payload，就是 `Start Research` 弹窗已经在提交的那套结构。

## 认证

默认情况下，本地浏览器认证是关闭的，所以本机对 `/api/*` 的 HTTP 调用不需要额外鉴权头。

如果你是用 `ds --auth true` 启动的，或者配置了 `ui.auth_enabled: true`，就需要带：

```http
Authorization: Bearer <auth_token>
```

当前 token 可以从下面两处获得：

- `ds --status`
- 启动 `ds` 的那个终端

完整说明见 [31 本地浏览器密码说明](./31_LOCAL_BROWSER_AUTH.md)。

## 1. 获取下一个 quest_id

如果你想先拿到 DeepScientist 的下一个顺序数字 id：

```bash
curl http://127.0.0.1:20999/api/quest-id/next
```

返回示例：

```json
{
  "quest_id": "015"
}
```

## 2. 直接复用 Start Research 的 payload

`POST /api/quests` 接收的，就是当前前端 `Start Research` 使用的同一套 contract。

也就是说，请求体可以包含：

- `goal`（必填）
- `title`
- `quest_id`
- `source`
- `auto_start`
- `initial_message`
- `requested_baseline_ref`
- `requested_connector_bindings`
- `startup_contract`

如果你需要逐字段理解 `startup_contract` 的语义，请直接看 [02 Start Research 参考](./02_START_RESEARCH_GUIDE.md)。

对于自动化调用方，建议显式传：

```json
{
  "source": "external-api"
}
```

这只是来源标记，不会改变 quest 的创建逻辑。

## 3. 最小创建请求

最小可用请求只需要一个 `goal`：

```bash
curl -X POST http://127.0.0.1:20999/api/quests \
  -H 'Content-Type: application/json' \
  -d '{
    "goal": "Faithfully reproduce the baseline and identify one justified next direction.",
    "source": "external-api"
  }'
```

成功返回示例：

```json
{
  "ok": true,
  "snapshot": {
    "quest_id": "015",
    "title": "Faithfully reproduce the baseline and identify one justified next direction."
  }
}
```

## 4. 结构化创建请求

如果你要做完整启动，可以直接发送和 `Start Research` 一样的结构化 payload：

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

## 5. `auto_start` 与 `initial_message`

- 如果 `auto_start` 省略或为 `false`，DeepScientist 只创建 quest。
- 如果 `auto_start` 为 `true`，DeepScientist 会立刻投递第一条用户消息。
- 如果 `auto_start` 为 `true` 且 `initial_message` 为空，DeepScientist 会用 `goal` 作为第一条消息。

这样自动化层就可以在一个请求里完成“创建并开始”。

## 6. Python `requests` 示例

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

如果启用了本地浏览器认证：

```python
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer <auth_token>",
}
```

## 7. 返回与错误模型

成功：

- `200 OK`
- body 形态：`{ "ok": true, "snapshot": ..., "startup": ...? }`

参数错误：

- `400 Bad Request`
- 常见原因：
  - 缺少 `goal`
  - `goal`、`title`、`quest_id`、`source` 或 `initial_message` 不是字符串
  - `requested_baseline_ref` 或 `startup_contract` 不是对象
  - `requested_connector_bindings` 不是数组

冲突类失败：

- `409 Conflict`
- 常见原因：
  - `quest_id` 已存在
  - 指定的 connector target 已绑定到别的 quest，且当前不允许重绑
  - 请求的 baseline 在 quest 创建时无法成功物化

## 8. 实用说明

- `POST /api/quests` 是当前正式支持的 v1 自动化入口；没有平行的 `/api/quests/import`。
- 前端本身就是在用这条路，所以自动化调用方依赖的不是私有 UI payload。
- quest 创建时仍会走标准服务端流程：
  - 初始化 quest scaffold
  - 可选 baseline attach / confirm
  - 可选 connector 绑定
  - 持久化 `startup_contract`
  - 如果设置了 `auto_start`，则立即触发 kickoff
