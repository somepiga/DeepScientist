'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, MessageSquare, Workflow } from 'lucide-react'

import { SegmentedControl, type SegmentedItem } from '@/components/ui/segmented-control'
import { useQuestWorkspace } from '@/lib/acp'
import { client } from '@/lib/api'
import type { QuestMessageAttachmentDraft } from '@/lib/hooks/useQuestMessageAttachments'
import type {
  AiManusChatMeta,
  CopilotPrefill,
} from '@/lib/plugins/ai-manus/view-types'
import { useI18n } from '@/lib/i18n/useI18n'

import { QuestConnectorChatView } from './QuestConnectorChatView'
import { QuestAgentStatusBar, QuestAgentTeamView } from './QuestAgentTeamView'
import { useCopilotDockCallbacks } from './CopilotDockOverlay'
import { QuestStudioTraceView } from './QuestStudioTraceView'
import type { QuestWorkspaceState } from './QuestWorkspaceSurface'

type QuestCopilotDockPanelProps = {
  questId: string
  title: string
  readOnly?: boolean
  prefill?: CopilotPrefill | null
  workspace?: QuestWorkspaceState
  transformSubmitMessage?: (message: string) => string
  beforeFeed?: React.ReactNode
}

type QuestCopilotMode = 'constraints' | 'evidence' | 'agents'

function isParkedCopilotWorkspace(workspace: QuestWorkspaceState) {
  const snapshot = workspace.snapshot
  const workspaceMode = String(snapshot?.workspace_mode || '').trim().toLowerCase()
  const continuationPolicy = String(snapshot?.continuation_policy || '').trim().toLowerCase()
  const activeRunId = String(snapshot?.active_run_id || '').trim()
  const bashRunningCount = Number(snapshot?.counts?.bash_running_count || 0)
  const latestBashSession =
    snapshot?.summary?.latest_bash_session &&
    typeof snapshot.summary.latest_bash_session === 'object' &&
    !Array.isArray(snapshot.summary.latest_bash_session)
      ? snapshot.summary.latest_bash_session
      : null
  const latestBashKind = String((latestBashSession as Record<string, unknown> | null)?.kind || '')
    .trim()
    .toLowerCase()
  const latestBashId = String((latestBashSession as Record<string, unknown> | null)?.bash_id || '')
    .trim()
  return (
    workspaceMode === 'copilot' &&
    continuationPolicy === 'wait_for_user_or_resume' &&
    !activeRunId &&
    !workspace.loading &&
    !workspace.restoring &&
    !workspace.error &&
    (bashRunningCount === 0 ||
      (bashRunningCount === 1 &&
        latestBashKind === 'terminal' &&
        (latestBashId === '' || latestBashId === 'terminal-main')))
  )
}

function resolveStatusText(args: {
  loading: boolean
  restoring: boolean
  stopping: boolean
  hasLiveRun: boolean
  error?: string | null
  activeToolCount: number
  connectionState: 'connecting' | 'connected' | 'reconnecting' | 'error'
  snapshotStatus?: string | null
  readyLabel?: string | null
  t: (key: string, variables?: Record<string, string | number>, fallback?: string) => string
}) {
  const { loading, restoring, stopping, hasLiveRun, error, activeToolCount, connectionState, snapshotStatus, readyLabel, t } = args
  if (stopping) return t('copilot_quest_status_stopping')
  if (restoring) return t('copilot_quest_status_restoring')
  if (loading) return t('copilot_quest_status_loading')
  if (connectionState === 'reconnecting') return t('copilot_quest_status_reconnecting')
  if (connectionState === 'connecting') return t('copilot_quest_status_connecting')
  if (hasLiveRun || activeToolCount > 0) {
    return activeToolCount > 0
      ? t('copilot_quest_status_working_tools', { count: activeToolCount })
      : t('copilot_quest_status_working')
  }
  if (error || connectionState === 'error') return t('copilot_quest_status_interrupted')
  if (snapshotStatus) return snapshotStatus
  return readyLabel || t('copilot_quest_status_ready')
}

export function QuestCopilotDockPanel({
  questId,
  title,
  readOnly: _readOnly,
  prefill,
  workspace: providedWorkspace,
  transformSubmitMessage,
  beforeFeed = null,
}: QuestCopilotDockPanelProps) {
  const { t } = useI18n('workspace')
  const dockCallbacks = useCopilotDockCallbacks()
  const internalWorkspace = useQuestWorkspace(providedWorkspace ? null : questId)
  const workspace = providedWorkspace ?? internalWorkspace
  const [stopping, setStopping] = React.useState(false)
  const [statusTransition, setStatusTransition] = React.useState<{
    current: string | null
    previous: string | null
    key: number
  }>({
    current: null,
      previous: null,
      key: 0,
  })
  const [mode, setMode] = React.useState<QuestCopilotMode>('agents')
  const [controlAction, setControlAction] = React.useState<'start' | 'pause' | 'resume' | 'stage' | null>(null)
  const [controlError, setControlError] = React.useState<string | null>(null)
  const agentQuery = useQuery({
    queryKey: ['quest-agents', questId],
    queryFn: () => client.questAgents(questId),
    enabled: Boolean(questId),
    refetchInterval: 4_000,
    refetchIntervalInBackground: false,
  })

  React.useEffect(() => {
    setMode('agents')
  }, [questId])

  React.useEffect(() => {
    setStopping(false)
    setStatusTransition({
      current: null,
      previous: null,
      key: 0,
    })
  }, [mode, questId])

  React.useEffect(() => {
    dockCallbacks?.onActionsChange(null)
  }, [dockCallbacks, mode])

  const parkedCopilot = React.useMemo(() => isParkedCopilotWorkspace(workspace), [workspace])
  const waitingNotice = workspace.snapshot?.waiting_notice
  const waitingNoticeStatus = String(waitingNotice?.status || '').trim().toLowerCase()
  const waitingNoticeLabel = String(waitingNotice?.label || '').trim()
  const waitingNoticeReason = String(waitingNotice?.reason || workspace.snapshot?.continuation_reason || '').trim()
  const effectiveHasLiveRun = parkedCopilot ? false : workspace.hasLiveRun
  const effectiveStreaming = parkedCopilot ? false : workspace.streaming
  const effectiveActiveToolCount = parkedCopilot ? 0 : workspace.activeToolCount

  const isResponding = React.useMemo(
    () =>
      stopping ||
      workspace.loading ||
      workspace.restoring ||
      workspace.connectionState === 'connecting' ||
      workspace.connectionState === 'reconnecting' ||
      effectiveHasLiveRun ||
      effectiveActiveToolCount > 0 ||
      effectiveStreaming,
    [
      effectiveActiveToolCount,
      effectiveHasLiveRun,
      effectiveStreaming,
      stopping,
      workspace.connectionState,
      workspace.loading,
      workspace.restoring,
    ]
  )

  const handleSubmit = React.useCallback(
    async (message: string, attachments: QuestMessageAttachmentDraft[] = []) => {
      const nextMessage = transformSubmitMessage ? transformSubmitMessage(message) : message
      await workspace.submit(nextMessage, attachments, { displayValue: message })
    },
    [transformSubmitMessage, workspace]
  )

  const statusText = React.useMemo(
    () => {
      if (waitingNoticeStatus === 'waiting') {
        return waitingNoticeLabel || t('copilot_waiting_feedback', undefined, 'Waiting for feedback')
      }
      if (waitingNoticeStatus === 'auto_resumed') {
        return waitingNoticeLabel || t('copilot_auto_resumed', undefined, 'Auto-resumed')
      }
      return (
      resolveStatusText({
        loading: workspace.loading,
        restoring: workspace.restoring,
        stopping,
        hasLiveRun: effectiveHasLiveRun || effectiveStreaming,
        error: workspace.error,
        activeToolCount: effectiveActiveToolCount,
        connectionState: workspace.connectionState,
        snapshotStatus: workspace.snapshot?.summary?.status_line ?? null,
        readyLabel:
          mode === 'evidence'
            ? t('copilot_trace_ready', undefined, 'Studio trace ready')
            : mode === 'agents'
              ? '研究任务控制台已就绪'
              : '研究约束已就绪',
        t,
      })
      )
    },
    [
      stopping,
      effectiveActiveToolCount,
      effectiveHasLiveRun,
      effectiveStreaming,
      isResponding,
      workspace.connectionState,
      workspace.error,
      workspace.loading,
      workspace.restoring,
      workspace.snapshot?.summary?.status_line,
      waitingNoticeLabel,
      waitingNoticeReason,
      waitingNoticeStatus,
      t,
    ]
  )

  React.useEffect(() => {
    setStatusTransition((prev) => {
      if (prev.current === statusText) {
        return prev
      }
      return {
        current: statusText,
        previous: prev.current,
        key: prev.key + 1,
      }
    })
  }, [statusText])

  const handleStopRun = React.useCallback(async () => {
    if (stopping) return
    setStopping(true)
    try {
      await workspace.stopRun()
    } finally {
      setStopping(false)
    }
  }, [stopping, workspace])

  const handleQuestControl = React.useCallback(
    async (action: 'start' | 'pause' | 'resume') => {
      setControlAction(action)
      setControlError(null)
      try {
        await client.controlQuest(questId, action === 'start' ? 'resume' : action)
        await agentQuery.refetch()
      } catch (caught) {
        setControlError(caught instanceof Error ? caught.message : '任务控制操作失败。')
      } finally {
        setControlAction(null)
      }
    },
    [agentQuery, questId]
  )

  const handleSetNextStage = React.useCallback(
    async (agentId: string) => {
      setControlAction('stage')
      setControlError(null)
      try {
        await client.updateQuestSettings(questId, { active_anchor: agentId })
        await agentQuery.refetch()
      } catch (caught) {
        setControlError(caught instanceof Error ? caught.message : '无法更新下一研究阶段。')
      } finally {
        setControlAction(null)
      }
    },
    [agentQuery, questId]
  )

  const showStopButton = React.useMemo(
    () => stopping || effectiveHasLiveRun || effectiveActiveToolCount > 0 || effectiveStreaming,
    [effectiveActiveToolCount, effectiveHasLiveRun, effectiveStreaming, stopping]
  )

  React.useEffect(() => {
    const meta: AiManusChatMeta = {
      threadId: `quest:${questId}:${mode}`,
      historyOpen: false,
      isResponding,
      toolCount: effectiveActiveToolCount,
      ready: !workspace.loading,
      isRestoring: workspace.restoring,
      restoreAttempted: true,
      hasHistory: workspace.feed.length > 0,
      error: workspace.error ?? null,
      title,
      statusText: statusTransition.current ?? statusText,
      statusPrevText: statusTransition.previous,
      statusKey: statusTransition.key,
      toolPanelVisible: false,
      toolToggleVisible: false,
      attachmentsDrawerOpen: false,
      fixWithAiRunning: false,
    }
    dockCallbacks?.onMetaChange(meta)
  }, [
    dockCallbacks,
    mode,
    questId,
    statusText,
    title,
    workspace.error,
    workspace.feed.length,
    effectiveActiveToolCount,
    effectiveHasLiveRun,
    effectiveStreaming,
    workspace.loading,
    workspace.restoring,
    statusTransition.current,
    statusTransition.key,
    statusTransition.previous,
    isResponding,
    statusText,
    stopping,
  ])

  const tabItems = React.useMemo<SegmentedItem<QuestCopilotMode>[]>(
    () => [
      { value: 'constraints', label: '研究约束', icon: <MessageSquare /> },
      { value: 'evidence', label: '研究记录', icon: <Activity /> },
      { value: 'agents', label: '控制台', icon: <Workflow /> },
    ],
    [t]
  )

  const agentError =
    !agentQuery.data && agentQuery.error instanceof Error ? agentQuery.error.message : null
  const agentStatusBar = (
    <QuestAgentStatusBar
      orchestration={agentQuery.data}
      loading={agentQuery.isLoading}
      error={agentError}
    />
  )

  React.useEffect(() => {
    dockCallbacks?.onHeaderExtraChange(
      <div data-onboarding-id="quest-copilot-mode-tabs">
        <SegmentedControl
          value={mode}
          onValueChange={setMode}
          items={tabItems}
          size="sm"
          ariaLabel={t('copilot_mode_tabs')}
          className="quest-copilot-mode-tabs border-black/[0.08] bg-white/[0.62] backdrop-blur-sm dark:border-white/[0.10] dark:bg-white/[0.06]"
        />
      </div>
    )
    return () => {
      dockCallbacks?.onHeaderExtraChange(null)
    }
  }, [dockCallbacks, mode, t, tabItems])

  return (
    <div className="flex h-full min-h-0 flex-col" data-onboarding-id="workspace-copilot-panel">
      {mode === 'constraints' ? (
        <QuestConnectorChatView
          questId={questId}
          feed={workspace.feed}
          loading={workspace.loading}
          restoring={workspace.restoring}
          streaming={effectiveStreaming}
          activeToolCount={effectiveActiveToolCount}
          connectionState={workspace.connectionState}
          error={workspace.error}
          stopping={stopping}
          showStopButton={showStopButton}
          slashCommands={workspace.slashCommands}
          hasOlderHistory={workspace.hasOlderHistory}
          loadingOlderHistory={workspace.loadingOlderHistory}
          onLoadOlderHistory={workspace.loadOlderHistory}
          onSubmit={handleSubmit}
          onReadNow={workspace.readNow}
          onWithdraw={workspace.withdraw}
          onStopRun={handleStopRun}
          prefill={prefill}
          beforeFeed={agentStatusBar}
        />
      ) : mode === 'evidence' ? (
        <QuestStudioTraceView
          questId={questId}
          feed={workspace.feed}
          snapshot={workspace.snapshot}
          loading={workspace.loading}
          restoring={workspace.restoring}
          streaming={effectiveStreaming}
          activeToolCount={effectiveActiveToolCount}
          connectionState={workspace.connectionState}
          error={workspace.error}
          stopping={stopping}
          showStopButton={showStopButton}
          slashCommands={workspace.slashCommands}
          hasOlderHistory={workspace.hasOlderHistory}
          loadingOlderHistory={workspace.loadingOlderHistory}
          onLoadOlderHistory={workspace.loadOlderHistory}
          onSubmit={handleSubmit}
          onReadNow={workspace.readNow}
          onWithdraw={workspace.withdraw}
          onStopRun={handleStopRun}
          prefill={prefill}
          beforeFeed={
            <>
              {agentStatusBar}
              {beforeFeed}
            </>
          }
        />
      ) : (
        <QuestAgentTeamView
          questId={questId}
          orchestration={agentQuery.data}
          loading={agentQuery.isLoading}
          error={controlError || agentError}
          questStatus={workspace.snapshot?.status || workspace.snapshot?.runtime_status || null}
          controlAction={controlAction}
          onStart={() => void handleQuestControl('start')}
          onPause={() => void handleQuestControl('pause')}
          onResume={() => void handleQuestControl('resume')}
          onSetNextStage={(agentId) => void handleSetNextStage(agentId)}
          onOpenChat={() => setMode('constraints')}
          onOpenEvidence={() => setMode('evidence')}
          onRefresh={() => void agentQuery.refetch()}
        />
      )}
    </div>
  )
}

export default QuestCopilotDockPanel
