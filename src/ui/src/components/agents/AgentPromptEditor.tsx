import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { getAgentPrompt, resetAgentPrompt, saveAgentPrompt } from '@/lib/agentsApi'

interface AgentPromptEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentId: string
  agentName: { en: string; zh: string }
  promptFile: string
  locale: 'en' | 'zh'
}

export function AgentPromptEditor({ open, onOpenChange, agentId, agentName, promptFile, locale }: AgentPromptEditorProps) {
  const [text, setText] = React.useState('')
  const [defaultPrompt, setDefaultPrompt] = React.useState('')
  const [hasOverride, setHasOverride] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [status, setStatus] = React.useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const labels = {
    title: locale === 'zh' ? `编辑专有 Prompt · ${agentName.zh}` : `Edit dedicated prompt · ${agentName.en}`,
    desc: locale === 'zh' ? `默认模板来自 ${promptFile}，微调后保存为该 agent 的专有 prompt。` : `Default template from ${promptFile}; tweak and save as this agent's dedicated prompt.`,
    reset: locale === 'zh' ? '重置为默认模板' : 'Reset to default',
    save: locale === 'zh' ? '保存' : 'Save',
    cancel: locale === 'zh' ? '关闭' : 'Close',
    overridden: locale === 'zh' ? '已自定义' : 'Customized',
    defaultTag: locale === 'zh' ? '默认' : 'Default',
    saved: locale === 'zh' ? '已保存' : 'Saved',
    resetDone: locale === 'zh' ? '已重置为默认模板' : 'Reset to default template',
    loadErr: locale === 'zh' ? '加载失败' : 'Failed to load',
  }

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setStatus(null)
    getAgentPrompt(agentId)
      .then((payload) => {
        if (cancelled) return
        setDefaultPrompt(payload.default_prompt)
        setText(payload.prompt)
        setHasOverride(payload.has_override)
      })
      .catch((err) => {
        if (cancelled) return
        setStatus({ kind: 'err', msg: `${labels.loadErr}: ${String(err?.message || err)}` })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, agentId, labels.loadErr])

  const handleSave = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const res = await saveAgentPrompt(agentId, text)
      setHasOverride(res.has_override)
      setStatus({ kind: 'ok', msg: labels.saved })
    } catch (err) {
      setStatus({ kind: 'err', msg: `${labels.loadErr}: ${String((err as { message?: string })?.message || err)}` })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const res = await resetAgentPrompt(agentId)
      setText(defaultPrompt)
      setHasOverride(res.has_override)
      setStatus({ kind: 'ok', msg: labels.resetDone })
    } catch (err) {
      setStatus({ kind: 'err', msg: `${labels.loadErr}: ${String((err as { message?: string })?.message || err)}` })
    } finally {
      setSaving(false)
    }
  }

  const dirty = text !== defaultPrompt

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-[15px]">{labels.title}</DialogTitle>
            {hasOverride && (
              <span className="rounded-full bg-[#C7AD96]/25 px-2 py-0.5 text-[11px] font-medium text-[#7A6450]">
                {labels.overridden}
              </span>
            )}
          </div>
          <DialogDescription className="text-[12px]">{labels.desc}</DialogDescription>
        </DialogHeader>

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
          />
        )}

        {status && (
          <p className={`text-[12px] ${status.kind === 'ok' ? 'text-[#3F7A5E]' : 'text-[#B4453A]'}`}>{status.msg}</p>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={handleReset} disabled={saving || loading || !dirty}>
            {labels.reset}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || loading}>
            {labels.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AgentPromptEditor
