---
name: science
description: 用于自然科学或工程任务、科学软件路由、模拟、数据集分析、模型拟合、包检查、通过 shell 的 HPC 工作、验证，以及使用 DeepScientist 的 `artifact.science(...)` 科学证据图谱（Science Evidence Graph）得出以证据为支撑的科学主张。包含 FermiLink skilled-scipkg 包卡片的渐进式披露目录。
skill_role: companion
skill_order: 160
---

# Science（科学）

## 一句话摘要

使用 `bash_exec(...)` 来做真正的科学工作，使用本技能来选择正确的包 / 参考路径，并使用 `artifact.science(...)` 来记录持久化的科学证据图谱（Science Evidence Graph）。

## 匹配信号

当任务包含以下任一信号时使用本技能：

- 自然科学、工程、模拟、科学软件、数值求解器、HPC、SLURM、SSH、模型拟合或数据集分析。
- 包名，例如 PySCF、LAMMPS、OpenMM、GROMACS、MEEP、Scanpy、Astropy、Geant4、OpenFOAM、CP2K、ABINIT，或类似的科学包。
- 验证环境、运行求解器、复现计算结果、分析科学数据、验证单位 / 收敛 / schema，或提出科学主张的请求。
- SetupAgent 需要将一项科学任务组织成 Copilot 移交或自主启动简报。

## 控制面

- 真实执行：始终使用 `bash_exec(...)`。
- 证据记录：在现有 `artifact` MCP 命名空间下的 `artifact.science(...)`。
- 用户可见的里程碑或阻塞项：`artifact.interact(...)`。
- 包知识：本技能的参考与包卡片。
- 不要创建顶层的 `science` MCP 命名空间。
- 不要将 FermiLink runner、HPC 配置文件管理器、CLI 工作流、FastAPI 后端、Chainlit UI 或源实现迁移进 DeepScientist 运行时。

## 渐进式披露

只阅读当前任务所需的参考：

- `references/package-index.min.json`：169 张包卡片的紧凑索引；当某个包 / 领域不清晰时先检索此文件。
- `references/domain-index.md`：按推断的科学领域进行人工可读的分组。
- `references/packages/<package_id>.md`：包特定的路由卡片，含知识 URL、源码 URL、包检查模式、预期科学节点、证据路径与陷阱。
- `references/package-check-playbook.md`：在将某个求解器视为可用之前的包可用性检查。
- `references/artifact-science-tool.md`：确切的 `artifact.science(...)` 契约与示例。
- `references/hpc-via-bash-exec.md`：通过 `bash_exec(...)` 的 SSH、调度器、队列与远程日志纪律。
- `references/claim-type-discipline.md`：computed / parsed / digitized / hypothesis 主张纪律。
- `references/science-task-brief-template.md`：SetupAgent 与启动简报形态；用作上下文，而非必需的 `goal.md` 文件。

## 工作流

1. 对任务分类：包检查、计算运行、数据集分析、参数扫描、验证、主张，或启动简报。
2. 若涉及某个包 / 领域，检索 `references/package-index.min.json`，并仅打开相关的 `references/packages/<package_id>.md` 卡片。
3. 将包卡片仅视为知识指针。它们并不能证明该求解器、Python 模块、可执行文件、许可证服务器、数据集、GPU 后端或 HPC 模块存在。
4. 在计算工作之前，在相关时使用 `bash_exec(...)` 进行导入、可执行文件、版本、环境模块与小型冒烟测试检查。
5. 使用 `artifact.science(..., node_type="science.package_check", ...)` 记录包检查。
6. 通过 `bash_exec(...)` 运行求解器命令、脚本、SSH、sbatch/squeue、日志读取与数据分析。
7. 将科学执行记录为 `science.computational_run`、`science.dataset_analysis` 或 `science.parameter_sweep`，并带具体的输入、日志、输出与证据路径。
8. 验证收敛、单位、schema、控制、容差、随机种子，或物理 / 统计不变量，然后记录 `science.validation_result`。
9. 仅在证据路径或相关科学节点支撑它之后，才记录 `science.claim`。
10. 将需要用户看到的决策或里程碑用于 `artifact.interact(...)`，但绝不要将其作为唯一的科学证据。

科学节点 id 是稳定的逻辑 id，而不是可变的文件槽位。为新节点 id 调用一次 `record_node`。如果状态、证据或解读后续发生变化，调用 `update_node`，以使图谱保持只追加（append-only）。如果某个包检查失败或被阻塞，且该事实影响路由，将其记录为带 `status="failed"` 或 `status="blocked"` 的 `science.package_check`，并指向日志或诊断文件。

## 科学节点类型

除非运行时契约发生变化，否则只使用以下 v1 节点类型：

- `science.package_check`
- `science.computational_run`
- `science.dataset_analysis`
- `science.parameter_sweep`
- `science.validation_result`
- `science.claim`

当工作属于求解器执行、数值计算、模型拟合或工程计算时，优先使用 `science.computational_run`，而非更窄的、仅模拟（simulation-only）术语。

## 主张纪律

每一条 `science.claim` 都需要 `claim_type`：

- `computed`：由当前任务中的真实执行产生。
- `parsed`：从提供的或既有的数据中读取。
- `digitized`：从论文图、图像或 PDF 图中提取。
- `hypothesis`：合理但尚未被计算或数据验证。

computed 主张必须链接到证据路径或相关的 computed / validation 节点。如果该证据尚不存在，应改为记录一条 `hypothesis`、阻塞项或验证需求。

## SetupAgent 用法

对于自然科学或工程的启动会话，SetupAgent 应判断该任务是否真的适合自主工作：

- 普通的、有界定的任务，例如一次包检查、一次本地计算、一次数据集检查，或一次结果解释，通常应路由到 Copilot 模式。
- 长时间的模拟活动、HPC 活动、论文复现，或想法驱动的科学研究的，只有在计算、数据、隐私、网络与成功标准都足够清晰时，才能路由到自主模式。
- 当路由到 Copilot 时，用组织好的科学简报填充 `session_patch.copilot_handoff.startup_message`，并设置 `create_and_send=true`，以便协作工作区直接启动。
- 当路由到自主模式时，填充 `session_patch.science_task` 与 `session_patch.science_task_brief`；使用来自 `references/science-task-brief-template.md` 的简报形态，而不要求一个 `goal.md` 文件。
- 包含预期的包、包检查需求、预期的科学节点类型、HPC 预期，以及求解器安装是否未知。

## 包目录出处

该包目录由 FermiLink 的 skilled-scipkg 频道生成，并存储为 DeepScientist 原生的路由材料。这些卡片保留了包 id、描述、标签、知识 URL、源码归档 URL 与上游项目 URL。它们不内嵌（vendor）包源码树，也不安装运行时。

如果在任务期间必须下载更深入的包知识，应在任务证据中保留源 URL 与许可证上下文。不要在没有归因的情况下，将大段知识库文本粘贴进报告。

## 避免 / 陷阱

- 不要将本技能当作求解器安装器或包管理器。
- 不要将来自绘图重绘、论文图读取或猜测的结果称为 `computed`。
- 不要仅仅为了让某次运行通过，就削弱容差、过滤器、物理模型、收敛准则或验证检查。
- 不要在没有日志路径与状态读取计划的情况下提交远程 / HPC 作业。
- 不要仅在聊天中创建科学证据。
- 不要让包卡片的元数据覆盖任务特定的证据。
- 不要将 FermiLink 用作运行时依赖；应将 DeepScientist 原生的包卡片用作路由参考，并将真实执行保留在 `bash_exec(...)` 中。

## 验证

一项科学任务在以下情况成立时即可报告：

- 包可用性已检查，或被显式阻塞。
- 每次运行或分析在适用时都具有具体的输入 / 日志 / 输出 / 证据路径。
- 当正确性重要时，验证状态与原始执行状态分开记录。
- 主张被归类为 computed、parsed、digitized 或 hypothesis。
- 证据节点已链接，以便 Canvas 能够重建科学证据图谱（Science Evidence Graph）。
