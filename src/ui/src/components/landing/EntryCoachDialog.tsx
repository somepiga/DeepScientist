import { ArrowRight, Settings2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ConnectorCoachMode = 'no_enabled' | 'no_target' | 'recommended'

const COPY = {
  zh: {
    title: '开始之前',
    subtitle: '在第一次真实运行前，先配置一个外部连接器用于里程碑投递。',
    connector: {
      eyebrow: '步骤 1',
      title: '先绑定一个连接器',
      body: {
        no_enabled:
          '你现在还没有启用任何外部连接器。建议先配置一个，这样研究过程中的里程碑、回复和进展可以直接发送到网页之外。',
        no_target:
          '你已经启用了连接器，但还没有可选择的投递目标。建议先进入连接器设置页检查配置，或者先在对应连接器中发一条消息，再回来继续。',
        recommended:
          '建议先确认一个默认连接器目标。这样之后"开始研究"和项目运行中的进展都可以直接同步出去。',
      },
      cta: {
        no_enabled: '前往连接器设置',
        no_target: '检查连接器设置',
        recommended: '绑定连接器',
      },
      note:
        '只要还没有绑定外部连接器，这个提醒在进入首页时就会继续出现，方便你在第一次真实运行前先完成投递配置。',
    },
    close: '关闭',
  },
} as const

export function EntryCoachDialog({
  open,
  connectorMode,
  showConnectorStep,
  onClose,
  onOpenConnectorSettings,
}: {
  open: boolean
  connectorMode: ConnectorCoachMode
  showConnectorStep: boolean
  onClose: () => void
  onOpenConnectorSettings: () => void
}) {
  if (!open) {
    return null
  }

  const t = COPY.zh

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[10010] flex items-center justify-center bg-[rgba(12,14,18,0.48)] p-4 backdrop-blur-md"
    >
      <div
        className="pointer-events-auto relative w-full max-w-[980px] overflow-hidden rounded-[32px] border border-white/10 bg-[rgba(252,248,242,0.98)] shadow-[0_40px_120px_-52px_rgba(15,23,42,0.62)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/[0.06] px-6 py-5">
          <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[rgba(126,108,82,0.72)]">
                快速开始
              </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[rgba(38,36,33,0.96)]">
              {t.title}
            </h2>
            <div className="mt-2 max-w-2xl text-sm text-[rgba(86,82,77,0.86)]">
              <div className="leading-7">{t.subtitle}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[rgba(107,103,97,0.82)] transition hover:bg-black/[0.04] hover:text-[rgba(38,36,33,0.96)]"
              aria-label={t.close}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-0 grid-cols-1">
          {showConnectorStep ? (
            <section className="relative overflow-hidden bg-[#23262D] px-6 py-6 text-white lg:px-7 lg:py-7">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(199,173,150,0.16),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(95,117,138,0.18),transparent_44%)]" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/74">
                  <Settings2 className="h-3.5 w-3.5" />
                  {t.connector.eyebrow}
                </div>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight">
                  {t.connector.title}
                </h3>
                <div className="mt-3 text-sm text-white/82">
                  <div className="leading-7">{t.connector.body[connectorMode]}</div>
                </div>
                <Button
                  type="button"
                  onClick={onOpenConnectorSettings}
                  className="mt-6 h-12 rounded-full bg-[#121419] px-6 text-sm font-semibold text-white shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)] transition hover:bg-black"
                >
                  {t.connector.cta[connectorMode]}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <div className="mt-4 text-[12px] text-white/60">
                  <div className="leading-6">{t.connector.note}</div>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default EntryCoachDialog
