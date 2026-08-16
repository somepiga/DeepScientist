---
name: paper-plot
description: 当结构化的数值数据、数组或类 CSV 的测量值应被转化为发表质量图，且应通过改编一个已打包的论文风格绘图模板、而非从零临时拼装一张新图时使用。
skill_role: companion
---

# 论文绘图(Paper Plot)

当任务是将测量数据快速且一致地转化为论文质量的图时，使用本技能。
该配套技能改编自 `Trae1ounG/paper-plot-skills/tree/main/plot-from-data`。

## 交互纪律

- 遵循系统提示注入的共享交互契约。
- 如果图表语义、单位、分组或预期比较不清晰，应向用户提出一个聚焦的后续问题，而非猜测。
- 当首张持久渲染就绪时，发送一次简洁的进度更新，说明选择了哪种风格、使用了什么数据源，以及输出写到了何处。

## 使用场景

- 用户提供测量值、数组、表格或类 CSV 数据，并希望得到一张发表质量的图
- 该图可表达为柱状图、折线图、散点图或雷达图，且能套用某个已打包的风格
- `write`、`analysis-campaign` 或 `experiment` 需要从结构化结果生成一张首轮面向论文的图

## 不适用场景

- 任务仅为对已渲染图的最后视觉 QA 或最后一公里精修；应使用 `figure-polish`
- 该图是一张无可持久价值的临时调试图
- 该图需要明显不匹配任何已打包模板的自定义多面板构图

所有已打包模板都会先输出一张 `dpi=300` 的 PNG。如果一篇面向论文的最终导出需要矢量输出或进一步的视觉精修，请在首轮渲染后将结果交给 `figure-polish`。

## 可用风格

| Style | Type | Script | Best for |
|-------|------|--------|----------|
| `bar_paired_delta` | Bar | `scripts/bar_memevolve.py` | 基线与方法的配对对比，带显式增益箭头 |
| `bar_grouped_hatch` | Bar | `scripts/bar_spice.py` | 多方法对比或带高亮主方法的消融 |
| `line_confidence_band` | Line | `scripts/line_selfdistill.py` | 带不确定性带的训练或缩放曲线 |
| `line_training_curve` | Line | `scripts/line_aime.py` | 带参考线或断点标记的有序曲线 |
| `line_loss_with_inset` | Line | `scripts/line_loss_inset.py` | 需要局部放大插图的曲线 |
| `scatter_tsne_cluster` | Scatter | `scripts/scatter_tsne.py` | 带标注的聚类嵌入图 |
| `scatter_broken_axis` | Scatter | `scripts/scatter_break.py` | 针对离群点或大间隙的断轴布局散点图 |
| `radar_dual_series` | Radar | `scripts/radar_dora.py` | 两方法多维度对比 |

## 工作流

```
1. Confirm the chart question, units, grouping, and preferred output location.
2. Choose the closest bundled style; if two or more styles fit, ask the user or state the rationale.
3. Read `references/<style_name>.md` for the exact layout, color, and rcParams expectations.
4. Copy `scripts/<script>.py` into a quest-local figure workspace such as `paper/figures/scripts/<figure_id>.py`.
5. Replace only the clearly marked data and label section in the copied script; keep the bundled template immutable.
6. Run the copied script and inspect the rendered output.
7. If the figure is durable or paper-facing, hand the result to `figure-polish` before treating it as final.
```

## 数据替换提示

每个模板脚本都将可编辑的数据块保留在靠近顶部处，通常是 `np.array(...)` 声明或一个小字典。

- 保持数组秩与基本类型稳定，除非你有意为之去重构绘图逻辑。
- 如果类别数量变化，应同步更新宽度计算、颜色列表、刻度标签与图例标签。
- 在复制后的脚本中直接替换标签与图例，而非事后编辑导出的图。
- 将源数据路径与生成脚本路径保存在图输出旁边，使图保持可复现。

## 详细风格参数

在生成前，阅读 `references/` 中对应的文件，以获取确切的 `rcParams`、颜色、字体大小、轴脊设置与刻度方向：

- Bar: `references/bar_paired_delta.md`, `references/bar_grouped_hatch.md`
- Line: `references/line_confidence_band.md`, `references/line_training_curve.md`, `references/line_loss_with_inset.md`
- Scatter: `references/scatter_tsne_cluster.md`, `references/scatter_broken_axis.md`
- Radar: `references/radar_dual_series.md`

## 与其他技能的关系

- 使用 `paper-plot` 从结构化数据生成首轮图，尤其是针对标准的柱状图、折线图、散点图与雷达图族。
- 使用 `figure-polish` 对持久里程碑或面向论文的图进行“渲染-检查-修订”的最终工作。
- 在 `write` 中，针对标准的柱状图、折线图、散点图或雷达图，在本技能之前临时拼装新绘图栈之前优先使用本技能。
