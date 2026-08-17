import * as React from 'react'

import { STAGE_AGENTS, agentRoleLabel } from '@/lib/agents/stageAgents'

const stageAgents = STAGE_AGENTS.filter((a) => a.role === 'stage')

// 主阶段在图里的位置：探索骨架一行，写作/定稿作为论文轨道分支落到第二行。
// optimize 已并入 experiment、finalize 已并入 write，故图上只保留 7 个节点。
const BACKBONE = ['scout', 'baseline', 'idea', 'experiment', 'analysis-campaign', 'decision']
const PAPER_BRANCH: Record<string, { col: number; row: 1 }> = {
  write: { col: 4.6, row: 1 },
}

const MODE_META: Record<string, { short: { en: string; zh: string }; color: string }> = {
  exploration: { short: { en: 'Exp', zh: '探索' }, color: '#C7AD96' },
  validation: { short: { en: 'Val', zh: '验证' }, color: '#9EB2C2' },
  paper_track: { short: { en: 'Paper', zh: '论文' }, color: '#8FBFAD' },
}

// 各类 agent 之间的编排连线（每个 id 都是唯一的 agent 节点）。
const EDGES: { from: string; to: string; mode: 'exploration' | 'paper_track' }[] = [
  { from: 'scout', to: 'baseline', mode: 'exploration' },
  { from: 'baseline', to: 'idea', mode: 'exploration' },
  { from: 'idea', to: 'experiment', mode: 'exploration' },
  { from: 'experiment', to: 'analysis-campaign', mode: 'exploration' },
  { from: 'analysis-campaign', to: 'decision', mode: 'exploration' },
  { from: 'analysis-campaign', to: 'write', mode: 'paper_track' },
  { from: 'write', to: 'decision', mode: 'paper_track' },
]

const NODE_W = 152
const NODE_H = 84
const STEP = NODE_W + 34
const LEFT = 26
const ROW0 = 72
const ROW1 = ROW0 + NODE_H + 48

const pos: Record<string, { x: number; y: number }> = {}
BACKBONE.forEach((id, i) => {
  pos[id] = { x: LEFT + i * STEP + NODE_W / 2, y: ROW0 }
})
Object.entries(PAPER_BRANCH).forEach(([id, loc]) => {
  pos[id] = { x: LEFT + loc.col * STEP + NODE_W / 2, y: ROW1 }
})

const SVG_WIDTH = pos['decision'].x + NODE_W / 2 + 28
const SVG_HEIGHT = ROW1 + NODE_H / 2 + 16

function AgentNode({
  agent,
  x,
  y,
  isDecision,
  locale,
  onSelectAgent,
}: {
  agent: (typeof STAGE_AGENTS)[number]
  x: number
  y: number
  isDecision: boolean
  locale: 'en' | 'zh'
  onSelectAgent?: (agentId: string) => void
}) {
  const fill = isDecision ? '#C7AD96' : '#FBF8F3'
  const stroke = isDecision ? '#A98C6E' : '#D8C7B2'
  const roleColor = '#A98C6E'
  const roleBg = '#F3E9DD'
  const modes = agent.modes

  const chipTotal = modes.length * 40
  const chipStart = x - chipTotal / 2 + 20

  return (
    <g
      role="button"
      tabIndex={0}
      style={{ cursor: 'pointer' }}
      className="outline-none transition-opacity hover:opacity-80 focus:opacity-80"
      onClick={() => onSelectAgent?.(agent.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelectAgent?.(agent.id)
        }
      }}
    >
      <rect x={x - NODE_W / 2} y={y - NODE_H / 2} width={NODE_W} height={NODE_H} rx={13} fill={fill} stroke={stroke} strokeWidth={1.5} />
      {/* 角色徽标 */}
      <rect x={x - NODE_W / 2 + 9} y={y - NODE_H / 2 + 8} width={46} height={17} rx={8} fill={roleBg} />
      <text
        x={x - NODE_W / 2 + 32}
        y={y - NODE_H / 2 + 19}
        textAnchor="middle"
        style={{ fontSize: 10, fontWeight: 600, fill: roleColor }}
      >
        {agentRoleLabel(agent.role, locale)}
      </text>
      {/* 名称 */}
      <text x={x} y={y - 9} textAnchor="middle" className="fill-[#2D2A26]" style={{ fontSize: 13, fontWeight: 700 }}>
        {agent.name[locale]}
      </text>
      {/* 独立 prompt 文件 */}
      <text
        x={x}
        y={y + 9}
        textAnchor="middle"
        className="fill-[#8A8278]"
        style={{ fontSize: 8.5, fontFamily: 'ui-monospace, monospace' }}
      >
        {agent.promptFile.replace('src/skills/', '')}
      </text>
      {/* 参与模式标签 */}
      {modes.map((m, i) => {
        const meta = MODE_META[m]
        const cx = chipStart + i * 40
        return (
          <g key={`${agent.id}-${m}`}>
            <rect x={cx - 18} y={y + NODE_H / 2 - 20} width={36} height={15} rx={7} fill={meta.color} opacity={0.9} />
            <text x={cx} y={y + NODE_H / 2 - 9} textAnchor="middle" style={{ fontSize: 9, fontWeight: 600, fill: '#2D2A26' }}>
              {meta.short[locale]}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function AgentOrchestration({ locale, onSelectAgent }: { locale: 'en' | 'zh'; onSelectAgent?: (agentId: string) => void }) {
  const posOf = (id: string) => pos[id]

  return (
    <div className="overflow-x-auto rounded-[20px] border border-black/[0.06] bg-white/70 p-4 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[13px] font-semibold text-[#3A352E]">
          {locale === 'zh' ? '智能体编排：每个节点 = 一个专用 agent（独立 prompt 与上下文）' : 'Agent orchestration: each node is one dedicated agent'}
        </span>
        <span className="text-[11px] text-[#8A8278]">
          {locale === 'zh' ? '点击节点编辑专有 prompt' : 'Click a node to edit its prompt'}
        </span>
      </div>
      <svg
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="block"
        role="img"
        aria-label="Agent orchestration flow"
      >
        <defs>
          <marker id="arrowWarm" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
            <path d="M0,0 L9,4.5 L0,9 Z" fill="#B89B7C" />
          </marker>
          <marker id="arrowTeal" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
            <path d="M0,0 L9,4.5 L0,9 Z" fill="#6FA89A" />
          </marker>
        </defs>

        {/* 阶段 agent 之间的编排连线 */}
        {EDGES.map((e) => {
          const from = posOf(e.from)
          const to = posOf(e.to)
          if (!from || !to) return null
          const x1 = from.x + NODE_W / 2
          const y1 = from.y
          const x2 = to.x - NODE_W / 2
          const y2 = to.y
          const color = e.mode === 'exploration' ? '#B89B7C' : '#6FA89A'
          const marker = e.mode === 'exploration' ? 'url(#arrowWarm)' : 'url(#arrowTeal)'
          return (
            <line key={`${e.from}-${e.to}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.8} markerEnd={marker} />
          )
        })}

        {/* 决策节点迭代闭环：回到探索起点 */}
        {(() => {
          const d = posOf('decision')
          const s = posOf('scout')
          const midY = Math.max(d.y, s.y) + NODE_H / 2 + 34
          return (
            <path
              d={`M ${d.x} ${d.y + NODE_H / 2} C ${d.x} ${midY}, ${s.x} ${midY}, ${s.x} ${s.y + NODE_H / 2}`}
              fill="none"
              stroke="#C7AD96"
              strokeWidth={1.4}
              strokeDasharray="4 4"
              markerEnd="url(#arrowWarm)"
            />
          )
        })()}

        {/* 阶段 agent 节点 */}
        {stageAgents.map((agent) => {
          const p = posOf(agent.id)
          if (!p) return null
          return <AgentNode key={agent.id} agent={agent} x={p.x} y={p.y} isDecision={agent.id === 'decision'} locale={locale} onSelectAgent={onSelectAgent} />
        })}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-4 px-1 text-[11px] text-[#5D5A55]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] border border-[#A98C6E] bg-[#C7AD96]" />
          {locale === 'zh' ? '决策 agent' : 'Decision'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 bg-[#B89B7C]" />
          {locale === 'zh' ? '探索骨架' : 'Exploration spine'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 bg-[#6FA89A]" />
          {locale === 'zh' ? '论文轨道' : 'Paper track'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0 w-5 border-t-2 border-dashed border-[#C7AD96]" />
          {locale === 'zh' ? '迭代闭环' : 'Iteration loop'}
        </span>
      </div>
    </div>
  )
}

export default AgentOrchestration
