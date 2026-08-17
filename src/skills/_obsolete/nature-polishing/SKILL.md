---
name: nature-polishing
description: 使用源自《Scientific English Writing & Communication》的论文架构与写作策略原则，并辅以 Academic Phrasebank 的短语级支持，将学术散文润色、重构或翻译为偏 Nature 风格的英语。每当用户要求润色稿件段落、摘要、引言、结果、讨论、结论、标题、方法部分，或中文论文草稿以达出版质量的英语时使用。
version: 5.0.0
author: Yuan1z skill rebuilt from course notes plus Academic Phrasebank
skill_role: companion
---

# Nature 风格学术论文润色

本辅助技能改编自 `Yuan1z0825/nature-skills/tree/main/nature-polishing`。
上游 MIT 许可见 `UPSTREAM_LICENSE.txt`。

## DeepScientist 集成

- 遵循系统提示注入的共享交互契约。
- 当用户要求偏 Nature 风格的英语、中译英稿件润色、章节重构或出版质量学术散文时，在 `write`、`review` 或 `rebuttal` 中使用本技能。
- 在证据与主张边界清晰之后再应用。不要用风格润色来掩盖缺失的支撑、夸大新颖性，或让无支撑的主张听起来更强势。
- 保持 DeepScientist 稿件卫生规则的权威性：面向论文的散文中不得出现用户/操作员/agent 来源、路由控制措辞、提示状态或本地实现简写。

使用本技能在两个层面改进科学写作：

- `main strategy`：论文架构、章节逻辑、读者工作流、证据阈值与伦理
- `reference support`：可复用的短语族、语步模式、过渡与风格检查

主要策略应来自 `Chapter1-Week1-7` 中的课程笔记。参考措辞层应来自 `Academic Phrasebank`。

## 默认立场

- 语言服务于论证。不要在推理断裂的情况下去润色句子。
- 带着对读者的共情写作：先相关性，再新颖性，再可信度，再复用性，再意义。
- 对作者不应有谜团，但可以对读者保留一个谜团。
- 不要编造数据、参考文献、机制或新颖性主张。
- 不要让 AI 从零起草论文的核心科学论证。
- 若草稿为中文或结构上粗糙，先重构逻辑，再处理措辞。

## 何时打开额外文件

这些文件是参考支持。在章节的修辞任务明确之后再使用它们。

| 文件 | 何时打开 |
|---|---|
| [references/section-moves.md](references/section-moves.md) | 需要源自 Academic Phrasebank 的、章节特定的语步顺序或短语模式时 |
| [references/phrasebank-playbook.md](references/phrasebank-playbook.md) | 需要 hedging、过渡、证据、局限性或未来工作类的短语族时 |
| [references/style-guardrails.md](references/style-guardrails.md) | 需要学术风格检查、段落/句子检查、冠词使用、语域或基础规范时 |

## 核心架构

### 1. 先识别论文类型

编辑前，先确定这是什么类型的论文或章节。

- `Research paper`：读者会问现象为何重要、做了什么、发现了什么、意味着什么。
- `Methods paper`：读者会问方法是否有效、是否可复现、在公平比较下是否更优。
- `Hypothesis-based work`：论证试图确立或排除某一因果解释。
- `Algorithmic or device work`：论证提出一个流程、工具或系统，且必须展示其可靠而具优势的表现。

不要对各类论文套用同一种叙事逻辑。

### 2. 为读者写作，而非为草稿的时间顺序写作

大多数读者遵循一个稳定的顺序：

1. 这和我相关吗？
2. 这里有什么新东西？
3. 我信任它吗？
4. 我能复用吗？
5. 它意味着什么，边界在哪里？

润色应帮助论文按此顺序回答这些问题。

### 3. 使用沙漏结构

优秀的论文常常呈现为一个沙漏：

- `Introduction`：先宽泛铺开，再收窄到具体的缺口、问题、假设、方法与研究
- `Discussion/Conclusion`：再次放宽，将发现与文献重新连接，并解释知识缺口是如何被填补的

若某段落或章节违背了该架构，先在润色措辞前重建它。

### 4. 使用正确的写作顺序

对于研究型文章，高效的写作顺序是：

1. Results
2. Introduction 与 Conclusion
3. Title
4. Discussion
5. Materials and Methods
6. Authors
7. Abstract

对于方法类论文，高效的写作顺序通常从以下开始：

1. Methods
2. Results
3. Introduction
4. Conclusion
5. Discussion
6. Abstract

本技能应遵循证据与论证的逻辑，而非用户起草句子时的原始顺序。

### 5. 保护核心论证

论文的核心论证包括：

- 论文实际回答的科学问题
- 该问题为何重要
- 工作与既有研究有何不同
- 结果意味着什么
- 主推理线如何展开

AI 可帮助润色、结构化或比较措辞。AI 不应发明或撰写核心论证。若论证薄弱或不清晰，应暴露该弱点，而非用润色后的语言将其掩盖。

### 6. 编辑前先诊断失效模式

重写前，先识别主要问题：

- 论文类型逻辑错误
- 缺失缺口或定位不佳
- 无证据的主张
- 无清晰主张的证据
- 缺失边界或局限性
- Results 与 Discussion 混在一起
- 标题或摘要信号薄弱
- 仅为句子层面的杂乱

按此顺序确定优先级：

`paper type -> section job -> paragraph logic -> claim/evidence/boundary -> sentence polish`

## 章节职责

### Introduction

引言应：

- 告诉读者该工作为何重要
- 说明它填补了什么缺口
- 解释该缺口为何重要
- 陈述已知的内容
- 陈述仍未解决的内容
- 陈述论文提出什么问题
- 指明研究如何着手解决它

不要在此总结 Results 章节。不要在此总结 Conclusion 章节。

### Results

Results 是对为回应引言所提问题而收集的数据的总结。

Results 的写作应：

- 主要使用过去时
- 报告在何种条件下、以何种量化支撑观察到了什么
- 正确且节制地使用统计
- 节制地使用补充数据

Results 应回答 `what happened`，而非 `what it ultimately means`。

### Discussion

Discussion 应回答：

- 该工作如何融入更广阔的领域
- 为理解增添了什么
- 早期工作应归功于谁
- 发现是支持、复杂化还是修订了早期结果
- 如何解释这些发现
- 该解释何时可能失效

简短规则：

- `Results = what we observed`
- `Discussion = how we understand it, and when it may fail`

### Conclusion

使用三段式收尾：

1. 重申核心贡献
2. 总结关键证据或结果
3. 陈述带有边界的启示

不要在结论中引入新数据。此处始终运行过度主张检查。

### Title

有力的标题应：

- 告诉读者可以期待什么
- 避免不必要的技术语言
- 易于检索
- 有数据支撑
- 在不牺牲可信度的前提下制造好奇

使用 `curiosity with credibility`，而非空洞的机巧。只有当主张仍可完全辩护时，钩子式的标题才可接受。

### Materials and Methods

方法应具体、完整、透明且可复现。

另一团队应能据此确定：

- 工作是否符合伦理规范
- 使用了何种材料与条件
- 使用了哪些关键参数、控制与重复
- 数据如何处理与分析
- 使用了哪些统计检验与软件版本

仅当所引报告确实包含必要细节时，才可通过引用早期报告来缩写。

绝不要留下诸如以下的含糊表述：

- `under standard conditions`
- `using routine methods`
- `data were analyzed statistically`
- `differences were significant`
- `samples were randomly assigned`
- `the method was validated`

用实际可复现的信息替换它们。

### 方法类论文变体

在方法类论文中，Results 章节必须展示该方法相对于既有方法的优势。典型问题包括：

- 它更可靠吗？
- 它更快吗？
- 它需要的资源更少吗？
- 比较是否公平且可复现？

方法类论文的 Methods 章节可能需要以下额外细节：

- 公理、条件与假设
- 硬件与软件环境
- 数学推导
- 评估协议
- 数据集、基线、指标、切分与超参数

### Abstract

摘要是一篇迷你论文：

`context/problem -> gap/objective -> approach -> key results -> implication`

它应回答：

1. 解决了什么问题？
2. 如何解决的？
3. 发现了什么？
4. 为什么有人应在意？

某些期刊要求严格的摘要格式。若与通用模式冲突，遵循期刊要求。

## 句子与段落控制

### 句子规则

- 每句话保持在 `<= 30` 词以内。
- 若某句超过 `20` 词，检查它是否包含多于一个主要命题。
- 拆分过载的句子，而非仅做表面润色。
- 段落的最后一句往往变成最长也最弱的句子。要显式检查它。
- 每句优先只有一个核心主谓命题。

### 段落规则

- 每段应有一个控制性观点，后接支撑。
- 支撑材料可包括数据、比较、解释、后果、文献或局限性。
- 若出现新观点，另起一段，而非堆叠在旧段落上。
- 使用主题衔接，而非重复的 `This suggests ...` 开头。

### Results 与 Discussion 的句子类型

Results 句子通常报告：

- `was detected`
- `increased`
- `showed`
- `enabled`
- `achieved`

Discussion 句子通常解读：

- `may reflect`
- `suggests that`
- `could indicate`
- `is likely due to`
- `may facilitate`

除非过渡是有意为之，否则不要让 Results 段落漂移到 Discussion 句法。

### 中译英模式

当源材料为中文或深受中文影响的英语时：

- 先提取核心命题
- 不要逐从句机械翻译
- 重建显式的逻辑链接：对比、因果、启示、局限
- 核查术语、因果、hedging 与学科细微差别
- 保持关键技术术语稳定

## 引用、伦理与 AI 边界

### 知识债务

原创性通常是对既有知识的修正、组合或扩展。细心的作者会公开承认这笔债务。

不要为了让当前工作显得更原创而贬低他人的贡献。

### 清晰归属立场

使以下事项显而易见：

- 论文如何建立在先前工作之上
- 早期想法、方法、数据或解读由谁负责
- 读者可在何处定位来源

### 引用你实际阅读并核实过的来源

- 就 `A` 自身的数据、方法、主张或结论引用论文 `A`。
- 就 `B` 对 `A` 的解读、比较、批评或评论引用论文 `B`。
- 当可直接引用源文章时，避免依赖二手来源。

### 哪些内容需要引用

- 他人的想法
- 数据
- 方法
- 措辞
- 结构
- 图像
- 独特的解读

不要仅因某材料在线就假定其为公有领域。

### 校对检查

始终验证：

- 语法错误
- 排版错误
- 插图编号
- 缺失引用
- 论文读起来是愉悦还是煎熬

### AI 红绿灯边界

`Green`：在作者核实下通常可接受

- 改进语法、清晰度、简洁度或语气
- 生成大纲选项或段落结构
- 产出替代标题或摘要措辞
- 为分类而总结文献，而非替代阅读
- 在术语与 hedging 检查下翻译

`Yellow`：仅在有强人工控制时允许

- 为措辞支持而解释方法或结果
- 起草审稿人回复框架，随后逐行检查
- 仅在输出被复现并验证时，辅助代码或统计解释

`Red`：通常不合适

- 让 AI 从零起草论文核心论证
- 插入未经核查的 AI 生成参考文献、数据或主张
- 将未发表论文、敏感数据或同行评审材料上传至公开模型
- 使用 AI 编造、操纵或隐藏实质性的图像生成

主要危险不在于 AI 不会写。主要危险在于它能以极高的自信写出错误的内容。

## 输出格式

默认输出：

1. 润色后的文本作为纯散文，而非置于代码块中。
2. `Revision notes:` 含 `3-5` 条关于主要结构与风格变更的简短要点。
3. 若重写改变了章节逻辑，须显式说明。

若用户要求进行对照式修订，则提供：

- `Original`
- `Polished`
- `Why changed`
