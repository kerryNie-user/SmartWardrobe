import {
    createErrorSemantics,
    createLoadingSemantics,
    createStaticEmpty,
    createSyncSemantics
} from './shared.js'
import { getUiCopy } from '../locale.js'

export function createProfilePageContract({
    content,
    profile,
    favorites,
    wardrobe,
    syncStates = {}
}) {
    const previewItems = [...favorites.items].slice(0, 3)
    const sync = createSyncSemantics(syncStates, ['profile', 'favorites', 'wardrobe'])

    return {
        state: {},
        derivedView: {
            summary: {
                content,
                profile,
                favoritesTotal: favorites.stats.total,
                wardrobeCount: wardrobe.count
            },
            previewItems
        },
        actions: {
            openEditProfile: { type: 'navigation', retryable: false },
            openFavorites: { type: 'navigation', retryable: false },
            openWardrobe: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: {
            kind: previewItems.length ? 'notApplicable' : 'noData',
            active: !previewItems.length
        },
        error: createErrorSemantics(sync),
        sync
    }
}

export function createProfileEditPageContract({
    locale,
    content,
    profile,
    status = '',
    syncStates = {}
}) {
    const sync = createSyncSemantics(syncStates, ['profile'])
    const copy = getUiCopy(locale)
    return {
        state: {
            status
        },
        derivedView: {
            content,
            profile,
            status,
            topbar: {
                leftLabel: copy.topbar.backToProfile,
                leftHref: 'profile.html',
                rightLabel: content.topbar?.rightLabel || ''
            }
        },
        actions: {
            restoreProfile: { type: 'ui', retryable: false },
            saveProfile: { type: 'domain', optimistic: true, retryable: true },
            backToProfile: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: createStaticEmpty(false),
        error: createErrorSemantics(sync),
        sync
    }
}
