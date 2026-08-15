import type { UILanguage } from '@/lib/i18n/types'

export const codeViewerMessages: Partial<Record<UILanguage, Record<string, string>>> = {
  'zh-CN': {
    loading: '正在加载文件...',
    load_failed: '加载文件失败',
    retry: '重试',
    line_count: '{count} 行',
    rendered_view: '渲染视图',
    rendered_view_short: '渲染',
    source_view: '源码视图',
    source_view_short: '源码',
    toggle_line_numbers: '切换行号',
    toggle_word_wrap: '切换自动换行',
    copy_source: '复制源码',
    html_render_hint: '此预览在沙箱中渲染。切换到“源码”可查看或复制 HTML。',
    html_render_frame_title: '{name} 的渲染预览',
  },
}
