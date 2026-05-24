import { getLocale, getUiCopy } from '../lib/locale.js'
import { renderStatePanel } from './statePanel.js'

export function renderLoadFailedPanel(message, fallback = null) {
    const locale = getLocale()
    const copy = getUiCopy(locale).states
    const safeMessage = String(message || '').trim()
    const description = safeMessage || copy.loadFailedDescription
    return renderStatePanel({
        kind: 'error',
        eyebrow: copy.loadFailedTitle,
        description: fallback ? `${description} ${fallback}`.trim() : description
    })
}
