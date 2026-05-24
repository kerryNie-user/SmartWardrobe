import { renderTopbar } from '../components/topbar.js'
import { renderSecondaryTabs } from '../components/secondaryTabs.js'
import { renderBottomNav } from '../components/bottomNav.js'
import { renderFavoritesSummary } from '../components/favoritesSummary.js'
import { renderFavoritesCollection } from '../components/favoritesCollection.js'
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js'
import { getFavoritesPageContent } from '../data/favorites.js'
import { applyLocaleDocument, getLocale, getSharedCopy } from '../lib/locale.js'
import { bindPageStores } from '../lib/pageStoreBinding.js'
import { createFavoritesPageContract } from '../lib/pageContracts.js'
import { getFavoritesByType, getFavoritesStats, getFavoritesSyncState, hydrateFavorites, removeFavorite, retryFavoritesSync, subscribeFavoritesStore, subscribeFavoritesSyncState } from '../lib/favoritesStore.js'
import { hydrateSettings, subscribeSettingsStore } from '../lib/settingsStore.js'

export function renderFavoritesPage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]')
    const syncFeedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'favorites')
    const summaryRoot = document.querySelector('[data-ct-favorites-summary]')
    const tabsRoot = document.querySelector('[data-ct-favorites-tabs]')
    const collectionRoot = document.querySelector('[data-ct-favorites-collection]')
    const bottomNavRoot = document.querySelector('[data-ct-bottom-nav]')

    let activeTab = 'looks'

    const paint = () => {
        const locale = getLocale()
        const content = getFavoritesPageContent(locale)
        const stats = getFavoritesStats()
        const items = getFavoritesByType(activeTab)
        const contract = createFavoritesPageContract({
            locale,
            activeTab,
            content,
            stats,
            items,
            syncStates: {
                favorites: getFavoritesSyncState()
            }
        })
        const activeTabState = contract.derivedView.tabs.find((tab) => tab.active) || contract.derivedView.tabs[0]

        applyLocaleDocument('favorites', locale)
        if (topbarRoot) {
            topbarRoot.innerHTML = renderTopbar({
                leftLabel: content.topbar.leftLabel,
                leftIcon: '←',
                leftHref: 'me.html',
                rightLabel: content.topbar.rightLabel,
                rightIcon: '◐',
                rightHref: 'profile.html'
            })
        }
        if (bottomNavRoot) {
            bottomNavRoot.innerHTML = renderBottomNav('me')
        }

        if (summaryRoot) {
            summaryRoot.innerHTML = renderFavoritesSummary(content.summary, [
                ...contract.derivedView.summaryMetrics
            ])
        }

        if (tabsRoot) {
            tabsRoot.innerHTML = renderSecondaryTabs(contract.derivedView.tabs, getSharedCopy(locale).tabs.favorites)
        }

        if (collectionRoot) {
            collectionRoot.id = activeTabState.panelId
            collectionRoot.setAttribute('role', 'tabpanel')
            collectionRoot.setAttribute('aria-labelledby', activeTabState.tabId)
            collectionRoot.innerHTML = renderFavoritesCollection(contract.derivedView.items, contract.derivedView.emptyCopy, getFavoritesSyncState())
        }
    }

    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeFavoritesStore(listener),
            (listener) => subscribeSettingsStore(listener),
            (listener) => subscribeFavoritesSyncState(listener)
        ],
        hydrators: [
            () => hydrateFavorites(),
            () => hydrateSettings()
        ],
        syncFeedback: {
            root: syncFeedbackRoot,
            locale: () => getLocale(),
            bindings: [
                {
                    key: 'favorites',
                    domainKey: 'favorites',
                    getState: () => getFavoritesSyncState(),
                    subscribe: (listener) => subscribeFavoritesSyncState(listener),
                    retry: () => retryFavoritesSync()
                }
            ]
        }
    })

    if (tabsRoot) {
        tabsRoot.addEventListener('click', (event) => {
            const target = event.target.closest('[data-tab-key]')
            if (!target) return

            activeTab = target.getAttribute('data-tab-key') || 'looks'
            binding.paintNow()
        })
    }

    if (collectionRoot) {
        collectionRoot.addEventListener('click', (event) => {
            const target = event.target.closest('[data-ct-remove-favorite]')
            if (!target) return

            removeFavorite(activeTab, target.getAttribute('data-ct-remove-favorite'))
            binding.paintNow()
        })
    }

    return binding
}
