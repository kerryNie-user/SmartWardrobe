import {
    PANEL_IDS,
    buildTabState,
    createErrorSemantics,
    createHomeEmpty,
    createLoadingSemantics,
    createSyncSemantics
} from './shared.js'

export function createHomePageContract({
    activeTab,
    content,
    recommendationInput,
    homeView,
    syncStates = {}
}) {
    const tabs = buildTabState(activeTab, content.tabs, 'ct-home-tab', PANEL_IDS.home)
    const sync = createSyncSemantics(syncStates, ['favorites', 'wardrobe', 'schedule'])
    return {
        state: {
            tab: activeTab
        },
        derivedView: {
            tabs,
            activeTab,
            weather: homeView.weather,
            scheduleCard: homeView.scheduleCard,
            looks: homeView.looks,
            favoriteIds: recommendationInput.favorites.lookIds
        },
        actions: {
            switchTab: { type: 'ui', retryable: false },
            toggleLookFavorite: { type: 'domain', optimistic: true, retryable: true },
            openOutfitDetail: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: createHomeEmpty(homeView.looks),
        error: createErrorSemantics(sync),
        sync
    }
}
