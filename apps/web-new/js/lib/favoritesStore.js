import { requestLiteBackend } from './liteBackendClient.js'
import { createSyncController } from './syncState.js'
import { getCurrentUserScope, readUserScopedValue, writeUserScopedValue } from './userScopedStorage.js'

const FAVORITES_KEY = 'ct_favorites'
const favoritesListeners = new Set()
const favoritesSyncController = createSyncController()
let pendingFavoritesMutation = null

function normalizeType(type) {
    return type === 'posts' ? 'posts' : 'looks'
}

function readFavorites(scope = getCurrentUserScope()) {
    const parsed = readUserScopedValue(FAVORITES_KEY, () => ({}), scope)
    return {
        looks: Array.isArray(parsed.looks) ? parsed.looks : [],
        posts: Array.isArray(parsed.posts) ? parsed.posts : []
    }
}

function writeFavorites(favorites, scope = getCurrentUserScope()) {
    writeUserScopedValue(FAVORITES_KEY, favorites, scope)
    return favorites
}

function notifyFavoritesStore(favorites) {
    favoritesListeners.forEach((listener) => listener(favorites))
}

function normalizeItem(type, item) {
    return {
        type: normalizeType(type),
        id: item.id,
        title: item.title,
        subtitle: item.subtitle || '',
        image: item.image || '',
        href: item.href || '',
        savedAt: item.savedAt || Date.now()
    }
}

export function getFavorites() {
    return readFavorites()
}

export function getFavoritesByType(type) {
    return readFavorites()[normalizeType(type)]
}

export function getFavoriteIds(type) {
    return new Set(getFavoritesByType(type).map((item) => item.id))
}

export function isFavorite(type, id) {
    return getFavoritesByType(type).some((item) => item.id === id)
}

export function toggleFavorite(type, item) {
    const scope = getCurrentUserScope()
    const normalizedType = normalizeType(type)
    const favorites = readFavorites(scope)
    const previousFavorites = {
        looks: [...favorites.looks],
        posts: [...favorites.posts]
    }
    const currentItems = favorites[normalizedType]
    const existingIndex = currentItems.findIndex((entry) => entry.id === item.id)

    if (existingIndex >= 0) {
        favorites[normalizedType] = currentItems.filter((entry) => entry.id !== item.id)
        const nextFavorites = writeFavorites(favorites, scope)
        notifyFavoritesStore(nextFavorites)
        pendingFavoritesMutation = {
            kind: 'remove',
            type: normalizedType,
            id: item.id,
            locale: null,
            previousFavorites
        }
        favoritesSyncController.markSyncing()
        void requestLiteBackend(`/api/favorites/${normalizedType}/${item.id}`, {
            method: 'DELETE'
        }).then((response) => {
            if (!response.ok) {
                writeFavorites(previousFavorites, scope)
                notifyFavoritesStore(previousFavorites)
                favoritesSyncController.markFailed(response.message || response.error)
                return
            }
            pendingFavoritesMutation = null
            favoritesSyncController.markSynced()
        })

        return {
            isFavorite: false,
            favorites: nextFavorites
        }
    }

    favorites[normalizedType] = [
        normalizeItem(normalizedType, item),
        ...currentItems
    ]

    const nextFavorites = writeFavorites(favorites, scope)
    notifyFavoritesStore(nextFavorites)
    pendingFavoritesMutation = {
        kind: 'add',
        type: normalizedType,
        item: normalizeItem(normalizedType, item),
        locale: null,
        previousFavorites
    }
    favoritesSyncController.markSyncing()
    void requestLiteBackend('/api/favorites', {
        method: 'POST',
        payload: {
            type: normalizedType,
            item: normalizeItem(normalizedType, item)
        }
    }).then((response) => {
        if (!response.ok) {
            writeFavorites(previousFavorites, scope)
            notifyFavoritesStore(previousFavorites)
            favoritesSyncController.markFailed(response.message || response.error)
            return
        }
        pendingFavoritesMutation = null
        favoritesSyncController.markSynced()
    })

    return {
        isFavorite: true,
        favorites: nextFavorites
    }
}

export function removeFavorite(type, id) {
    const scope = getCurrentUserScope()
    const normalizedType = normalizeType(type)
    const favorites = readFavorites(scope)
    const previousFavorites = {
        looks: [...favorites.looks],
        posts: [...favorites.posts]
    }

    favorites[normalizedType] = favorites[normalizedType].filter((item) => item.id !== id)

    const nextFavorites = writeFavorites(favorites, scope)
    notifyFavoritesStore(nextFavorites)
    pendingFavoritesMutation = {
        kind: 'remove',
        type: normalizedType,
        id,
        locale: null,
        previousFavorites
    }
    favoritesSyncController.markSyncing()
    void requestLiteBackend(`/api/favorites/${normalizedType}/${id}`, {
        method: 'DELETE'
    }).then((response) => {
        if (!response.ok) {
            writeFavorites(previousFavorites, scope)
            notifyFavoritesStore(previousFavorites)
            favoritesSyncController.markFailed(response.message || response.error)
            return
        }
        pendingFavoritesMutation = null
        favoritesSyncController.markSynced()
    })
    return nextFavorites
}

export function getFavoritesStats() {
    const favorites = readFavorites()

    return {
        looks: favorites.looks.length,
        posts: favorites.posts.length,
        total: favorites.looks.length + favorites.posts.length
    }
}

export function subscribeFavoritesStore(listener) {
    favoritesListeners.add(listener)
    return () => {
        favoritesListeners.delete(listener)
    }
}

export async function hydrateFavorites() {
    const scope = getCurrentUserScope()
    favoritesSyncController.markLoading()
    const remote = await requestLiteBackend('/api/favorites')
    if (!remote.ok || !remote.data?.favorites) {
        favoritesSyncController.markStale(remote.message || remote.error)
        return readFavorites(scope)
    }

    const nextFavorites = {
        looks: Array.isArray(remote.data.favorites.looks) ? remote.data.favorites.looks : [],
        posts: Array.isArray(remote.data.favorites.posts) ? remote.data.favorites.posts : []
    }
    writeFavorites(nextFavorites, scope)
    notifyFavoritesStore(nextFavorites)
    favoritesSyncController.markSynced()
    return nextFavorites
}

export function getFavoritesSyncState() {
    return favoritesSyncController.getState()
}

export function subscribeFavoritesSyncState(listener) {
    return favoritesSyncController.subscribe(listener)
}

export function retryFavoritesSync() {
    if (!pendingFavoritesMutation) {
        return hydrateFavorites()
    }

    const scope = getCurrentUserScope()
    const mutation = pendingFavoritesMutation
    const previousFavorites = mutation.previousFavorites || readFavorites(scope)
    favoritesSyncController.markSyncing()

    if (mutation.kind === 'add') {
        const favorites = readFavorites(scope)
        const nextItems = [
            mutation.item,
            ...favorites[mutation.type].filter((entry) => entry.id !== mutation.item.id)
        ]
        const nextFavorites = writeFavorites({
            ...favorites,
            [mutation.type]: nextItems
        }, scope)
        notifyFavoritesStore(nextFavorites)

        return requestLiteBackend('/api/favorites', {
            method: 'POST',
            payload: {
                type: mutation.type,
                item: mutation.item
            }
        }).then((response) => {
            if (!response.ok) {
                writeFavorites(previousFavorites, scope)
                notifyFavoritesStore(previousFavorites)
                favoritesSyncController.markFailed(response.message || response.error)
                return readFavorites(scope)
            }
            pendingFavoritesMutation = null
            favoritesSyncController.markSynced()
            return readFavorites(scope)
        })
    }

    return requestLiteBackend(`/api/favorites/${mutation.type}/${mutation.id}`, {
        method: 'DELETE'
    }).then((response) => {
        if (!response.ok) {
            writeFavorites(previousFavorites, scope)
            notifyFavoritesStore(previousFavorites)
            favoritesSyncController.markFailed(response.message || response.error)
            return readFavorites(scope)
        }
        pendingFavoritesMutation = null
        favoritesSyncController.markSynced()
        return readFavorites(scope)
    })
}
