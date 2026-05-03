import { getLocale } from '../lib/locale.js'
import { renderStatePanel } from './statePanel.js'

export function renderLoadFailedPanel(message, fallback = null) {
    const locale = getLocale()
    const safeMessage = String(message || '').trim()
    const description = safeMessage || (locale === 'zh-CN' ? '加载失败，请稍后重试。' : 'Failed to load. Please try again.')
    return renderStatePanel({
        kind: 'error',
        eyebrow: locale === 'zh-CN' ? '加载失败' : 'Load Failed',
        description: fallback ? `${description} ${fallback}`.trim() : description
    })
}

