// 研究阶段 → 专用 agent 的展示数据源。
// 当前 DeepScientist 每个研究阶段在 src/skills/<id>/SKILL.md 已有独立提示词（SOP），
// 且 prompts/builder.py 的 STAGE_MEMORY_PLAN 已为每个 anchor 定义独立上下文（记忆命名空间）。
// 这一层是"每个阶段一个专用 agent、拥有独立 prompt 与上下文"的前端展示面；
// 后续可替换为后端 /agents 端点的真实返回（Agent 模型建立后）。

export type AgentRole = 'stage'

export interface AgentContextScope {
  quest: string[]
  global: string[]
}

export interface StageAgent {
  id: string
  role: AgentRole
  name: { en: string; zh: string }
  summary: { en: string; zh: string }
  promptFile: string
  // 仅 stage 有；来自 STAGE_MEMORY_PLAN
  contextScope?: AgentContextScope
  // 参与的研究模式
  modes: string[]
}

export const STAGE_AGENTS: StageAgent[] = [
  {
    id: 'scout',
    role: 'stage',
    name: { en: 'Scout', zh: '文献侦察' },
    summary: {
      en: 'Scouts frontier literature and evidence, builds a knowledge map, and flags promising research gaps.',
      zh: '侦察前沿文献与证据，建立知识地图，标记可下手的研究缺口。',
    },
    promptFile: 'src/skills/scout/SKILL.md',
    contextScope: { quest: ['papers', 'knowledge', 'decisions'], global: ['papers', 'knowledge', 'templates'] },
    modes: ['exploration'],
  },
  {
    id: 'baseline',
    role: 'stage',
    name: { en: 'Baseline', zh: '基线建立' },
    summary: {
      en: 'Establishes a trustworthy baseline as the reference point for later comparison.',
      zh: '建立可信基线，作为后续比较的参照点。',
    },
    promptFile: 'src/skills/baseline/SKILL.md',
    contextScope: {
      quest: ['papers', 'decisions', 'episodes', 'knowledge'],
      global: ['knowledge', 'templates', 'papers'],
    },
    modes: ['exploration', 'validation', 'paper_track'],
  },
  {
    id: 'idea',
    role: 'stage',
    name: { en: 'Idea', zh: '假设生成' },
    summary: {
      en: 'Generates and screens hypotheses/directions from accumulated evidence.',
      zh: '基于证据生成并筛选研究假设与方向。',
    },
    promptFile: 'src/skills/idea/SKILL.md',
    contextScope: { quest: ['papers', 'ideas', 'decisions', 'knowledge'], global: ['papers', 'knowledge', 'templates'] },
    modes: ['exploration'],
  },
  {
    id: 'optimize',
    role: 'stage',
    name: { en: 'Optimize', zh: '优化' },
    summary: {
      en: 'Runs targeted optimization on top of the baseline toward stronger results.',
      zh: '在基线之上做针对性优化，逼近更强结果。',
    },
    promptFile: 'src/skills/optimize/SKILL.md',
    contextScope: { quest: ['episodes', 'decisions', 'ideas', 'knowledge'], global: ['knowledge', 'templates'] },
    modes: ['exploration', 'validation'],
  },
  {
    id: 'experiment',
    role: 'stage',
    name: { en: 'Experiment', zh: '实验' },
    summary: {
      en: 'Designs and runs experiments, collecting trustworthy metrics and artifacts.',
      zh: '设计并执行实验，收集可信指标与产物。',
    },
    promptFile: 'src/skills/experiment/SKILL.md',
    contextScope: { quest: ['ideas', 'decisions', 'episodes', 'knowledge'], global: ['knowledge', 'templates'] },
    modes: ['exploration', 'validation', 'paper_track'],
  },
  {
    id: 'analysis-campaign',
    role: 'stage',
    name: { en: 'Analysis', zh: '分析' },
    summary: {
      en: 'Orchestrates analysis campaigns that turn experiment outputs into defensible conclusions.',
      zh: '组织分析活动，把实验产物转成可辩护的结论。',
    },
    promptFile: 'src/skills/analysis-campaign/SKILL.md',
    contextScope: {
      quest: ['ideas', 'decisions', 'episodes', 'knowledge', 'papers'],
      global: ['knowledge', 'templates', 'papers'],
    },
    modes: ['exploration', 'validation', 'paper_track'],
  },
  {
    id: 'write',
    role: 'stage',
    name: { en: 'Write', zh: '写作' },
    summary: {
      en: 'Drafts the research report/paper, integrating evidence and conclusions.',
      zh: '撰写研究报告/论文初稿，整合证据与结论。',
    },
    promptFile: 'src/skills/write/SKILL.md',
    contextScope: { quest: ['papers', 'decisions', 'knowledge', 'ideas'], global: ['templates', 'knowledge', 'papers'] },
    modes: ['paper_track'],
  },
  {
    id: 'finalize',
    role: 'stage',
    name: { en: 'Finalize', zh: '定稿' },
    summary: {
      en: 'Finalizes and polishes the deliverable for publication readiness.',
      zh: '定稿与润色，确保交付物完整可发布。',
    },
    promptFile: 'src/skills/finalize/SKILL.md',
    contextScope: { quest: ['decisions', 'knowledge', 'episodes'], global: ['knowledge', 'templates'] },
    modes: ['paper_track'],
  },
  {
    id: 'decision',
    role: 'stage',
    name: { en: 'Decision', zh: '决策' },
    summary: {
      en: 'Makes route decisions at key checkpoints: continue, pivot, or stop.',
      zh: '在关键节点做路线决策：继续、转向或停止。',
    },
    promptFile: 'src/skills/decision/SKILL.md',
    contextScope: { quest: ['decisions', 'knowledge', 'episodes', 'ideas'], global: ['knowledge', 'templates'] },
    modes: ['exploration', 'validation', 'paper_track'],
  },
]

export function agentRoleLabel(_role: AgentRole, locale: 'en' | 'zh' = 'zh'): string {
  return locale === 'zh' ? '主阶段' : 'Stage'
}
