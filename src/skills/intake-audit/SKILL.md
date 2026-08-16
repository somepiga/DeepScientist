---
name: intake-audit
description: 当某个探索任务并非从空白状态开始，且智能体必须先审计、信任排序并调和现有基线、结果、草稿或评审材料，再选择下一个锚点时使用。
skill_role: companion
---

# 接管审计

当该任务已经具有有意义的状态、且首要工作是将该状态规范化，而不是从零重启规范的研究循环时使用本技能。
目标是从杂乱的现有资产中恢复出一个可信的起始状态，而不是永远地重新审计一切。

## 交互纪律

- 遵循系统提示注入的共享交互契约。
- 对于普通的活跃工作，当工作跨越约 6 次工具调用并出现具有用户可感知意义的进展时，优先给出一次简洁的进度更新；且不要在没有用户可见更新的情况下，偏移超过约 12 次工具调用或约 8 分钟。
- 消息模板仅供参考。请适应实际语境并变换措辞，使更新显得自然而非机械。
- 如果收到一条线程化的用户回复，应先结合最新的接管审计进度更新来理解它，再假设任务已完全改变。
- 当审计得出一个持久的路线建议时，发送一次更丰富的 `artifact.interact(kind='milestone', reply_mode='threaded', ...)` 更新，说明哪些状态可信、哪些仍需处理、以及下一步应运行哪个锚点。

## 工具纪律

- **不要在本技能中使用原生的 `shell_command` / `command_execution`。**
- **任何 shell、CLI、Python、bash、node、git、npm、uv 或仓库审计执行都必须经由 `bash_exec(...)`。**
- **要在当前 quest 仓库或 worktree 内部进行 git 检查或维护，优先使用 `artifact.git(...)`，再考虑原始 shell git 命令。**
- **仅当持久 quest 文件、制品与记忆不足时才使用 shell 执行；不要仅仅因为 shell 更快就绕过持久状态。**

## 三层待办契约

- 将 quest 根目录的 `plan.md` 视为顶层研究地图，接管之后必须让下一个活跃节点变得明确
- 如果审计是多步骤的，使用工作区的 `PLAN.md` 作为当前接管节点契约，使用 `CHECKLIST.md` 作为执行前沿
- 当审计确定了路线时，更新 quest 根目录的 `plan.md`，而不是只把建议留在报告制品中

## 目的

`intake-audit` 是一个辅助性入口技能，而非一个普通的长时间运行锚点。

它的目的是在更深入的工作开始之前回答四个问题：

1. 已经存在什么？
2. 什么是可信的？
3. 什么可以直接复用？
4. 下一个应由哪个技能接管？

在实践中，`intake-audit` 通常应留下一个权威的「当前看板」界面。
该看板数据包的存在，是为了让后续的 `decision`、`idea`、`experiment` 与 `write` 轮次不必从多个部分过时的状态来源重建活跃主线。

本技能之所以存在，是因为许多任务**并非**从干净的白板开始。
常见的非空白起点包括：

- 基线已经存在，且可能已被确认
- 主实验已经完成，仅需持久记录或阐释
- 分析成果已存在于各子分支或 worktree 中
- 草稿或论文包已经存在
- 审稿意见已经存在，且该任务实质上是修订/反驳任务
- 用户明确说不要从头重新运行

不要把这些当作边缘情况。
它们是常见的研究进入状态。

## 使用场景

- `startup_contract.launch_mode = custom`，且画像暗示存在已有工作
- quest 根目录已包含有意义的基线、实验、分析或论文资产
- 用户说：
  - “baseline 已经有了”
  - “不要重新复现”
  - “先整理现有结果”
  - “已有论文/草稿，先基于现有状态继续”
- 存在评审材料，但当前论文/结果状态仍不清晰

## 不使用场景

- 该任务确为空白，应从普通的 `scout` 或 `baseline` 开始
- 活跃状态已经良好规范化，且下一个锚点显而易见
- 该任务是纯粹的非研究请求

## 不可妥协的规则

- 不要仅仅因为文件存在就重新运行昂贵的工作。先判断是否存在「信任缺口」真正需要重跑。
- 不要为了令任务看起来更整洁而伪造缺失的持久记录。
- 除非指标契约、来源与可比较性足够清晰，否则不要将一个已有基线标记为可信。
- 除非某个实验确实是某条被接受思路线的主运行，否则不要将其标记为持久的主结果。
- 如果旧草稿、图表或笔记属于不同的思路线或分支线，不要静默地将其导入为当前契约。
- 不要丢失来源。如果复用了某个制品，应记录它来自何处，以及为何足以可信。
- 不要把来源与手稿内容混为一谈。用户请求、智能体决策、分支/worktree 名称、命令日志与重启笔记都只是控制证据，除非被 `write` 改写为中性的科学协议。
- 在将遗留方法、对比项、否定证据、仅限附录以及最新方法等角色区分开之前，不要将旧的论文矩阵或大纲行导入为当前方法的支撑。
- 如果该任务实质上是评审/修订任务，应路由到 `rebuttal`，而不是假装这是一次普通的从头写论文的过程。

## 典型接管状态

将当前任务归类到以下一个或多个桶中：

- `baseline_ready`
- `baseline_partial`
- `main_result_ready`
- `analysis_ready`
- `draft_ready`
- `paper_bundle_ready`
- `review_package_ready`
- `unclear_state`

还要按信任度对每一项重要资产进行分类：

- `trusted`
- `usable_with_verification`
- `reference_only`
- `stale_or_conflicting`
- `missing_context`

还要按手稿可见度对每一项面向论文的资产进行分类：

- `main_text_candidate`
- `appendix_or_reproducibility`
- `comparator_or_negative_evidence`
- `reference_only`
- `internal_only`

## 主要真相来源

按大致如下顺序使用：

- `startup_contract`
  - 尤其当存在时包括 `launch_mode`、`custom_profile`、`entry_state_summary`、`review_summary` 与 `custom_brief`
- quest 连续性文件：
  - `brief.md`
  - `plan.md`
  - `status.md`
  - `SUMMARY.md`
- 近期持久制品状态与 quest 快照
- 当前工作区树与可见的 quest 文件
- 先前的记忆卡片与决策
- 需要时查看 git 历史与当前分支拓扑
- 用户消息

不要以聊天回忆凌驾于持久状态之上。

## 工作流

### 1. 先读取启动意图

在触碰工作区之前，先检查：

- `startup_contract`
- 最新的用户消息
- 近期的 quest 状态

当存在以下字段时，特别加以解读：

- `launch_mode = custom`
  - 不要强行套用标准的完整研究路线
- `custom_profile = continue_existing_state`
  - 预期存在可复用资产与状态规范化
- `custom_profile = revision_rebuttal`
  - 预期存在论文/评审包，且很可能交接给 `rebuttal`
- `custom_profile = freeform`
  - 优先使用自定义简报，而非默认的舞台排序

### 2. 在文件系统梳理之前先检索记忆

舞台启动要求：

- 运行 `memory.list_recent(scope='quest', limit=5)`
- 至少运行一次 `memory.search(...)`，使用：
  - quest 标题或中心主题
  - 任何已知的基线 id 或方法名
  - 任何已知的论文标题或会议简称
  - 任何已知的评审关键词，如 `rebuttal`、`review` 或 `revision`

要点是：在从头重新审计同一状态之前，先复用已有的路线知识。

### 3. 盘点 quest 状态

使用 `references/state-audit-template.md` 创建或刷新一份持久的审计笔记。

盘点应覆盖：

- 基线资产
- 主实验资产
- 分析资产
- 写作资产
- 评审资产
- git / 分支 / worktree 状态
- 缺失或冲突的状态

值得检查的位置包括：

- `artifacts/`
- `baselines/`
- `experiments/main/`
- `experiments/analysis/`
- `paper/`
- `reviews/` 或等价的用户提供的评审文件夹

不要过度通读整棵树。
读到足以分类状态、并定位可能的信任锚点即可。

### 4. 信任排序与调和

对于每一项主要资产，做出判定：

- 是否可以原样信任？
- 是否需要一次轻量验证轮？
- 它是否只是参考资料？
- 它是否陈旧或冲突？

然后将其与持久制品层调和：

- 已有的可复用基线：
  - `artifact.attach_baseline(...)`
  - 当信任有依据时，再调用 `artifact.confirm_baseline(...)`
- 已有的主结果：
  - 仅当该运行确实是被接受的主运行、且所需字段能够如实填写时，才调用 `artifact.record_main_experiment(...)`
- 已有的分析结果：
  - 若战役已存在，对每个真正完成、需要持久注册的切片使用 `artifact.record_analysis_slice(...)`
- 已有的大纲：
  - 当存在真实的持久大纲契约时，使用 `artifact.submit_paper_outline(mode='select'|'revise', ...)`
- 已有的论文包：
  - 当草稿/包状态确实就绪时，使用 `artifact.submit_paper_bundle(...)`

如果证据不足以支撑一次持久的回填，应明确记录这一不足，而不是编造一段被美化的历史。

### 5. 汇编当前看板数据包

在选择下一个锚点之前，将接管结果压缩成一份持久的当前看板数据包。

至少应明确：

- `current_mainline`
- `incumbent`
- `latest_decisive_result`
- `active_blocker`
- `stale_routes_to_ignore`
- `next_decision_scope`
- `budget_class`

重点不是总结一切。
重点是为下一个技能提供一块权威的看板界面，而不是迫使它再次从零合并分支状态、记忆、摘要与制品。

### 6. 选择下一个锚点

调和之后，用 `artifact.record(payload={'kind': 'decision', ...})` 写入一份持久的路线决策。

典型的下一个锚点：

- 基线存在但信任不完整 -> `baseline`
- 基线与路线就绪，但不存在持久的主结果 -> `experiment`
- 主结果存在，但缺少后续证据 -> `analysis-campaign`
- 证据充分且应开始写作 -> `write`
- 评审包处于活跃状态 -> `rebuttal`
- 任务实质上已完成或应暂停 -> `finalize`

### 7. 报告并交接

在接管轮次结束时，发送一次线程化的 `artifact.interact(kind='milestone', ...)` 更新，说明：

- 已存在且可信的内容
- 仍不可信或不完整的内容
- 下一个应由哪个技能接管
- 用户是否需要提供其他内容

## 推荐的持久输出

- `artifacts/intake/state_audit.md`
- `artifacts/intake/current_board_packet.md`
- `artifacts/intake/recommended_next_step.md`
- 一份用于审计后路线的 `decision` 制品
- 在合理时，一份或多份修复/回填制品调用

## 伴随技能路由

仅在审计表明确有必要时，才开启额外技能：

- `baseline`
  - 当某个已有基线必须被验证、修复、确认或豁免时
- `experiment`
  - 当被接受的路线缺少持久记录的主结果时
- `analysis-campaign`
  - 当主结果存在但证据边界仍然薄弱时
- `write`
  - 当一份可信的草稿或大纲应成为活跃的写作线时
- `rebuttal`
  - 当审稿意见、修订请求或元评审材料定义了真实任务时
- `decision`
  - 当存在多个可能的下一个锚点时

## 记忆纪律

舞台结束要求：

- 如果接管轮次产生了持久的路线选择、信任判断或资产复用规则，至少写入一条 `memory.write(...)`

有用的标签包括：

- `stage:intake-audit`
- `type:state-audit`
- `type:route-handoff`
- `type:reuse-rule`
- `state:trusted`
- `state:needs-verification`

当审计涉及某个具体的已有线时，在已知的情况下包含标识：

- `baseline_id`
- `idea_id`
- `run_id`
- `branch`
- `paper_state`

## 成功条件

`intake-audit` 成功，当且仅当：

- 该任务的当前状态可被理解
- 可信的、可复用的资产是明确的
- 不可信的缺口是明确的
- 当前看板数据包足够明确，使后续技能能从一块权威看板界面继续
- 下一个锚点是明确的
- 系统可以在不假装任务从零开始的情况下继续

一次好的接管轮次，应确切地告诉系统：哪些状态可信、哪些不可信、接下来运行什么。
