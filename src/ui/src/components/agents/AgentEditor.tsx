import * as React from 'react'
import { ArrowRight, FileCode2, Layers, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { getAgentPrompt, resetAgentPrompt, saveAgentPrompt } from '@/lib/agentsApi'
import { client } from '@/lib/api'
import { cn } from '@/lib/utils'

type Scope = 'global' | 'quest'

const copy = {
  en: {
    title: (name: string) => `Edit agent · ${name}`,
    descGlobal: 'Global dedicated prompt override. Applies to every quest that uses this agent.',
    descQuest: 'This Quest\'s dedicated SKILL.md. Overrides the global default for this quest only.',
    scopeGlobal: 'Global default',
    scopeQuest: 'This quest',
    precedence: 'Runtime resolution: this quest’s SKILL.md › global prompt override › repository default SKILL.md.',
    defaultTag: 'Default',
    overridden: 'Customized',
    questOverridden: 'Quest override',
    reset: 'Reset to default',
    save: 'Save',
    cancel: 'Close',
    saved: 'Saved',
    savedQuest: 'Saved to this quest',
    resetDone: 'Reset to repository default',
    loadErr: 'Failed to load',
    switchToQuest: 'Edit this quest’s version',
    switchToGlobal: 'Edit global default',
    editHint: 'Edit either layer; the active quest version wins at runtime.',
  },
  zh: {
    title: (name: string) => `编辑 agent · ${name}`,
    descGlobal: '全局专有 prompt 覆盖，对所有使用该 agent 的 Quest 生效。',
    descQuest: '本 Quest 专属的 SKILL.md，仅覆盖此 Quest，不影响其他 Quest。',
    scopeGlobal: '全局默认',
    scopeQuest: '本 Quest',
    precedence: '运行时实际加载顺序：本 Quest 专属 SKILL.md › 全局 prompt 覆盖 › 仓库默认 SKILL.md。',
    defaultTag: '默认',
    overridden: '已自定义',
    questOverridden: 'Quest 覆盖',
    reset: '重置为默认',
    save: '保存',
    cancel: '关闭',
    saved: '已保存',
    savedQuest: '已保存到本 Quest',
    resetDone: '已重置为仓库默认',
    loadErr: '加载失败',
    switchToQuest: '编辑本 Quest 版本',
    switchToGlobal: '编辑全局默认',
    editHint: '两层均可编辑；运行时以当前 Quest 版本为准。',
  },
} as const

interface AgentEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentId: string
  agentName?: string
  promptFile?: string
  /** 提供时同时支持「本 Quest 专属」与「全局默认」两种作用域切换。 */
  questId?: string
  locale?: 'en' | 'zh'
  /** 保存成功后回调（两侧作用域均触发），工作台可借此刷新编排状态。 */
  onSaved?: () => void
}

export function AgentEditor({
  open,
  onOpenChange,
  agentId,
  agentName,
  promptFile,
  questId,
  locale: localeProp,
  onSaved,
}: AgentEditorProps) {
  const locale =
    localeProp ??
    (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase().startsWith('zh')
      ? 'zh'
      : 'en'
  const t = copy[locale]
  const canSwitch = Boolean(questId)

  const [scope, setScope] = React.useState<Scope>(questId ? 'quest' : 'global')
  const [text, setText] = React.useState('')
  const [loadedText, setLoadedText] = React.useState('')
  const [hasOverride, setHasOverride] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [status, setStatus] = React.useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  // 作用域或目标变化时重置到默认作用域
  React.useEffect(() => {
    if (open) setScope(questId ? 'quest' : 'global')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agentId, questId])

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setStatus(null)
    if (scope === 'global') {
      getAgentPrompt(agentId)
        .then((payload) => {
          if (cancelled) return
          setText(payload.prompt)
          setLoadedText(payload.prompt)
          setHasOverride(payload.has_override)
        })
        .catch((err) => {
          if (cancelled) return
          setStatus({ kind: 'err', msg: `${t.loadErr}: ${String(err?.message || err)}` })
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    } else {
      client
        .questAgentConfig(questId as string, agentId)
        .then((payload) => {
          if (cancelled) return
          setText(payload.skill_markdown || '')
          setLoadedText(payload.skill_markdown || '')
          setHasOverride(payload.is_quest_override)
        })
        .catch((err) => {
          if (cancelled) return
          setStatus({ kind: 'err', msg: `${t.loadErr}: ${String(err?.message || err)}` })
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }
    return () => {
      cancelled = true
    }
  }, [open, scope, agentId, questId, t.loadErr])

  const dirty = text !== loadedText

  const handleSave = async () => {
    setSaving(true)
    setStatus(null)
    try {
      if (scope === 'global') {
        const res = await saveAgentPrompt(agentId, text)
        setHasOverride(res.has_override)
        setStatus({ kind: 'ok', msg: t.saved })
      } else {
        await client.updateQuestAgentConfig(questId as string, agentId, text)
        setHasOverride(true)
        setLoadedText(text)
        setStatus({ kind: 'ok', msg: t.savedQuest })
      }
      onSaved?.()
    } catch (err) {
      setStatus({ kind: 'err', msg: `${t.loadErr}: ${String((err as { message?: string })?.message || err)}` })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (scope !== 'global') return
    setSaving(true)
    setStatus(null)
    try {
      const res = await resetAgentPrompt(agentId)
      setText('')
      setLoadedText('')
      setHasOverride(res.has_override)
      setStatus({ kind: 'ok', msg: t.resetDone })
    } catch (err) {
      setStatus({ kind: 'err', msg: `${t.loadErr}: ${String((err as { message?: string })?.message || err)}` })
    } finally {
      setSaving(false)
    }
  }

  const heading = agentName || agentId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-[15px]">{t.title(heading)}</DialogTitle>
            <code className="rounded bg-black/[0.05] px-1.5 py-0.5 text-[11px] text-[#5D5A55]">{agentId}</code>
            {hasOverride && (
              <span className="rounded-full bg-[#C7AD96]/25 px-2 py-0.5 text-[11px] font-medium text-[#7A6450]">
                {scope === 'quest' ? t.questOverridden : t.overridden}
              </span>
            )}
          </div>
          <DialogDescription className="text-[12px]">
            {scope === 'global' ? t.descGlobal : t.descQuest}
          </DialogDescription>
        </DialogHeader>

        {canSwitch && (
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full border border-black/10 bg-white/70 p-0.5 dark:border-white/10 dark:bg-white/[0.06]">
              <button
                type="button"
                onClick={() => setScope('global')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                  scope === 'global' ? 'bg-[#C7AD96] text-[#2D2A26]' : 'text-[#5D5A55] hover:bg-black/[0.04]'
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                {t.scopeGlobal}
              </button>
              <button
                type="button"
                onClick={() => setScope('quest')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                  scope === 'quest' ? 'bg-[#C7AD96] text-[#2D2A26]' : 'text-[#5D5A55] hover:bg-black/[0.04]'
                )}
              >
                <FileCode2 className="h-3.5 w-3.5" />
                {t.scopeQuest}
              </button>
            </div>
            {scope === 'global' ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#8A8278]">
                <ArrowRight className="h-3 w-3" />
                {t.switchToQuest}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#8A8278]">
                <ArrowRight className="h-3 w-3" />
                {t.switchToGlobal}
              </span>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex h-[360px] items-center justify-center text-[13px] text-[#8A8278]">
            {locale === 'zh' ? '加载中…' : 'Loading…'}
          </div>
        ) : (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[420px] w-full font-mono text-[12px] leading-relaxed"
            disabled={saving}
            spellCheck={false}
            placeholder={scope === 'global' ? 'Agent prompt' : 'Complete SKILL.md (frontmatter + body)'}
          />
        )}

        <p className="text-[11px] leading-5 text-[#8A8278]">{t.precedence}</p>

        {status && (
          <p className={`text-[12px] ${status.kind === 'ok' ? 'text-[#3F7A5E]' : 'text-[#B4453A]'}`}>{status.msg}</p>
        )}

        <DialogFooter className="gap-2">
          {scope === 'global' ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              disabled={saving || loading || !dirty}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {t.reset}
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={handleSave} disabled={saving || loading || !dirty}>
            {t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AgentEditor
