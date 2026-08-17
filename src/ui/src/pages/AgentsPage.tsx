import { Boxes, FileCode2, Layers, Pencil, Workflow } from 'lucide-react'
import * as React from 'react'

import { listAgents, type AgentSummary } from '@/lib/agentsApi'
import { STAGE_AGENTS, type StageAgent } from '@/lib/agents/stageAgents'
import AgentOrchestration from '@/components/agents/AgentOrchestration'
import AgentEditor from '@/components/agents/AgentEditor'
import { cn } from '@/lib/utils'

const copy = {
  en: {
    eyebrow: 'Agents',
    title: 'Research agents',
    body: 'Every registered skill is projected to a dedicated agent with its own prompt (SKILL.md) and context. Open any agent to fine-tune its dedicated prompt.',
    filterAll: 'All',
    promptLabel: 'Prompt',
    contextLabel: 'Context',
    questLabel: 'quest',
    globalLabel: 'global',
    modesLabel: 'Research modes',
    onDemand: 'Triggered on demand',
    viewList: 'Cards',
    viewFlow: 'Flow',
    loading: 'Loading agents…',
    tuned: 'Customized',
    fineTune: 'Fine-tune',
  },
  zh: {
    eyebrow: '智能体',
    title: '研究智能体',
    body: '每个已注册的 skill 都会投影为一个专用 agent，拥有独立提示词（SKILL.md）与上下文。点开任意 agent 即可微调其专有 prompt。',
    filterAll: '全部',
    promptLabel: '提示词',
    contextLabel: '上下文',
    questLabel: 'quest',
    globalLabel: 'global',
    modesLabel: '研究模式',
    onDemand: '按需触发',
    viewList: '卡片列表',
    viewFlow: '编排流程图',
    loading: '加载智能体…',
    tuned: '已自定义',
    fineTune: '微调 Prompt',
  },
} as const

// 后端 /api/agents 返回的 agent → 卡片展示结构
export interface DisplayAgent {
  id: string
  name: string
  role: string
  description: string
  promptFile: string
  contextScope?: { quest: string[]; global: string[] }
  modes: string[]
  hasOverride: boolean
}

function toDisplay(a: AgentSummary): DisplayAgent {
  return {
    id: a.id,
    name: a.name || a.id,
    role: a.role,
    description: a.description || '',
    promptFile: a.prompt_file,
    contextScope: a.context_scope,
    modes: a.modes ?? [],
    hasOverride: a.has_override,
  }
}

// API 不可用时的降级数据源（写死的 7 个主阶段 agent）
function stageToDisplay(a: StageAgent, locale: 'en' | 'zh'): DisplayAgent {
  return {
    id: a.id,
    name: a.name[locale],
    role: a.role,
    description: a.summary[locale],
    promptFile: a.promptFile,
    contextScope: a.contextScope,
    modes: a.modes,
    hasOverride: false,
  }
}

function roleLabel(role: string, locale: 'en' | 'zh'): string {
  if (role === 'stage') return locale === 'zh' ? '主阶段' : 'Stage'
  if (role === 'companion') return locale === 'zh' ? '伴随' : 'Companion'
  return role
}

type FilterValue = string
type ViewValue = 'list' | 'flow'

function AgentCard({
  agent,
  locale,
  onSelect,
}: {
  agent: DisplayAgent
  locale: 'en' | 'zh'
  onSelect: (agent: DisplayAgent) => void
}) {
  const t = copy[locale]
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(agent)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(agent)
        }
      }}
      className="flex h-full cursor-pointer flex-col rounded-[20px] border border-black/[0.06] bg-white/70 p-5 shadow-[0_1px_2px_rgba(45,42,38,0.04)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(45,42,38,0.10)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C7AD96]/25 px-2.5 py-1 text-[11px] font-medium text-[#7A6450]">
          <Layers className="h-3.5 w-3.5" />
          {roleLabel(agent.role, locale)}
        </span>
        <code className="truncate text-[11px] text-[#8A8278]">{agent.id}</code>
      </div>

      <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-[#2D2A26]">{agent.name}</h3>
      <p className="mt-1.5 text-[13px] leading-6 text-[#5D5A55]">{agent.description}</p>

      <div className="mt-4 space-y-3 border-t border-black/[0.06] pt-4">
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[#8A8278]">
            <FileCode2 className="h-3.5 w-3.5" />
            {t.promptLabel}
          </div>
          <code className="block truncate rounded-md bg-black/[0.04] px-2 py-1 text-[11px] text-[#5D5A55]">
            {agent.promptFile}
          </code>
        </div>

        {agent.contextScope ? (
          <div>
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-[#8A8278]">{t.contextLabel}</div>
            <div className="flex flex-wrap gap-1.5">
              {agent.contextScope.quest.map((ns) => (
                <span
                  key={`q-${ns}`}
                  className="rounded-full border border-black/10 bg-white/80 px-2 py-0.5 text-[11px] text-[#5D5A55]"
                >
                  {t.questLabel}:{ns}
                </span>
              ))}
              {agent.contextScope.global.map((ns) => (
                <span
                  key={`g-${ns}`}
                  className="rounded-full border border-black/10 bg-white/80 px-2 py-0.5 text-[11px] text-[#5D5A55]"
                >
                  {t.globalLabel}:{ns}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-[#8A8278]">{t.modesLabel}</div>
          <div className="flex flex-wrap gap-1.5">
            {agent.modes.length > 0 ? (
              agent.modes.map((mode) => (
                <span
                  key={mode}
                  className="rounded-full bg-[#9EB2C2]/20 px-2 py-0.5 text-[11px] text-[#4A5C6B]"
                >
                  {mode}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[11px] text-[#8A8278]">
                {t.onDemand}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-black/[0.06] pt-4">
        {agent.hasOverride ? (
          <span className="rounded-full bg-[#C7AD96]/25 px-2 py-0.5 text-[11px] font-medium text-[#7A6450]">
            {t.tuned}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSelect(agent)
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#2D2A26] px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#3F3A34]"
        >
          <Pencil className="h-3.5 w-3.5" />
          {t.fineTune}
        </button>
      </div>
    </div>
  )
}

export function AgentsPage() {
  const locale =
    (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en'
  const t = copy[locale]
  const [filter, setFilter] = React.useState<FilterValue>('all')
  const [view, setView] = React.useState<ViewValue>('list')
  const [selected, setSelected] = React.useState<DisplayAgent | null>(null)
  const [agents, setAgents] = React.useState<DisplayAgent[] | null>(null)
  const [loadError, setLoadError] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    setAgents(null)
    setLoadError(false)
    listAgents()
      .then((data) => {
        if (cancelled) return
        setAgents(data.map(toDisplay))
      })
      .catch(() => {
        if (cancelled) return
        setLoadError(true)
        setAgents(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const displayList: DisplayAgent[] =
    agents ?? (loadError ? STAGE_AGENTS.map((a) => stageToDisplay(a, locale)) : [])

  const roles = React.useMemo(() => Array.from(new Set(displayList.map((a) => a.role))), [displayList])
  const filters: { value: FilterValue; label: string }[] = [
    { value: 'all', label: t.filterAll },
    ...roles.map((r) => ({ value: r, label: roleLabel(r, locale) })),
  ]

  const visible = React.useMemo(
    () => (filter === 'all' ? displayList : displayList.filter((a) => a.role === filter)),
    [displayList, filter]
  )

  const views: { value: ViewValue; label: string; icon: typeof Boxes }[] = [
    { value: 'list', label: t.viewList, icon: Boxes },
    { value: 'flow', label: t.viewFlow, icon: Workflow },
  ]

  return (
    <div className="min-h-screen bg-[#F5F2EC] font-project text-[#2D2A26]">
      <div
        className="min-h-screen px-6 py-8"
        style={{
          backgroundImage:
            'radial-gradient(960px circle at 10% 10%, rgba(214, 198, 182, 0.36), transparent 58%), radial-gradient(820px circle at 90% 0%, rgba(158, 178, 194, 0.28), transparent 52%), linear-gradient(180deg, #F7F3ED 0%, #EFE9E0 100%)',
        }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#8A8278]">
                <Boxes className="h-4 w-4" />
                {t.eyebrow}
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{t.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5D5A55]">{t.body}</p>
            </div>
            <div className="flex items-center gap-2">
              {views.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setView(item.value)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                      view === item.value
                        ? 'border-[#C7AD96] bg-[#C7AD96] text-[#2D2A26]'
                        : 'border-black/10 bg-white/70 text-[#5D5A55] hover:bg-white'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          {agents === null && !loadError ? (
            <div className="py-24 text-center text-sm text-[#8A8278]">{t.loading}</div>
          ) : view === 'list' ? (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {filters.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    className={cn(
                      'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                      filter === item.value
                        ? 'border-[#C7AD96] bg-[#C7AD96] text-[#2D2A26]'
                        : 'border-black/10 bg-white/70 text-[#5D5A55] hover:bg-white'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} locale={locale} onSelect={setSelected} />
                ))}
              </div>
            </>
          ) : (
            <AgentOrchestration
              locale={locale}
              onSelectAgent={(id) => {
                const found = displayList.find((a) => a.id === id)
                if (found) setSelected(found)
              }}
            />
          )}

          <AgentEditor
            open={selected !== null}
            onOpenChange={(open) => {
              if (!open) setSelected(null)
            }}
            agentId={selected?.id ?? ''}
            agentName={selected?.name}
            promptFile={selected?.promptFile ?? ''}
            locale={locale}
          />
        </div>
      </div>
    </div>
  )
}

export default AgentsPage
