import { createSyncController } from './syncState.js'
import { createFavoritesLocalRepository } from './favorites/localRepository.js'
import { createFavoritesRemoteRepository } from './favorites/remoteRepository.js'
import { createFavoritesService, normalizeFavoriteType } from './favorites/service.js'

const favoritesListeners = new Set()
const favoritesSyncController = createSyncController()

function notifyFavoritesStore(favorites) {
    favoritesListeners.forEach((listener) => listener(favorites))
}

const favoritesLocalRepository = createFavoritesLocalRepository()
const favoritesRemoteRepository = createFavoritesRemoteRepository()
const favoritesService = createFavoritesService({
    localRepository: favoritesLocalRepository,
    remoteRepository: favoritesRemoteRepository,
    syncController: favoritesSyncController,
    onStateChange: (favorites) => notifyFavoritesStore(favorites)
})

export function getFavorites() {
    return favoritesLocalRepository.read()
}

export function getFavoritesByType(type) {
    return getFavorites()[normalizeFavoriteType(type)]
}

export function getFavoriteIds(type) {
    return new Set(getFavoritesByType(type).map((item) => item.id))
}

export function isFavorite(type, id) {
    return getFavoritesByType(type).some((item) => item.id === id)
}

export function toggleFavorite(type, item) {
    return favoritesService.toggle(type, item)
}

export function removeFavorite(type, id) {
    return favoritesService.remove(type, id)
}

export function getFavoritesStats() {
    const favorites = getFavorites()

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
    return favoritesService.hydrate()
}

export function getFavoritesSyncState() {
    return favoritesSyncController.getState()
}

export function subscribeFavoritesSyncState(listener) {
    return favoritesSyncController.subscribe(listener)
}

export function retryFavoritesSync() {
    return favoritesService.retry()
}
