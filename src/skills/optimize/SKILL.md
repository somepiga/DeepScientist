---
name: optimize
description: 当某个以算法为先的探索任务应管理候选简报、优化前沿、分支晋升或融合感知搜索，而非面向论文的默认循环时使用。
skill_role: stage
---

# 优化

在以算法为先的任务中使用本技能，其目标是得到「最强且依据充分」的优化结果，而非论文包装。

目标是一次以充分依据推进前沿一步，而不是生成一大堆低信息量的候选。

## 匹配信号

在以下情况使用 `optimize`：

- 该任务以算法为先
- 基线门槛已被确认或豁免
- 该任务至少有一个合理的优化方向
- 存在多个候选方向，且系统应在晋升之前对它们排序
- 存在一条持久线，且下一步是管理探索、利用、融合、调试或停止

在以下情况**不要**使用 `optimize`：

- 基线门槛尚未解决
- 主要需求是论文草稿、反驳、评审或收尾任务
- 该任务仍处于广泛的文献侦察阶段，没有具体的优化抓手
- 真正的阻塞点仍是思路族选择，而非某个被接受族内部的、范围受限的优化搜索

## 一句话总结

恢复当前前沿，选择一个优化子模式，推进一个有充分依据的一步，然后记录新的前沿或明确的停止条件。

## 控制工作流

1. 恢复当前前沿与近期的持久优化状态。
   在创建或晋升任何内容之前，先读取前沿、近期记忆与当前 quest 状态。
2. 为本次轮次精确选择一个主要的优化子模式。
   保持本轮清晰可读：一次主导的优化动作，而非若干互不相关的路线变更。
3. 保持候选列表或活跃池小而具区分度。
   如果方向仍模糊，则先成形并排序无分支的候选简报；如果已存在持久线，则在该线内部管理一个范围受限的实现池。
4. 仅晋升或执行带有明确证据标准的、范围受限的候选。
   仅将最有力的简报晋升为持久线，并将实现级别的尝试与持久线的创建分开记录。
5. 从证据路由到唯一的、主导的下一步动作。
   以 `explore`、`exploit`、`fusion`、`debug` 或 `stop` 收尾，并将该路线持久记录。

## 应避免 / 陷阱

- 不要把每一次修补或微小尝试都当作一条新的持久思路线。
- 不要为每一个实现级别的候选创建新的 Git 分支或 worktree。
- 不要为每一个实现级别的候选创建新的 Git 分支/worktree。
- 不要晋升每一个看似合理的简报。
- 一旦已经存在一个严肃的小型候选阵容，就不要继续扩大前沿。
- 不要让一次优化轮次混入多个重大的路线变更。
- 在反复出现无改进结果之后，不要继续选择同一个熟悉的机制族。
- 在本舞台活跃期间，不要默认漂移到论文大纲、论文包或收尾工作。
- 不要把一次候选创建或一次冒烟轮次当作舞台完成。

## 约束

- 一致地使用以下三个对象层级：
  - 候选简报
  - 持久优化线
  - 实现级别的候选尝试
- 为当前有意义的轮次保持唯一一个主要的优化子模式活跃。
- 一次只让一个底层的优化动作真正进行中。
- 在决定下一条路线之前，若 `artifact.get_optimization_frontier(...)` 可用，则调用它，并将其作为主要的优化状态摘要。
- 候选简报应使用 `artifact.submit_idea(..., submission_mode='candidate')`。
- 持久线应使用 `artifact.submit_idea(..., submission_mode='line')`。
- 仅当一条候选简报具备足够的预期价值、区分度与执行路径清晰度，以至于值得拥有分支/worktree 状态时，才将其晋升为持久线。
- 一条持久线内部的实现级别候选尝试应使用 `artifact.record(... report_type='optimization_candidate' ...)`。
- 真实测量的线结果应使用 `artifact.record_main_experiment(...)`。
- 本舞台内的所有终端工作都必须经由 `bash_exec(...)`。

## 校验

在 `optimize` 可以结束之前，所有适用的检查都应为真：

- 前沿已被刷新
- 活跃的优化子模式是明确的
- 候选看板与优化清单反映了当前状态
- 晋升的线是合理且范围受限的
- 每一个活跃候选都有状态与下一步动作
- 每一个重大的成功、失败、晋升或路线变更都被持久记录
- 本轮以一个有充分依据的下一步动作或停止条件收尾

## 交互纪律

- 遵循系统提示注入的共享交互契约。
- 对于普通的活跃工作，当工作跨越约 6 次工具调用并出现具有用户可感知意义的进展时，优先给出一次简洁的进度更新；且不要在没有用户可见更新的情况下，偏移超过约 12 次工具调用或约 8 分钟。
- 普通的候选创建、冒烟检查与路线更新应保持简洁。
- 仅当候选被晋升、一次强运行完成、前沿发生实质偏移，或融合/调试路线成为新的主路径时，才使用更丰富的里程碑更新。
- 当用户询问当前优化状态时，应基于前沿与持久制品回答，而不是基于聊天记忆。
- 本舞台内的每一条终端命令都必须经由 `bash_exec`；对于冒烟检查、快速验证、长时运行、Git、Python、包管理器或文件检查命令，不要使用任何其他终端路径。

## 工作界面

在广泛的优化搜索或候选管理变得可观之前，维护以下 quest 可见的控制文件：

- quest 根目录的 `plan.md` 作为整个 quest 的研究地图与循环追踪器
- 工作区的 `PLAN.md` 作为活跃的优化节点契约
- `OPTIMIZE_CHECKLIST.md` 作为优化专属的执行前沿
- 工作区的 `CHECKLIST.md` 作为（存在时）紧随其后的下一步动作的镜像
- `CANDIDATE_BOARD.md` 作为紧凑的候选台账

使用以下模板：

- `references/optimize-checklist-template.md`
- `references/candidate-board-template.md`

`optimize` 是以算法为先的任务的循环搜索控制器，而非 quest 级路线图的替代品。
当一个结果成为新的在位者、进入平台期或停止时，更新 quest 根目录的 `plan.md`，使下一次循环边界明确。

## 核心对象模型

一致地使用以下三个对象层级：

1. 候选简报
   `artifact.submit_idea(mode='create', submission_mode='candidate', ...)`
   在不开启分支的情况下记录一个可能的方向或方法简报。
2. 持久优化线
   `artifact.submit_idea(mode='create', submission_mode='line', ...)`
   开启一个真实的分支或 worktree，并将其设为正式的优化路径。
3. 实现级别的候选尝试
   `artifact.record(payload={'kind': 'report', 'report_type': 'optimization_candidate', ...})`
   记录一次线内尝试，例如一次修补、一次冒烟候选、一次调试候选或一次融合候选。

当前沿路线变更、某条线被晋升、某条线被停止，或选择了下一个优化子模式时，使用 `artifact.record(payload={'kind': 'decision', ...})`。

## 优化子模式

将 `optimize` 视为一个稳定的舞台技能，其内部有六个子模式：

- `brief`：将松散的方向转化为紧凑的候选简报
- `rank`：在一个共享界面上比较简报并选择晋升候选
- `seed`：在一条持久线内部创建一个小型实现级别池
- `loop`：通过范围受限的冒烟/完整评估/记录动作推进一条持久线
- `fusion`：融合来自多条线的互补优势
- `debug`：挽救一个因具体失败模式受阻、但具战略价值的候选

不要将这些视为独立的公开技能。
应将它们当作一个优化工作流内部的执行模式。

默认选择顺序：

1. 当前沿明确说 `fusion` 时，选 `fusion`
2. 当一个具战略价值的候选因具体且很可能可修复的原因失败时，选 `debug`
3. 当多个候选简报已存在、而晋升是主要未决问题时，选 `rank`
4. 当候选简报阵容过薄或过弱时，选 `brief`
5. 当一条持久线存在、但没有活跃的实现候选池时，选 `seed`
6. 当已存在活跃候选池或领先的持久线、且主要需求是范围受限的执行进展时，选 `loop`

## 前沿路线含义

在有意义的路线边界处，精确选择一个主导的路线含义：

- `explore`：以全新的候选方向拓宽搜索
- `exploit`：聚焦当前最强的线
- `fusion`：融合来自多条成功或互补线的洞见
- `debug`：挽救一个因具体失败模式受阻的候选或线
- `stop`：当前前沿已饱和，或剩余路线缺乏依据

默认启发式：

- 当没有哪条线明显主导、或当前各线过于相似时，选 `explore`
- 当一条线在证据与可比较性上明显领先时，选 `exploit`
- 当至少两条线具有有意义的互补优势时，选 `fusion`
- 当某个具战略价值的候选因具体且很可能可修复的原因失败时，选 `debug`
- 当前沿饱和、或剩余路线相对于成本价值较低时，选 `stop`

## 不可妥协的规则

- 通过制品与记忆，将所有重大的优化成功与失败保持持久。
- 不要把排序不确定性转化为过早的分支创建。
- 不要把一次实现级别的候选报告当作一条新的持久优化线。
- 在广泛的新搜索之前，在相关时检查近期的优化记忆以及同线的本地尝试记忆。
- 如果同一条线反复停滞，应切换路线，而不是假装「再来一次同样的」是新证据。
- 平台期是一个路线信号，而不是继续发出微小调整的理由。

## 操作指引

主技能将控制面保持在最前。
关于更长的操作手册、模板与协议细节，请阅读以下参考：

- `references/operational-guidance.md`
- `references/brief-shaping-playbook.md`
- `references/candidate-ranking-template.md`
- `references/frontier-review-template.md`
- `references/method-brief-template.md`
- `references/codegen-route-playbook.md`
- `references/debug-response-template.md`
- `references/fusion-playbook.md`
- `references/optimization-memory-template.md`
- `references/optimize-checklist-template.md`
- `references/plateau-response-playbook.md`
- `references/prompt-patterns.md`

在以下情况使用它们：

- 候选简报仍然模糊
- 需要明确的排序或晋升说明
- 前沿路线不清晰
- 实现路线选择、调试、融合或平台期处理需要完整手册
- 记忆写入、清单维护或提示词塑造实质影响路线

## 集成参考附录

按需使用以下参考章节，无需将它们复制到聊天中：

### optimize-checklist-template.md
### candidate-board-template.md
### method-brief-template.md
### brief-shaping-playbook.md
### candidate-ranking-template.md
### frontier-review-template.md
### optimization-memory-template.md
### fusion-playbook.md
### codegen-route-playbook.md
### debug-response-template.md
### prompt-patterns.md
### plateau-response-playbook.md

代码生成路线的选择应明确：增量式生成用于增量编辑，diff / patch 生成用于受限改动，仅在旧界面确为阻塞点时才使用完整重写。
强制性首次调用序列：刷新 `artifact.get_optimization_frontier(...)`，恢复 quest 状态，然后选择 `brief`、`rank`、`seed`、`loop`、`fusion`、`debug` 或 `stop`。
在重复一个已知失败或重新开启陈旧的前沿假设之前，使用 memory.search(...) 查找同线的本地尝试记忆。

停滞恢复协议：如果某条线停止改进，判断问题出在机制族、变更层多样性、感知验证成本的种子策略、感知验证成本的循环策略，还是执行噪声。
内部子模式选择应 preserve 一个覆盖契约，以及每条路线各自的晋升策略。
InternAgent 最自然地映射到代码生成路线与执行界面优化；MLEvolve 最自然地映射到搜索循环、变异与验证编排。

简报塑造应首先厘清瓶颈、约束与可比较性边界，然后生成一个小而具区分度的阵容，通常为 `2-3` 个严肃方法。
推荐一个带有对替代方案明确权衡的方法，并在提交前自检获胜简报的模糊性、重叠与薄弱依据。
recommend one approach with explicit tradeoffs against the alternatives
候选简报应暴露 `why_now`。

对于 seed 模式，使用感知验证成本的种子策略：如果检查在约 `20` 分钟以内，单独的冒烟阶段是可选的；直接提交进行快速并行验证是可接受的。
仅当并行快速验证预期能产生可区分的结论时，才跳过冒烟。
only skip smoke when the parallel quick validations are expected to produce distinguishable conclusions
根据不确定性使用冒烟测试或直接快速验证；当假设可分离时，你可以跳过单独的冒烟阶段，并并行提交若干快速验证。
对于 loop 模式，使用感知验证成本的循环策略；如果验证循环很慢，不要持续为那些本可在 `brief` 阶段就降低的前沿不确定性付出代价。
依据明确的客观信号来 gate 演化，而非微小的局部偏好。
gate evolution on clear objective signal

族切换触发条件：当重复的同一族编辑停滞时，重新审视机制族。
任务类别入门：优先简单优先的改动、每轮一次原子式改进，以及当失败局部化时仅修复 bug 的轮次。

## 退出标准

仅在以下任一情况持久为真时，才退出 `optimize`：

- 一条更强的线被晋升，且下一个锚点清晰
- 当前线产生了一个真实测量的结果，且下一条路线已记录
- 优化前沿说 stop，且该停止决策已持久记录

不要把一次候选创建或一次冒烟轮次当作舞台完成。
