import { getWardrobeContent } from '../data/wardrobe.js'
import { requestBackend } from './backendClient.js'
import { createSyncController } from './syncState.js'
import { getCurrentUserScope, readUserScopedValue, writeUserScopedValue } from './userScopedStorage.js'

const WARDROBE_KEY = 'ct_wardrobe'
const wardrobeListeners = new Set()
const wardrobeSyncController = createSyncController()
let pendingWardrobeMutation = null

function normalizeWardrobeItem(item) {
    return {
        favorite: false,
        image: '',
        ...item
    }
}

function notifyWardrobeStore(items) {
    wardrobeListeners.forEach((listener) => listener(items))
}

function createSeed(locale) {
    return getWardrobeContent(locale).items.map((item) => normalizeWardrobeItem({ ...item }))
}

function createWardrobeScope(storage = window.localStorage) {
    return getCurrentUserScope(storage)
}

function readWardrobeItems(locale, scope) {
    const stored = readUserScopedValue(WARDROBE_KEY, () => null, scope)
    if (Array.isArray(stored)) {
        return stored.map((item) => normalizeWardrobeItem(item))
    }

    const seed = createSeed(locale)
    writeUserScopedValue(WARDROBE_KEY, seed, scope)
    return seed
}

export function getWardrobeItems(locale = 'en-US') {
    return readWardrobeItems(locale, createWardrobeScope())
}

export function getWardrobeItemById(id, locale = 'en-US') {
    return getWardrobeItems(locale).find((item) => item.id === id) || null
}

export function saveWardrobeItem(item, locale = 'en-US') {
    const scope = createWardrobeScope()
    const items = readWardrobeItems(locale, scope)
    const nextItem = normalizeWardrobeItem({
        ...item,
        id: item.id || `wardrobe-${Date.now()}`
    })
    const existingIndex = items.findIndex((entry) => entry.id === nextItem.id)
    const nextItems = existingIndex >= 0
        ? items.map((entry) => entry.id === nextItem.id ? nextItem : entry)
        : [nextItem, ...items]

    writeUserScopedValue(WARDROBE_KEY, nextItems, scope)
    notifyWardrobeStore(nextItems)
    pendingWardrobeMutation = {
        kind: 'upsert',
        item: nextItem,
        locale
    }
    wardrobeSyncController.markSyncing()
    void requestBackend(existingIndex >= 0 ? `/api/wardrobe/${nextItem.id}` : '/api/wardrobe', {
        method: existingIndex >= 0 ? 'PUT' : 'POST',
        payload: {
            item: nextItem
        }
    }).then((response) => {
        if (!response.ok) {
            wardrobeSyncController.markFailed(response.message || response.error, {
                itemId: nextItem.id
            })
            return
        }
        const confirmedItem = normalizeWardrobeItem(response.data?.item || nextItem)
        const confirmedItems = existingIndex >= 0
            ? readWardrobeItems(locale, scope).map((entry) => entry.id === confirmedItem.id ? confirmedItem : entry)
            : [confirmedItem, ...readWardrobeItems(locale, scope).filter((entry) => entry.id !== confirmedItem.id)]
        writeUserScopedValue(WARDROBE_KEY, confirmedItems, scope)
        notifyWardrobeStore(confirmedItems)
        pendingWardrobeMutation = null
        wardrobeSyncController.markSynced({
            itemId: confirmedItem.id
        })
    })
    return nextItem
}

export function deleteWardrobeItem(id, locale = 'en-US') {
    const scope = createWardrobeScope()
    const previousItems = readWardrobeItems(locale, scope)
    const nextItems = previousItems.filter((item) => item.id !== id)
    writeUserScopedValue(WARDROBE_KEY, nextItems, scope)
    notifyWardrobeStore(nextItems)
    pendingWardrobeMutation = {
        kind: 'delete',
        id,
        locale
    }
    wardrobeSyncController.markSyncing()
    void requestBackend(`/api/wardrobe/${id}`, {
        method: 'DELETE'
    }).then((response) => {
        if (!response.ok) {
            writeUserScopedValue(WARDROBE_KEY, previousItems, scope)
            notifyWardrobeStore(previousItems)
            wardrobeSyncController.markFailed(response.message || response.error, {
                itemId: id
            })
            return
        }
        pendingWardrobeMutation = null
        wardrobeSyncController.markSynced({
            itemId: id
        })
    })
    return nextItems
}

export function toggleWardrobeFavorite(id, locale = 'en-US') {
    const scope = createWardrobeScope()
    const items = readWardrobeItems(locale, scope)
    const previousItems = items
    const nextItems = items.map((item) => item.id === id ? {
        ...item,
        favorite: !item.favorite
    } : item)

    writeUserScopedValue(WARDROBE_KEY, nextItems, scope)
    notifyWardrobeStore(nextItems)
    const nextItem = nextItems.find((item) => item.id === id) || null
    if (nextItem) {
        pendingWardrobeMutation = {
            kind: 'toggle-favorite',
            id,
            locale
        }
        wardrobeSyncController.markSyncing()
        void requestBackend(`/api/wardrobe/${id}`, {
            method: 'PUT',
            payload: {
                item: nextItem
            }
        }).then((response) => {
            if (!response.ok) {
                writeUserScopedValue(WARDROBE_KEY, previousItems, scope)
                notifyWardrobeStore(previousItems)
                wardrobeSyncController.markFailed(response.message || response.error, {
                    itemId: id
                })
                return
            }
            pendingWardrobeMutation = null
            wardrobeSyncController.markSynced({
                itemId: id
            })
        })
    }
    return nextItem
}

export function getWardrobeCount(locale = 'en-US') {
    return getWardrobeItems(locale).length
}


export function getRecentWardrobeItems(limit = 3, locale = 'en-US') {
    return getWardrobeItems(locale).slice(0, limit)
}

export function subscribeWardrobeStore(listener) {
    wardrobeListeners.add(listener)
    return () => {
        wardrobeListeners.delete(listener)
    }
}

export async function hydrateWardrobe(locale = 'en-US') {
    const scope = createWardrobeScope()
    wardrobeSyncController.markLoading()
    const remote = await requestBackend('/api/wardrobe')
    if (!remote.ok || !Array.isArray(remote.data?.items)) {
        wardrobeSyncController.markStale(remote.message || remote.error)
        return readWardrobeItems(locale, scope)
    }

    const nextItems = remote.data.items.map((item) => normalizeWardrobeItem(item))
    writeUserScopedValue(WARDROBE_KEY, nextItems, scope)
    notifyWardrobeStore(nextItems)
    pendingWardrobeMutation = null
    wardrobeSyncController.markSynced()
    return nextItems
}

export function getWardrobeSyncState() {
    return wardrobeSyncController.getState()
}

export function subscribeWardrobeSyncState(listener) {
    return wardrobeSyncController.subscribe(listener)
}

export function retryWardrobeSync(locale = 'en-US') {
    if (!pendingWardrobeMutation) {
        return hydrateWardrobe(locale)
    }

    if (pendingWardrobeMutation.kind === 'upsert') {
        return saveWardrobeItem(pendingWardrobeMutation.item, pendingWardrobeMutation.locale)
    }

    if (pendingWardrobeMutation.kind === 'delete') {
        return deleteWardrobeItem(pendingWardrobeMutation.id, pendingWardrobeMutation.locale)
    }

    if (pendingWardrobeMutation.kind === 'toggle-favorite') {
        return toggleWardrobeFavorite(pendingWardrobeMutation.id, pendingWardrobeMutation.locale)
    }

    return hydrateWardrobe(locale)
}
