---
name: paper-outline
description: 在动笔写作之前，创建、修订、验证或修复研究论文大纲时使用；将实验证据转化为清晰的论文构思、限定范围的主张、方法抽象、评估计划、分析计划与证据边界，而不把运行日志照搬进稿件。
skill_role: companion
---

# 论文大纲

当大纲读起来像是运行日志、结果堆砌、工程笔记或组会报告，而非论文计划时，在 `write` 之前使用本技能。

## 一句话总结

保留一份选定的大纲，但拆成两种视图：

- `paper_view`：论文将对读者说的内容。
- `evidence_view`：确切的运行、路径、行、设置与可复现性细节所在之处。

论文应忠实于实际证据，但不应重复 agent 的工作流。

## 基本工作流

1. 阅读当前论文状态。
   使用 `artifact.get_paper_contract(detail='full')`、`artifact.list_paper_outlines(...)`，若大纲已存在则再使用 `artifact.validate_academic_outline(detail='full')`。
2. 找到一句话论文构思。
   问："读过这篇论文后，研究者应记住什么？" 这不是一行指标，也不是一条实现设置。
3. 分离事实与解读。
   事实是实测结果。解读是这些事实所支撑的、审慎的学术结论。无支撑的主张归入"must not claim"。
4. 撰写或修复 `paper_view`。
   填入论文构思、问题/缺口/方法/结果/局限、1-3 条限定范围的主张、方法直觉、评估计划，以及 4-8 项有用的分析任务。
5. 将工程细节排除在故事之外。
   将端口、worktree、批次简写、路由决策、用户请求、artifact id、确切文件路径与本地命令放入 `evidence_view` 或仅附录的可复现性字段。
6. 验证并编译。
   运行 `artifact.validate_academic_outline(detail='full')`。若通过，则运行 `artifact.compile_outline_to_writing_plan(detail='full')`。

## 何为"好"

一份好大纲要做到三件事：

- 它有观点：一个清晰的主张或结论，而非"agent 做了什么"的清单。
- 它诚实：每条主张都绑定到持久证据，且局限被显式说明。
- 它对读者有用：方法与分析所教给人的东西，超出了"这套设置跑出了某个数字"。

优秀的论文常常始于简单的代码，却让一个有用的想法变得清晰可读。残差连接不只是一个代码捷径；论文教的是如何让深度变得可训练。注意力不只是一个模块；论文教的是如何移除一个瓶颈。只有当探索证据支撑此类解读时，才这样做。

## 成熟大纲提醒

一份成熟的论文大纲不只是一份章节列表。对于 `paper_type: full_empirical` 且 `outline_maturity: mature`，当以下项缺失时，应给出提醒：

- 一个面向读者的中心论点与中心洞见，而非仅指标总结
- 一个 `insight_ladder`，展示观测事实如何成为被允许的解读
- 1-3 条限定范围的主张，每条带 `evidence_needed` 与 `what_would_falsify_it`
- 一个最接近邻居 / 新颖性边界，说明相对于先前或显而易见的替代方案，论文主张什么、不主张什么
- 至少三条可能的审稿人异议，每条映射到计划的证据、稿件修订、主张降级或已接受的局限
- 除了头条结果外，至少 4-8 项面向审稿人的分析任务，除非有明确的 analysis-budget 豁免而降低了论文范围

分析数量有两个提醒层级：

- `paper_view.analysis_plan`：对于成熟的实证论文，通常应有 4-8 项计划分析任务。
- 面向论文的证据包：在将稿件视为扎实之前，通常应有 5-10 组就绪的实验/分析。若用户指定了如 4-8 项分析这样的数字，应显式追踪该目标直至完成、豁免或明确降级。

## 要求的形态

在 `artifact.submit_paper_outline(..., detailed_outline={...})` 中使用本结构。

```json
{
  "paper_view": {
    "paper_type": "full_empirical",
    "outline_maturity": "mature",
    "working_title": "Paper-native title",
    "narrative_strategy": {
      "central_thesis": "The one idea the paper wants readers to remember",
      "central_insight": "The reusable lesson suggested by the evidence",
      "reader_takeaway": "What another researcher can learn or reuse"
    },
    "insight_ladder": [
      {
        "level": "Observed fact -> interpretation",
        "statement": "What this fact teaches",
        "evidence": ["main-result-id"],
        "claim_links": ["C1"],
        "risk": "What could make the interpretation too strong"
      }
    ],
    "story_spine": {
      "problem": "What scientific problem exists?",
      "gap": "What prior/easy approach fails to address?",
      "method": "What abstract method is introduced?",
      "main_result": "What measured result supports the claim?",
      "scope_limit": "Where the claim stops"
    },
    "positioning": {
      "closest_neighbor": "The closest existing method, baseline, or obvious alternative",
      "novelty_boundary": "Exactly what is new or reusable here",
      "not_claiming": ["Claims this paper does not make"]
    },
    "core_claims": [
      {
        "claim_id": "C1",
        "claim": "A scoped claim, not a section summary",
        "scope": "Dataset/model/setting boundary",
        "evidence_needed": ["main-result-id", "analysis-id"],
        "what_would_falsify_it": "A result pattern that would weaken the claim"
      }
    ],
    "method_abstraction": {
      "paper_name": "Method name if stable",
      "intuition": "Why the method should work",
      "mechanism_steps": ["Step 1", "Step 2", "Step 3"],
      "appendix_only_details": ["local serving topology", "exact batch/query budget"]
    },
    "evaluation_plan": {
      "setting": "The scientific evaluation setting",
      "datasets_or_benchmarks": [],
      "baselines": [],
      "metrics": [],
      "controlled_factors": []
    },
    "analysis_plan": [
      {
        "analysis_id": "A1",
        "title": "Component ablation",
        "analysis_role": "component ablation",
        "reviewer_question": "Does the claimed mechanism actually cause the gain?",
        "claim_links": ["C1"],
        "target_display": "Main-text ablation table",
        "main_or_appendix": "main_text",
        "failure_interpretation": "How the claim should change if this fails"
      }
    ],
    "reviewer_objections": [
      {
        "objection": "Why a skeptical reviewer might reject or downgrade the paper",
        "answer_route": "analysis | writing | claim_downgrade | limitation",
        "linked_claims": ["C1"],
        "needed_evidence": ["analysis-id"]
      }
    ],
    "evidence_grounding": {
      "observed_facts": ["Facts directly visible in durable results"],
      "allowed_interpretations": ["Careful interpretations allowed by the facts"],
      "must_not_claim": ["Claims the paper must avoid"],
      "evidence_gaps": ["Missing checks or unresolved risks"]
    }
  },
  "evidence_view": {
    "claim_to_items": [],
    "sections": [],
    "unmapped_items": [],
    "appendix_reproducibility": []
  }
}
```

字段名是面向机器的。思考应保持简单：

- `central_thesis`：一句话论文构思。
- `central_insight`：读者学到什么。
- `story_spine`：problem -> gap -> method -> result -> limit。
- `evidence_grounding`：事实、被允许的解读，以及不应主张的内容。
- `analysis_plan`：审稿人会要求的核查。

## 分析计划

一份成熟的实证论文，通常需要在主结果之外有 4-8 项分析任务。选择它们是因为它们支撑故事，而非因为某个固定的检查清单。

有用的分析角色：

- component ablation
- robustness or sensitivity
- stronger-baseline comparison
- subgroup or case breakdown
- failure taxonomy
- mechanism or attribution check
- cost, budget, or efficiency tradeoff
- limitation or residual headroom analysis

若不足 4 项，则将 `outline_maturity: "idea_seed"`，或提供带有真实理由的 `analysis_budget_waiver`。

## 从差到好的示例

差：

- "The abstract reports dual ports and 64+64."

好：

- "All methods are compared under the same evidence budget; the exact serving setup is appendix-only."

差：

- "The latest route selected outline-008 and reran opposite-port probes."

好：

- "The method performs an independent evidence pass and updates a decision only when the new support satisfies preset checks."

差：

- "Section 3 reports all experiments and Section 4 reports more experiments."

好：

- "The main result tests whether the method improves the target task. The analyses then ask why: whether the gain comes from the proposed component, whether it survives stronger baselines, where it fails, and what budget it costs."

差：

- "We did only two follow-up analyses because those were the latest completed runs."

好：

- "The outline plans six follow-ups: ablation, stronger baseline, sensitivity, failure taxonomy, subgroup breakdown, and cost. If only two can be run, the paper is marked early/narrow instead of mature."

## 验证

在交给 `write` 之前，检查：

- `artifact.validate_academic_outline(detail='full')` 通过。
- 论文有一个清晰的观点与 1-3 条限定范围的主张。
- 若大纲为 mature/full_empirical，则 `insight_ladder`、新颖性边界、审稿人异议、主张证伪标准与分析数量提醒均已具备或显式豁免。
- 大纲说明了观测到什么、可以解读什么、以及必须不主张什么。
- 分析计划有 4-8 项有用任务，或已豁免。
- 正文中实验/分析项目 id 已检查是否存在夸大证据数量的陈旧重复项。
- `paper_view` 未提及 quest、worktree、选定大纲、路由历史、用户请求、端口或 `64+64`。
- 确切的工程细节位于 `evidence_view` 或仅附录字段。

需要更多示例时，阅读 `references/outline-patterns.md`。

## 论文→PPTX 演示文稿（原 nature-paper2ppt）

当用户明确要求基于一篇论文/预印本/PDF/笔记制作期刊读书会、组会、开题答辩或学术报告的幻灯片/PPT/PPTX 时，将论文转化为一套中文、插图集成、Nature 风格报道逻辑的 PPTX 演示包。预期最终产物是真实的 `.pptx` 文件加轻量验证，而非仅大纲或讲稿。

- 工具链：PyMuPDF 提取文本/图注/表格标题，Pillow 裁剪插图，python-pptx 编写 PPTX（macOS/Linux/Windows 通用，使用 pathlib 与项目本地输出目录，避免 OS 特定字体/路径）。除非用户要求，否则不安装庞大依赖；LibreOffice/soffice 仅当已可用且值得时才用于预览。
- 两遍阅读：先抓元数据/摘要/标题/图注/表题，再仅读支撑幻灯片的结果与方法页；不编造缺失数字、机制或插图细节。
- 先对论文分类（发现/机制、方法/工具、资源/数据集、临床、材料/工程、综述等）并选择演示逻辑（claim-first / question-to-evidence / problem-to-solution / workflow-to-validation / evidence-map）。
- 默认 12-16 张幻灯片（15-20 分钟报告），结构为：标题→背景→缺口→核心问题/主张→设计/路线→关键证据 1-3→验证/对照→机制/优势→创新点→局限→总结。每张幻灯片只表达一个观点，结果幻灯片以插图为先。
- 仅选取承载论证的 4-8 个插图/表格资源（裁剪到相关面板），用非对称布局让主导视觉占据整页；避免装饰性图库图片与对称 1:1 框架。
- 构建真实 PPTX：16:9、含原始插图、中文标题/要点/图注/讲稿、来源标签，紧凑证据优先构图。无可靠免头渲染器时改用轻量验证（重新打开 PPTX 检查幻灯片数、嵌入媒体数、讲稿）。
