---
name: nature-figure
description: >-
  面向 Python 或 R 的、符合投稿标准的 Nature / 高影响力期刊作图工作流。每当用户要求创建、修订、审查或润色稿件插图、
  多面板科学绘图，或期刊就绪的 SVG/PDF/TIFF 输出时（尤其是 Nature 系列或其他高影响力期刊）使用。绘图前，
  先明确图表结论、证据逻辑、导出需求与审查风险。若用户未选择 Python 或 R，须询问"Python 还是 R？"并停止。
  仅使用所选后端进行图形生成、预览、导出与质量检查。支持 matplotlib/seaborn 与
  ggplot2/patchwork/ComplexHeatmap。不适用于仪表盘或 Illustrator/Figma 优先的信息图。
skill_role: companion
---

# Nature 插图制作技能

本辅助技能改编自 `Yuan1z0825/nature-skills/tree/main/nature-figure`。
上游 MIT 许可见 `UPSTREAM_LICENSE.txt`。

## DeepScientist 集成

- 遵循系统提示注入的共享交互契约。
- 当插图本身就是投稿级交付物（尤其是多面板或期刊导出类工作）时，将本技能用于 Nature 系列或其他高影响力期刊的插图工作。
- 对于来自实测数据的简单结构化柱状图、折线图、散点图或雷达图，将 `paper-plot` 作为更快的默认选择；当发表场合/导出/审查契约是主要约束时，使用 `nature-figure`。
- 当图形已存在、且遗留问题仅为局部可读性或表层质量时，保留 `figure-polish` 用于最终的"渲染—检查—修订"核查。
- 即使在自主模式下，也须遵守本技能的 Python/R 后端闸门。

本技能是一份将出版质量科学插图作为"视觉论证"来制作的指南，而非孤立的漂亮绘图。每一幅图都始于主张、证据层级与审查风险检查，之后才是代码与美学。

本技能中较早的 Python/matplotlib 规则仍然有效。该技能现在也支持 R，尤其是 `ggplot2 + patchwork + ComplexHeatmap + ggrepel + svglite/cairo_pdf + ragg`。若用户提供了私有的绘图模板集合，仅将其作为内部改编来源使用，且不得在面对用户的输出中透露其路径、文件名或来源。

配色策略：优先采用**跨所有面板的统一方法族**，而非最大化的色相分离。对于密集的 Nature Machine Intelligence 风格插图页，使用 `references/api.md` 中描述的低饱和度 `NMI pastel` 色族，并将绿/红主要保留给增益、下降及其他方向性提示。

## 第一步：绘图前先确立图表契约

在生成或编辑代码前，先确立以下契约。

**后端选择是一道阻塞式闸门。** 若用户在当前请求中未明确选择 Python 或 R，也未提供明显特定语言的输入文件/工作流，则提出一个简洁的问题：**Python 还是 R？** 然后停止并等待用户回答。不要生成模拟数据、编写脚本、创建插图，也不要默认选择 Python/R。这对于插图任务优先于通用自主/默认执行行为。

**所选后端独占全部插图生成。** 一旦选定 Python 或 R，每个绘图脚本、预览图、SVG/PDF/TIFF/PNG 导出、质量检查渲染以及视觉替代方案，都必须由同一个后端产出。即便所选运行时或软件包在本地缺失，也不得使用 Python 为 R 插图绘制预览，亦不得使用 R 为 Python 插图绘制预览。未被选择的语言，仅可在不开图形设备、不导入绘图库、不创建图像/矢量文件、不改变最终视觉外观的前提下，用于非视觉的文件检查或数据转换。

**缺失运行时/软件包规则。** 后端选定后，尽早检查所选运行时（`Rscript`/R 对应 R；Python 及其所需绘图包对应 Python）。若所选运行时或所需软件包不可用，在渲染前停止并报告确切的阻塞原因。你可以提供所选后端的脚本与安装命令，或请求安装依赖的许可，但不得退回到另一种语言去制作替代插图。

仅当用户明确要求你选择或推荐后端时，才推荐后端。此时使用 `references/backend-selection.md`，说明理由，然后采用推荐的后端继续。

1. 核心结论：写出该图必须捍卫的一句话主张。
2. 证据链：将每个计划中的面板映射到该主张，并剔除不承载独特证据的面板。
3. 原型分类：将插图归类为 `quantitative grid`、`schematic-led composite`、`image plate + quant` 或 `asymmetric mixed-modality figure`。
4. 后端：所有插图绘制、预览、导出与视觉质量检查，均独占使用所选的 Python 或 R 轨。不得用另一种语言交叉渲染。
5. 期刊/导出契约：在排版前，设定最终尺寸、可编辑文本、源数据、统计说明、图像完整性备注与导出格式。

最高优先级的规则是：**图表服务于科学逻辑**。美学润色、模板匹配与复杂布局，都从属于让核心结论清晰、可辩护且可审查。

## 面向用户的隐私规则

不得在面对用户的回复、生成的代码注释、图注、报告或稿件文本中，披露私有本地路径、私有文件名、聊天附件名、内部参考文件名、模板标识符或私有工作材料的来源。使用诸如"所提供的 R 模板集合"、"一份私有工作草稿"或"内部插图契约"之类的通用描述。仅当用户明确要求该审计线索时，才透露确切路径或源文件。

## Python 快速上手

**仅限 Python 执行规则。** 当用户选择 Python 时，所有插图绘制、预览、导出与视觉质量检查都在 Python 中完成。不得调用 R/ggplot2、ComplexHeatmap、patchwork 或任何 R 图形设备来创建临时预览、替代导出或布局近似。若 Python 或所需的 Python 绘图包缺失，在渲染前停止并报告缺失的依赖。你仍可编写 Python 脚本、提供 `pip`/环境安装命令或请求安装依赖的许可，但不得用 R 交叉渲染该插图。

```python
import matplotlib as mpl
import matplotlib.pyplot as plt

mpl.rcParams.update({
    "font.family": "sans-serif",
    "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans", "sans-serif"],
    "svg.fonttype": "none",     # editable text in SVG
    "pdf.fonttype": 42,         # editable TrueType text in PDF
    "font.size": 7,             # use 15-24 only for large slide-sized panels
    "axes.spines.right": False,
    "axes.spines.top": False,
    "axes.linewidth": 0.8,
    "legend.frameon": False,
})

def save_pub_py(fig, filename, dpi=600):
    fig.savefig(f"{filename}.svg", bbox_inches="tight")
    fig.savefig(f"{filename}.pdf", bbox_inches="tight")
    fig.savefig(f"{filename}.tiff", dpi=dpi, bbox_inches="tight")
```

仅当已安装 LaTeX 且需要富数学标签时，才使用 `text.usetex = True`。

## R 快速上手

```r
library(ggplot2)
library(patchwork)

theme_set(
  theme_classic(base_size = 6.5, base_family = "Arial") +
    theme(
      axis.line = element_line(linewidth = 0.35, colour = "black"),
      axis.ticks = element_line(linewidth = 0.35, colour = "black"),
      legend.title = element_text(size = 6.2),
      legend.text = element_text(size = 5.8),
      strip.text = element_text(size = 6.2, face = "bold"),
      plot.title = element_text(size = 7, face = "bold"),
      panel.grid = element_blank()
    )
)

save_pub_r <- function(plot, filename, width_mm = 183, height_mm = 120, dpi = 600) {
  w <- width_mm / 25.4
  h <- height_mm / 25.4
  svglite::svglite(paste0(filename, ".svg"), width = w, height = h)
  print(plot)
  dev.off()
  grDevices::cairo_pdf(paste0(filename, ".pdf"), width = w, height = h, family = "Arial")
  print(plot)
  dev.off()
  ragg::agg_tiff(paste0(filename, ".tiff"), width = w, height = h, units = "in", res = dpi)
  print(plot)
  dev.off()
}
```

## 默认操作立场

- 先将请求的插图归类到四种原型之一：
  `quantitative grid`、`schematic-led composite`、`image plate + quant` 或 `asymmetric mixed-modality figure`。
- 优先采用一个**核心面板**加从属证据面板，而非用等大小子图填满画布。
- 即使用户只要求单张图，仍须明确其在稿件主张中的角色：发现、机制、验证、比较、稳健性或临床/生物学相关性。
- 绘图与示意图背景保持白色；仅当为显微镜 / 体渲染图像板时才切换为黑色。
- 当类别在空间中固定，或图例会迫使不必要的视线移动时，优先使用直接标签而非图例。
- 每幅图保持一套克制的配色：通常一个中性色族、一个信号色族、一个强调色族。
- 将统计、`n`、误差棒定义、源数据可追溯性与图像完整性备注视为插图本身的一部分，而非可选的图注清理。
- 当用户要求进行宽泛的 `Nature` 风格而非 ML/NMI 特定风格时，在选择布局前先阅读 `references/nature-2026-observations.md`。

## 何时加载本技能

- 面向 Nature、Science、Cell、NeurIPS、ICLR 或类似场合的**论文、幻灯片或报告**的 Python 或 R 插图。
- 涉及**分组柱状图、趋势线、热图、雷达图、多面板网格**，或 **PDF/SVG/高 DPI** 输出的请求。
- 任何提及"Nature 风格"、"publication figure"、"paper figure"、"SCI figure"、"R plotting template"或"高质量科学绘图"的表述。
- 要求改进插图逻辑、美学、面板布局、图注、导出质量或期刊就绪度的请求。

## 何时不加载

- Plotly、Altair、Bokeh 或其他交互式/Web 优先绘图。
- 无发表目标的纯探索性数据分析（EDA）图。
- 主要工作流为 3D、GIS 或非科学插画工具。
- Illustrator / Figma 优先的布局。

## 相关文件

| 文件 | 何时打开 |
|------|-----------|
| [references/figure-contract.md](references/figure-contract.md) | 需要将用户请求转化为核心结论、证据层级、面板映射与审查风险检查时 |
| [references/backend-selection.md](references/backend-selection.md) | 用户尚未选择 Python/R、要求推荐，或可能采用混合 Python/R 工作流时 |
| [references/r-workflow.md](references/r-workflow.md) | 用户选择 R，或提供了 R 脚本/模板/数据时 |
| [references/r-template-index.md](references/r-template-index.md) | 需要改编用户提供的或私有的 R 模板集合、且不暴露源路径时 |
| [references/qa-contract.md](references/qa-contract.md) | 在最终交付、修订包、显微镜/印迹图或期刊特定审查之前 |
| [references/design-theory.md](references/design-theory.md) | 排版、配色理论、布局原理、导出政策 |
| [references/api.md](references/api.md) | Python PALETTE、辅助函数签名、验证规则 |
| [references/common-patterns.md](references/common-patterns.md) | Python 布局模式：核心面板、仅图例轴、暗色图像板、非对称布局 |
| [references/nature-2026-observations.md](references/nature-2026-observations.md) | 真实的 `Nature` 页面原型：示意图主导的复合图、暗色图像板、临床三联图、非对称核心布局 |
| [references/tutorials.md](references/tutorials.md) | 端到端演练：柱状图、趋势图、热图 |
| [references/chart-types.md](references/chart-types.md) | 雷达图、3D 球体、fill_between、散点模式 |
