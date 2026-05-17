import { createSyncController } from './syncState.js'
import { createWardrobeLocalRepository } from './wardrobe/localRepository.js'
import { createWardrobeRemoteRepository } from './wardrobe/remoteRepository.js'
import { createWardrobeService } from './wardrobe/service.js'

const wardrobeListeners = new Set()
const wardrobeSyncController = createSyncController()

function notifyWardrobeStore(items) {
    wardrobeListeners.forEach((listener) => listener(items))
}

const wardrobeLocalRepository = createWardrobeLocalRepository()
const wardrobeRemoteRepository = createWardrobeRemoteRepository()
const wardrobeService = createWardrobeService({
    localRepository: wardrobeLocalRepository,
    remoteRepository: wardrobeRemoteRepository,
    syncController: wardrobeSyncController,
    onStateChange: (items) => notifyWardrobeStore(items)
})

export function getWardrobeItems(locale = 'en-US') {
    return wardrobeLocalRepository.read(locale)
}

export function getWardrobeItemById(id, locale = 'en-US') {
    return getWardrobeItems(locale).find((item) => item.id === id) || null
}

export function saveWardrobeItem(item, locale = 'en-US') {
    return wardrobeService.save(item, locale)
}

export function deleteWardrobeItem(id, locale = 'en-US') {
    return wardrobeService.remove(id, locale)
}

export function toggleWardrobeFavorite(id, locale = 'en-US') {
    return wardrobeService.toggleFavorite(id, locale)
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
    return wardrobeService.hydrate(locale)
}

export function getWardrobeSyncState() {
    return wardrobeSyncController.getState()
}

export function subscribeWardrobeSyncState(listener) {
    return wardrobeSyncController.subscribe(listener)
}

export function retryWardrobeSync(locale = 'en-US') {
    return wardrobeService.retry(locale)
}
