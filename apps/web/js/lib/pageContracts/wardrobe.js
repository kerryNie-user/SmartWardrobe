import {
    PANEL_IDS,
    buildTabState,
    createCollectionEmpty,
    createErrorSemantics,
    createLoadingSemantics,
    createStaticEmpty,
    createSyncSemantics
} from './shared.js'

export function createWardrobePageContract({
    activeTab,
    query,
    isFormOpen,
    content,
    items,
    searchedItems,
    syncStates = {}
}) {
    const tabs = buildTabState(activeTab, content.tabs, 'ct-wardrobe-tab', PANEL_IDS.wardrobe)
    const visibleItems = activeTab === 'all'
        ? searchedItems
        : searchedItems.filter((item) => item.filter === activeTab)
    const sync = createSyncSemantics(syncStates, ['wardrobe'])
    return {
        state: {
            tab: activeTab,
            query,
            isFormOpen
        },
        derivedView: {
            hero: content.hero,
            tabs,
            archiveItems: visibleItems,
            totalItems: items.length,
            query
        },
        actions: {
            switchTab: { type: 'ui', retryable: false },
            setQuery: { type: 'ui', retryable: false },
            saveWardrobeItem: { type: 'domain', optimistic: true, retryable: true },
            deleteWardrobeItem: { type: 'domain', optimistic: true, rollback: true, retryable: true },
            toggleWardrobeFavorite: { type: 'domain', optimistic: true, rollback: true, retryable: true }
        },
        loading: createLoadingSemantics(sync),
        empty: createCollectionEmpty(visibleItems, activeTab, query),
        error: createErrorSemantics(sync),
        sync
    }
}

export function createWardrobeItemPageContract({
    locale,
    itemId,
    imagePreview = '',
    content,
    item,
    pageCopy,
    submitLabel,
    syncStates = {}
}) {
    const sync = createSyncSemantics(syncStates, ['wardrobe'])
    return {
        state: {
            itemId,
            isEditing: Boolean(itemId),
            imagePreview
        },
        derivedView: {
            item,
            pageCopy,
            tabs: content.tabs,
            form: content.form,
            submitLabel,
            topbar: {
                leftLabel: locale === 'zh-CN' ? '返回衣橱' : 'Back to wardrobe',
                leftHref: 'wardrobe.html',
                rightLabel: locale === 'zh-CN' ? '打开个人资料' : 'Open profile',
                rightHref: 'profile.html'
            }
        },
        actions: {
            previewUpload: { type: 'ui', retryable: false },
            saveWardrobeItem: { type: 'domain', optimistic: true, retryable: true },
            backToWardrobe: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: createStaticEmpty(false),
        error: createErrorSemantics(sync),
        sync
    }
}

export function createWardrobeDetailPageContract({
    locale,
    itemId,
    item,
    syncStates = {}
}) {
    const sync = createSyncSemantics(syncStates, ['wardrobe'])
    return {
        state: {
            itemId
        },
        derivedView: {
            item,
            topbar: {
                leftLabel: locale === 'zh-CN' ? '返回衣橱' : 'Back to wardrobe',
                leftHref: 'wardrobe.html',
                rightLabel: locale === 'zh-CN' ? '打开个人资料' : 'Open profile',
                rightHref: 'profile.html'
            },
            missingState: item ? null : {
                kind: 'error',
                eyebrow: locale === 'zh-CN' ? '单品不存在' : 'Missing Item',
                title: locale === 'zh-CN' ? '这件单品暂时不可用' : 'This wardrobe item is unavailable',
                description: locale === 'zh-CN' ? '请返回衣橱重新选择单品。' : 'Return to wardrobe and choose another item.',
                action: {
                    label: locale === 'zh-CN' ? '返回衣橱' : 'Back to wardrobe',
                    href: 'wardrobe.html'
                }
            }
        },
        actions: {
            openEditItem: { type: 'navigation', retryable: false },
            backToWardrobe: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: createStaticEmpty(!item, 'noData'),
        error: createErrorSemantics(sync),
        sync
    }
}
