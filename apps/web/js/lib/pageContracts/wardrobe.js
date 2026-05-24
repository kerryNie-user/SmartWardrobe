import {
    PANEL_IDS,
    buildTabState,
    createCollectionEmpty,
    createErrorSemantics,
    createLoadingSemantics,
    createStaticEmpty,
    createSyncSemantics
} from './shared.js'
import { getUiCopy } from '../locale.js'

export function createWardrobePageContract({
    activeTab,
    query,
    content,
    items,
    searchedItems,
    syncStates = {}
}) {
    const tabs = buildTabState(activeTab, content.tabs, 'ct-wardrobe-tab', PANEL_IDS.wardrobe)
    const visibleItems = searchedItems
    const sync = createSyncSemantics(syncStates, ['wardrobe'])
    return {
        state: {
            tab: activeTab,
            query
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
    const copy = getUiCopy(locale)
    return {
        state: {
            itemId,
            isEditing: Boolean(itemId),
            imagePreview
        },
        derivedView: {
            item,
            pageCopy,
            form: content.form,
            submitLabel,
            topbar: {
                leftLabel: copy.topbar.backToWardrobe,
                leftHref: 'wardrobe.html',
                rightLabel: copy.topbar.openProfile,
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
    const copy = getUiCopy(locale)
    return {
        state: {
            itemId
        },
        derivedView: {
            item,
            topbar: {
                leftLabel: copy.topbar.backToWardrobe,
                leftHref: 'wardrobe.html',
                rightLabel: copy.topbar.openProfile,
                rightHref: 'profile.html'
            },
            missingState: item ? null : {
                kind: 'error',
                eyebrow: copy.wardrobe.detailMissing.eyebrow,
                title: copy.wardrobe.detailMissing.title,
                description: copy.wardrobe.detailMissing.description,
                action: {
                    label: copy.topbar.backToWardrobe,
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
