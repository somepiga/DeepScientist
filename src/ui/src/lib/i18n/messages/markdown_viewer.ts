import type { UILanguage } from '@/lib/i18n/types'

export const markdownViewerMessages: Partial<Record<UILanguage, Record<string, string>>> = {
  'zh-CN': {
    loading: '正在加载 Markdown...',
    load_failed: '加载文件失败',
    retry: '重试',
    rendered_view: '渲染视图',
    source_view: '源码视图',
    copy_source: '复制源码',
    demo_title: 'DeepScientist Markdown 查看器',
    demo_intro:
      '欢迎使用 **Markdown 查看器** 插件。该查看器支持 [GitHub Flavored Markdown](https://github.github.com/gfm/) 及更多增强能力。',
  },
}
