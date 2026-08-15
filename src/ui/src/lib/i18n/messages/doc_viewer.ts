import type { UILanguage } from '@/lib/i18n/types'

export const docViewerMessages: Partial<Record<UILanguage, Record<string, string>>> = {
  'zh-CN': {
    word_document: 'Word 文档',
    excel_spreadsheet: 'Excel 表格',
    powerpoint_presentation: 'PowerPoint 演示文稿',
    open_document_text: 'OpenDocument 文本文档',
    open_document_spreadsheet: 'OpenDocument 表格',
    open_document_presentation: 'OpenDocument 演示文稿',
    document: '文档',
    preview_load_failed: '加载文档预览失败',
    preview_unavailable: '当前文档类型暂不支持预览',
    preview_loading: '正在加载文档预览...',
    download: '下载',
    download_document: '下载文档',
    help_text: '如需查看此文档，请先下载，再使用 Microsoft Office、LibreOffice 或其他兼容应用打开。',
  },
}
