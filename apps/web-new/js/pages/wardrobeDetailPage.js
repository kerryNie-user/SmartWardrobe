import { renderTopbar } from '../components/topbar.js'
import { renderStatePanel } from '../components/statePanel.js'
import { renderWardrobeDetailPanel } from '../components/wardrobeDetailPanel.js'
import { applyLocaleDocument, getLocale } from '../lib/locale.js'
import { getQueryParam } from '../lib/navigationAdapter.js'
import { getWardrobeItemById, hydrateWardrobe } from '../lib/wardrobeStore.js'

function getItemId() {
    return getQueryParam('id')
}

export function renderWardrobeDetailPage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]')
    const detailRoot = document.querySelector('[data-ct-wardrobe-detail-shell]')
    const locale = getLocale()
    const itemId = getItemId()
    const paint = () => {
        const item = getWardrobeItemById(itemId, locale)

        applyLocaleDocument('wardrobeDetail', locale)

        if (topbarRoot) {
            topbarRoot.innerHTML = renderTopbar({
                leftLabel: locale === 'zh-CN' ? '返回衣橱' : 'Back to wardrobe',
                leftIcon: '←',
                leftHref: 'wardrobe.html',
                rightLabel: locale === 'zh-CN' ? '打开个人资料' : 'Open profile',
                rightIcon: '◐',
                rightHref: 'profile.html'
            })
        }

        if (!detailRoot) return

        detailRoot.innerHTML = item
            ? renderWardrobeDetailPanel(item, locale)
            : renderStatePanel({
                kind: 'error',
                eyebrow: locale === 'zh-CN' ? '单品不存在' : 'Missing Item',
                title: locale === 'zh-CN' ? '这件单品暂时不可用' : 'This wardrobe item is unavailable',
                description: locale === 'zh-CN' ? '请返回衣橱重新选择单品。' : 'Return to wardrobe and choose another item.',
                action: {
                    label: locale === 'zh-CN' ? '返回衣橱' : 'Back to wardrobe',
                    href: 'wardrobe.html'
                }
            })
    }

    paint()
    void hydrateWardrobe(locale).then(() => {
        paint()
    })
}
