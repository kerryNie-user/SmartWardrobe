import {
    PANEL_IDS,
    buildTabState,
    createCollectionEmpty,
    createErrorSemantics,
    createLoadingSemantics,
    createSyncSemantics
} from './shared.js'

export function createFavoritesPageContract({
    activeTab,
    content,
    stats,
    items,
    syncStates = {}
}) {
    const tabs = buildTabState(activeTab, content.tabs, 'ct-favorites-tab', PANEL_IDS.favorites)
    const sync = createSyncSemantics(syncStates, ['favorites'])
    return {
        state: {
            tab: activeTab
        },
        derivedView: {
            tabs,
            summaryMetrics: [
                { label: content.metrics.total, value: String(stats.total).padStart(2, '0') },
                { label: content.metrics.current, value: String(items.length).padStart(2, '0') }
            ],
            items,
            emptyCopy: content.empty[activeTab]
        },
        actions: {
            switchTab: { type: 'ui', retryable: false },
            removeFavorite: { type: 'domain', optimistic: true, rollback: true, retryable: true },
            openFavoriteItem: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: createCollectionEmpty(items, activeTab),
        error: createErrorSemantics(sync),
        sync
    }
}
