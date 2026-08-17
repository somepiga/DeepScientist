---
name: nature-data
description: >-
  为稿件撰写、审查或修订符合 Nature 标准的"数据可用性声明"、数据存储库方案、数据集引用，以及
  FAIR 元数据核查清单。当用户询问 Nature 数据可用性、科研数据共享、存储库选择、 accession 编号、
  受限或敏感数据、源数据、补充数据集、DataCite 风格的数据集引用、面向学术发表的 FAIR 元数据，
  或中文作者准备 Nature 系列投稿所需的中译英数据可用性表述时使用。
skill_role: companion
---

# Nature 数据可用性技能

本辅助技能改编自 `Yuan1z0825/nature-skills/tree/main/nature-data`。
上游 MIT 许可见 `UPSTREAM_LICENSE.txt`。

## DeepScientist 集成

- 遵循系统提示注入的共享交互契约。
- 当当前议题为数据可用性、源数据、存储库选择、数据集引用、受限数据或 FAIR 元数据时，在 `write`、`review`、`rebuttal` 或 `finalize` 中将其作为专注的写作辅助使用。
- 保持 DeepScientist 证据契约的权威性：只能依据已核实的数据清单、存储库记录、artifact 路径或明确标注的未决字段来起草可用性文本。
- 不得编造 DOI、accession 编号、存储库、伦理审批、访问委员会、许可、禁运期或数据使用条件。

使用本技能，将稿件的支撑数据转化为一套透明、符合 Nature 标准的数据可用性材料包：声明文本、存储库方案、数据集引用，以及缺失信息标记。

治理政策层为 Springer Nature / Nature Portfolio 数据政策。实现层为 FAIR 数据实践与 DataCite 风格引用元数据。

## 中文用户操作模式

当用户使用中文书写、提供中文稿件笔记，或要求"中文对应"、"中英对照"、"数据可用性声明"、"数据获取声明"、"原始数据"、"数据存储库"或"受限数据"时：

- 自然接受中文输入，但除非用户明确要求仅用中文，否则最终投稿就绪的声明仍用英文起草。
- 在有助于作者采取行动时，保留一段简短的中文说明，解释尚未确定的决策。
- 翻译意图而非字句。诸如"可向通讯作者索取"这类中文表述，除非说明限制与获取流程，否则对 Nature 风格的英文通常过于含糊。
- 将中文存储库/状态描述转换为精确的发表术语：
  `数据可用性声明` -> `Data Availability`；`原始数据` -> `raw data`；
  `处理后数据` -> `processed data`；`源数据` -> `source data`；
  `补充材料` -> `Supplementary Information`；`受限数据` -> `restricted data`；
  `合理请求` -> `reasonable request`，且仅在给出理由与审查途径时使用。
- 使用 `references/chinese-author-alignment.md` 获取中文术语、常见中英转换失败模式，以及双语采集问题。

## 默认立场

- 将"数据可用性声明"视为连接论文主张与支撑其审查、复现或复用的证据之间的纽带。
- 不得编造 DOI、accession 编号、存储库名称、许可、禁运日期、伦理审批、访问委员会或数据使用条件。
- 优先选用公开、学科专用的存储库。仅当不存在合适的社区存储库时，才使用通用或机构存储库。
- 既描述新生成的数据，也描述复用的第三方数据。
- 若数据无法公开共享，须说明原因、由谁控制访问、如何评估请求，以及哪些元数据或代表性数据仍可公开。
- 除非期刊要求合并的可用性章节，否则将数据、代码、材料与协议分开说明。
- 本技能专注于可用性与元数据。除非用户另行要求，否则不要重写方法、分析统计或润色稿件。
- 除非存在特定的法律、伦理、商业或第三方限制，否则将"available upon request"标记为薄弱表述。

## 工作流程

1. 确认目标期刊与文章类型。若期刊特定要求与本技能冲突，遵循期刊要求。
2. 清点支撑主要结果与补充结果所需的每个数据集：生成的原始数据、处理数据、图源数据、次级数据、软件输出、模型、表格、图像，以及统计分析背后的文件。
3. 将每个数据集归入以下一种访问路径：
   `public repository`、`controlled access repository`、`within paper or supplement`、
   `reused public source`、`third-party restricted`、`available on justified request`、
   或 `not applicable`。
4. 在起草文本前，确定存储库与标识符策略。优先选用 DOI、accession 编号、Handle、ARK 或稳定的存储库记录，而非个人网站与临时云链接。
5. 使用明确的"数据集—位置"映射起草数据可用性声明。
6. 为支撑结论的公开数据添加正式的数据集引用。
7. 在定稿前运行 FAIR 与元数据审查。
8. 返回可直接粘贴的声明文本，以及作者必须确认的未决字段。

## 输出格式

除非用户要求其他格式，否则返回：

```text
Data Availability
[可直接粘贴的声明]

Repository and citation actions
- [具体行动或 "None"]

Missing information / risk flags
- [具体标记或 "None"]

中文核对
- [用中文列出作者需要确认的字段或 "无"]
```

审查已有声明时，先列出阻塞性 issue，再提供修订版本。

## 相关文件

| 文件 | 何时打开 |
|---|---|
| [references/policy-principles.md](references/policy-principles.md) | 需要 Nature/Springer Nature 治理性的数据共享规则或边界情形政策逻辑时 |
| [references/chinese-author-alignment.md](references/chinese-author-alignment.md) | 用户使用中文书写、需要双语表述，或提供了中文可用性笔记时 |
| [references/statement-patterns.md](references/statement-patterns.md) | 需要可直接套用的数据可用性声明范式时 |
| [references/repository-and-identifiers.md](references/repository-and-identifiers.md) | 需要存储库选择、accession、DOI、禁运、版本管理或数据集引用指导时 |
| [references/fair-metadata-checklist.md](references/fair-metadata-checklist.md) | 需要 FAIR 核查、README 元数据、文件组织、许可、来源溯源或 DataCite 字段时 |
| [references/source-basis.md](references/source-basis.md) | 需要以官方来源佐证规则，或核查哪条来源支撑哪条规则时 |

## 来源层级

按以下顺序使用来源：

1. 目标期刊说明与投稿系统要求。
2. Nature Portfolio / Springer Nature 的数据、代码、材料与报告政策。
3. 存储库特定要求与领域社区标准。
4. FAIR 原则与 DataCite 元数据实践。

若某项政策细节可能已有变动，在给出最终投稿建议前，先核实当前期刊页面。
