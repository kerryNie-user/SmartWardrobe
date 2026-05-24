import { renderTopbar } from '../components/topbar.js'
import { renderStatePanel } from '../components/statePanel.js'
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js'
import { renderWardrobeDetailPanel } from '../components/wardrobeDetailPanel.js'
import { applyLocaleDocument, getLocale } from '../lib/locale.js'
import { bindPageStores } from '../lib/pageStoreBinding.js'
import { createWardrobeDetailPageContract } from '../lib/pageContracts.js'
import { getQueryParam } from '../lib/navigationAdapter.js'
import { getWardrobeItemById, getWardrobeSyncState, hydrateWardrobe, retryWardrobeSync, subscribeWardrobeStore, subscribeWardrobeSyncState } from '../lib/wardrobeStore.js'

function getItemId() {
    return getQueryParam('id')
}

export function renderWardrobeDetailPage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]')
    const detailRoot = document.querySelector('[data-ct-wardrobe-detail-shell]')
    const syncFeedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'wardrobe-detail')
    const itemId = getItemId()
    const paint = () => {
        const locale = getLocale()
        const item = getWardrobeItemById(itemId, locale)
        const contract = createWardrobeDetailPageContract({
            locale,
            itemId,
            item,
            syncStates: {
                wardrobe: getWardrobeSyncState()
            }
        })

        applyLocaleDocument('wardrobeDetail', locale)

        if (topbarRoot) {
            topbarRoot.innerHTML = renderTopbar({
                leftLabel: contract.derivedView.topbar.leftLabel,
                leftIcon: '←',
                leftHref: contract.derivedView.topbar.leftHref,
                rightLabel: contract.derivedView.topbar.rightLabel,
                rightIcon: '◐',
                rightHref: contract.derivedView.topbar.rightHref
            })
        }

        if (!detailRoot) return

        detailRoot.innerHTML = contract.derivedView.item
            ? renderWardrobeDetailPanel(contract.derivedView.item, locale)
            : renderStatePanel(contract.derivedView.missingState)
    }

    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeWardrobeStore(listener)
        ],
        hydrators: [
            () => hydrateWardrobe(getLocale())
        ],
        syncFeedback: {
            root: syncFeedbackRoot,
            locale: () => getLocale(),
            bindings: [
                {
                    key: 'wardrobe',
                    domainKey: 'wardrobe',
                    getState: () => getWardrobeSyncState(),
                    subscribe: (listener) => subscribeWardrobeSyncState(listener),
                    retry: (locale) => retryWardrobeSync(locale)
                }
            ]
        }
    })

    return binding
}
