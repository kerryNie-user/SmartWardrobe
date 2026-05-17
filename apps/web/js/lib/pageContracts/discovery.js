import {
    PANEL_IDS,
    createCollectionEmpty,
    createErrorSemantics,
    createLoadingSemantics,
    createStaticEmpty,
    createSyncSemantics
} from './shared.js'

export function createDiscoveryPageContract({
    content,
    query,
    trendStrip,
    feed,
    shareFeedbackPostId = '',
    syncStates = {}
}) {
    const sync = createSyncSemantics(syncStates, ['discoveryView', 'discoverySocial'])
    const items = Array.isArray(feed?.items) ? feed.items : []
    return {
        state: {
            query,
            shareFeedbackPostId
        },
        derivedView: {
            topbar: {
                rightHref: 'profile.html'
            },
            query,
            search: {
                placeholder: content.searchPlaceholder?.editorials || '',
                value: query
            },
            trendStrip,
            panel: {
                id: PANEL_IDS.discovery
            },
            feed: {
                kind: feed?.kind || (items.length ? 'ready' : 'empty'),
                items
            }
        },
        actions: {
            setQuery: { type: 'ui', retryable: false },
            togglePostLike: { type: 'domain', optimistic: true, retryable: true },
            togglePostSave: { type: 'domain', optimistic: true, retryable: true },
            sharePost: { type: 'ui', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: items.length
            ? createStaticEmpty(false, 'notApplicable')
            : createCollectionEmpty([], 'all', query),
        error: createErrorSemantics(sync),
        sync
    }
}
