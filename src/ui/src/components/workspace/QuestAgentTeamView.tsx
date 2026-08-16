'use client'

import * as React from 'react'
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Circle,
  Clock3,
  MessageSquarePlus,
  Pause,
  Play,
  RefreshCw,
  Settings2,
  Workflow,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { client } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { QuestAgentOrchestrationPayload } from '@/types'

type QuestAgentTeamViewProps = {
  questId: string
  orchestration?: QuestAgentOrchestrationPayload | null
  loading?: boolean
  error?: string | null
  questStatus?: string | null
  controlAction?: 'start' | 'pause' | 'resume' | 'stage' | null
  onStart?: () => void
  onPause?: () => void
  onResume?: () => void
  onSetNextStage?: (agentId: string) => void
  onOpenChat?: () => void
  onOpenEvidence?: () => void
  onRefresh?: () => void
}

type QuestAgentStatusBarProps = {
  orchestration?: QuestAgentOrchestrationPayload | null
  loading?: boolean
  error?: string | null
}

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function formatTime(value: unknown) {
  const text = asText(value)
  if (!text) return ''
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function resolveAgentState(
  orchestration: QuestAgentOrchestrationPayload,
  agentId: string
): 'working' | 'selected' | 'completed' | 'idle' {
  if (orchestration.active_agent_id === agentId) return 'working'
  if (orchestration.selected_agent_id === agentId) return 'selected'
  if (orchestration.last_agent_id === agentId) return 'completed'
  return 'idle'
}

function stateLabel(state: ReturnType<typeof resolveAgentState>) {
  return {
    working: '执行中',
    selected: '待执行',
    completed: '已完成',
    idle: '待命',
  }[state]
}

function StateIcon({ state }: { state: ReturnType<typeof resolveAgentState> }) {
  if (state === 'working') {
    return <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />
  }
  if (state === 'completed') {
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
  }
  if (state === 'selected') {
    return <Clock3 className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
  }
  return <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/45" />
}

export function QuestAgentStatusBar({
  orchestration,
  loading = false,
  error = null,
}: QuestAgentStatusBarProps) {
  if (error) {
    return (
      <div className="flex items-center gap-2 border-b border-black/[0.06] px-4 py-2 text-[11px] text-rose-600 dark:border-white/[0.08] dark:text-rose-300">
        <Bot className="h-3.5 w-3.5" />
        <span className="truncate">无法获取阶段 Agent 状态：{error}</span>
      </div>
    )
  }

  const agentId = orchestration?.active_agent_id || orchestration?.selected_agent_id || orchestration?.last_agent_id
  const state = orchestration?.active_agent_id
    ? 'working'
    : orchestration?.selected_agent_id
      ? 'selected'
      : orchestration?.last_agent_id
        ? 'completed'
        : 'idle'

  return (
    <div className="flex min-h-9 items-center gap-2 border-b border-black/[0.06] px-4 py-2 text-[11px] dark:border-white/[0.08]">
      <Bot className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">当前阶段 Agent</span>
      <span className="min-w-0 truncate font-medium text-foreground">
        {loading && !orchestration ? '正在加载...' : `@${asText(agentId) || 'DeepScientist'}`}
      </span>
      <span
        className={cn(
          'ml-auto inline-flex items-center gap-1.5 text-[10px] font-medium uppercase',
          state === 'working' && 'text-emerald-600 dark:text-emerald-400',
          state === 'selected' && 'text-amber-600 dark:text-amber-400',
          state === 'completed' && 'text-muted-foreground',
          state === 'idle' && 'text-muted-foreground'
        )}
      >
        {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
        {stateLabel(state)}
      </span>
    </div>
  )
}

export function QuestAgentTeamView({
  questId,
  orchestration,
  loading = false,
  error = null,
  questStatus = null,
  controlAction = null,
  onStart,
  onPause,
  onResume,
  onSetNextStage,
  onOpenChat,
  onOpenEvidence,
  onRefresh,
}: QuestAgentTeamViewProps) {
  const [pendingStageId, setPendingStageId] = React.useState<string | null>(null)
  const [editingAgentId, setEditingAgentId] = React.useState<string | null>(null)
  const [agentSkillMarkdown, setAgentSkillMarkdown] = React.useState('')
  const [agentConfigLoading, setAgentConfigLoading] = React.useState(false)
  const [agentConfigSaving, setAgentConfigSaving] = React.useState(false)
  const [agentConfigError, setAgentConfigError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setPendingStageId(null)
    setEditingAgentId(null)
  }, [questId])

  React.useEffect(() => {
    if (!editingAgentId) return
    let cancelled = false
    setAgentConfigLoading(true)
    setAgentConfigError(null)
    void client.questAgentConfig(questId, editingAgentId)
      .then((payload) => {
        if (!cancelled) setAgentSkillMarkdown(payload.skill_markdown || '')
      })
      .catch((caught) => {
        if (!cancelled) setAgentConfigError(caught instanceof Error ? caught.message : '无法读取 Agent 配置。')
      })
      .finally(() => {
        if (!cancelled) setAgentConfigLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [editingAgentId, questId])

  if (!orchestration && loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 正在加载多 Agent 编排状态
      </div>
    )
  }

  if (!orchestration) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
        <Workflow className="h-5 w-5" />
        <span>{error || '多 Agent 编排状态暂不可用。'}</span>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-black/[0.08] px-3 text-xs text-foreground hover:bg-black/[0.03] dark:border-white/[0.10] dark:hover:bg-white/[0.05]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> 刷新
          </button>
        ) : null}
      </div>
    )
  }

  const handoffs = [...orchestration.recent_handoffs].reverse().slice(0, 8)
  const runs = [...orchestration.recent_runs].reverse().slice(0, 10)
  const normalizedStatus = asText(questStatus).toLowerCase()
  const isPaused = ['paused', 'stopped'].includes(normalizedStatus)
  const activeAgentId = orchestration.active_agent_id || orchestration.selected_agent_id || orchestration.last_agent_id
  const hasStarted = Boolean(orchestration.active_agent_id || orchestration.last_agent_id || runs.length > 0)
  const editingAgent = orchestration.agents.find((agent) => agent.id === editingAgentId) || null

  const saveAgentConfig = async () => {
    if (!editingAgent) return
    setAgentConfigSaving(true)
    setAgentConfigError(null)
    try {
      await client.updateQuestAgentConfig(questId, editingAgent.id, agentSkillMarkdown)
      await onRefresh?.()
    } catch (caught) {
      setAgentConfigError(caught instanceof Error ? caught.message : '无法保存 Agent 配置。')
    } finally {
      setAgentConfigSaving(false)
    }
  }

  return (
    <div className="feed-scrollbar h-full overflow-y-auto px-4 py-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="border-b border-black/[0.07] pb-4 dark:border-white/[0.09]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Workflow className="h-4 w-4" /> 研究任务控制台
              </div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">
                系统按阶段自动调度 Agent。你只在暂停、调整下一阶段或补充研究约束时介入。
              </div>
            </div>
            {onRefresh ? (
              <button
                type="button"
                onClick={onRefresh}
                title="刷新编排状态"
                aria-label="刷新编排状态"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-black/[0.08] text-muted-foreground hover:bg-black/[0.03] hover:text-foreground dark:border-white/[0.10] dark:hover:bg-white/[0.05]"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              </button>
            ) : null}
          </div>
          <div className="mt-4 flex flex-col gap-3 border border-black/[0.07] bg-black/[0.015] p-3 dark:border-white/[0.10] dark:bg-white/[0.04]">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase text-muted-foreground">当前阶段</div>
              <div className="mt-1 truncate text-sm font-semibold text-foreground">@{asText(activeAgentId) || 'baseline'}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">任务 {questId} · {isPaused ? '已暂停' : '运行中'}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!hasStarted ? (
                <button
                  type="button"
                  onClick={onStart}
                  disabled={!onStart || controlAction !== null}
                  className="inline-flex h-9 items-center gap-2 border border-emerald-700 bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Play className="h-3.5 w-3.5" /> {controlAction === 'start' ? '正在启动...' : '开始运行'}
                </button>
              ) : isPaused ? (
                <button
                  type="button"
                  onClick={onResume}
                  disabled={!onResume || controlAction !== null}
                  className="inline-flex h-9 items-center gap-2 border border-emerald-600/20 bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Play className="h-3.5 w-3.5" /> 继续研究
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onPause}
                  disabled={!onPause || controlAction !== null}
                  className="inline-flex h-9 items-center gap-2 border border-black/[0.10] bg-white px-3 text-xs font-medium text-foreground hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.12] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
                >
                  <Pause className="h-3.5 w-3.5" /> 暂停
                </button>
              )}
              <button
                type="button"
                onClick={onOpenChat}
                disabled={!onOpenChat}
                className="inline-flex h-9 items-center gap-2 border border-black/[0.10] bg-white px-3 text-xs font-medium text-foreground hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.12] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" /> 补充约束
              </button>
              <button
                type="button"
                onClick={onOpenEvidence}
                disabled={!onOpenEvidence}
                className="inline-flex h-9 items-center gap-2 border border-black/[0.10] bg-white px-3 text-xs font-medium text-foreground hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.12] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
              >
                <Clock3 className="h-3.5 w-3.5" /> 查看产出
              </button>
            </div>
          </div>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase text-muted-foreground">
            <span>研究阶段</span>
            <span>{orchestration.agents.length}</span>
          </div>
          <div className="divide-y divide-black/[0.06] border-y border-black/[0.06] dark:divide-white/[0.08] dark:border-white/[0.08]">
            {orchestration.agents.map((agent) => {
              const state = resolveAgentState(orchestration, agent.id)
              return (
                <div key={agent.id} className="flex flex-col gap-2 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <StateIcon state={state} />
                      <span className="font-semibold text-foreground">@{agent.id}</span>
                      <span className="truncate text-muted-foreground">{agent.name}</span>
                    </div>
                    <div className="mt-1 pl-[22px] text-[11px] leading-5 text-muted-foreground">
                      {agent.description}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 pl-[22px]">
                      {agent.context_scope.quest.map((scope) => (
                        <Badge key={`${agent.id}:quest:${scope}`} className="bg-black/[0.03] text-[10px] dark:bg-white/[0.05]">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-[22px]">
                    <div className="text-[10px] font-medium text-muted-foreground">{stateLabel(state)}</div>
                    <button
                      type="button"
                      onClick={() => setEditingAgentId(agent.id)}
                      disabled={agentConfigSaving}
                      className="inline-flex h-7 items-center gap-1 border border-black/[0.10] bg-white px-2 text-[10px] font-medium text-foreground hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.12] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
                    >
                      <Settings2 className="h-3 w-3" /> {agent.quest_configured ? '已配置' : '配置'}
                    </button>
                    {agent.id !== orchestration.selected_agent_id && state !== 'working' && onSetNextStage ? (
                      <button
                        type="button"
                        onClick={() => setPendingStageId(agent.id)}
                        disabled={controlAction !== null}
                        className="h-7 border border-black/[0.10] bg-white px-2 text-[10px] font-medium text-foreground hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.12] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
                      >
                        设为下一阶段
                      </button>
                    ) : null}
                  </div>
                  {editingAgent?.id === agent.id ? (
                    <div className="ml-[22px] border border-black/[0.08] bg-black/[0.015] p-3 dark:border-white/[0.10] dark:bg-white/[0.04]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-foreground">编辑 @{agent.id}/SKILL.md</div>
                          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                            这是该 Quest 专属的完整 Skill 文件。保存后会替换该 Agent 在此任务中实际加载的 SKILL.md，不会注入附加指令，也不影响其他 Quest。
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingAgentId(null)}
                          disabled={agentConfigSaving}
                          className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-60"
                        >
                          关闭
                        </button>
                      </div>
                      <Textarea
                        value={agentSkillMarkdown}
                        onChange={(event) => setAgentSkillMarkdown(event.target.value)}
                        disabled={agentConfigLoading || agentConfigSaving}
                        placeholder="完整 SKILL.md 内容"
                        className="mt-3 min-h-[28rem] resize-y bg-white font-mono text-xs leading-5 dark:bg-white/[0.06]"
                      />
                      {agentConfigError ? <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-300">{agentConfigError}</p> : null}
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingAgentId(null)}
                          disabled={agentConfigSaving}
                          className="h-8 border border-black/[0.10] bg-white px-3 text-[11px] font-medium text-foreground hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.12] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveAgentConfig()}
                          disabled={agentConfigLoading || agentConfigSaving}
                          className="h-8 border border-emerald-700 bg-emerald-600 px-3 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {agentConfigSaving ? '正在保存...' : '保存 SKILL.md'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
          {pendingStageId ? (
            <div className="mt-3 border border-amber-500/30 bg-amber-500/[0.07] p-3 dark:bg-amber-400/[0.08]">
              <div className="text-xs font-semibold text-foreground">确认调整研究路由</div>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                后续任务将交给 @{pendingStageId}。当前正在执行的阶段不会中断；系统会在其结束后按新的阶段继续。
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingStageId(null)}
                  disabled={controlAction !== null}
                  className="h-8 border border-black/[0.10] bg-white px-3 text-[11px] font-medium text-foreground hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.12] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSetNextStage?.(pendingStageId)
                    setPendingStageId(null)
                  }}
                  disabled={!onSetNextStage || controlAction !== null}
                  className="h-8 border border-amber-700 bg-amber-600 px-3 text-[11px] font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {controlAction === 'stage' ? '正在调整...' : '确认调整'}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section>
          <div className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">阶段交接</div>
          {handoffs.length > 0 ? (
            <div className="divide-y divide-black/[0.06] border-y border-black/[0.06] dark:divide-white/[0.08] dark:border-white/[0.08]">
              {handoffs.map((handoff, index) => {
                const fromAgent = asText(handoff.from_agent_id)
                const toAgent = asText(handoff.to_agent_id)
                return (
                  <div key={asText(handoff.handoff_id) || `handoff-${index}`} className="py-3">
                    <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-foreground">
                      <span className="truncate">@{fromAgent || '未知阶段'}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">@{toAgent || '未知阶段'}</span>
                      <span className="ml-auto shrink-0 text-[10px] font-normal text-muted-foreground">
                        {formatTime(handoff.created_at)}
                      </span>
                    </div>
                    {asText(handoff.summary) ? (
                      <div className="mt-1 text-[11px] leading-5 text-muted-foreground">{asText(handoff.summary)}</div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="border-y border-black/[0.06] py-4 text-xs text-muted-foreground dark:border-white/[0.08]">
              当前尚未记录阶段交接。
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">近期运行</div>
          {runs.length > 0 ? (
            <div className="divide-y divide-black/[0.06] border-y border-black/[0.06] dark:divide-white/[0.08] dark:border-white/[0.08]">
              {runs.map((run, index) => {
                const eventType = asText(run.type)
                const agentId = asText(run.agent_id)
                const finished = eventType === 'agent.run_finished'
                return (
                  <div key={asText(run.event_id) || `run-${index}`} className="flex items-center gap-2 py-2.5 text-xs">
                    {finished ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    )}
                    <span className="font-medium text-foreground">@{agentId || '未知阶段'}</span>
                    <span className="truncate text-muted-foreground">
                      {finished ? '已完成' : '已启动'} {asText(run.runner) || asText(run.model)}
                    </span>
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                      {formatTime(run.created_at)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="border-y border-black/[0.06] py-4 text-xs text-muted-foreground dark:border-white/[0.08]">
              当前尚未记录阶段 Agent 运行。
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default QuestAgentTeamView
