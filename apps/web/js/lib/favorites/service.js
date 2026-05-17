export function normalizeFavoriteType(type) {
    return type === 'posts' ? 'posts' : 'looks'
}

export function normalizeFavoriteItem(type, item) {
    return {
        type: normalizeFavoriteType(type),
        id: item.id,
        title: item.title,
        subtitle: item.subtitle || '',
        image: item.image || '',
        href: item.href || '',
        savedAt: item.savedAt || Date.now()
    }
}

function cloneFavorites(favorites) {
    return {
        looks: [...favorites.looks],
        posts: [...favorites.posts]
    }
}

function normalizeRemoteFavorites(remote = {}) {
    return {
        looks: Array.isArray(remote.looks) ? remote.looks : [],
        posts: Array.isArray(remote.posts) ? remote.posts : []
    }
}

export function createFavoritesService({
    localRepository,
    remoteRepository,
    syncController,
    onStateChange = () => {}
}) {
    let pendingMutation = null

    function writeState(favorites, scope) {
        const nextFavorites = localRepository.write(favorites, scope)
        onStateChange(nextFavorites)
        return nextFavorites
    }

    function failAndRestore(response, previousFavorites, scope) {
        writeState(previousFavorites, scope)
        syncController.markFailed(response.message || response.error)
    }

    function confirmMutation() {
        pendingMutation = null
        syncController.markSynced()
    }

    return {
        hydrate() {
            const scope = localRepository.scope()
            syncController.markLoading()
            return remoteRepository.fetch().then((remote) => {
                if (!remote.ok || !remote.data?.favorites) {
                    syncController.markStale(remote.message || remote.error)
                    return localRepository.read(scope)
                }

                const nextFavorites = writeState(normalizeRemoteFavorites(remote.data.favorites), scope)
                pendingMutation = null
                syncController.markSynced()
                return nextFavorites
            })
        },

        toggle(type, item) {
            const scope = localRepository.scope()
            const normalizedType = normalizeFavoriteType(type)
            const favorites = localRepository.read(scope)
            const previousFavorites = cloneFavorites(favorites)
            const currentItems = favorites[normalizedType]
            const existingIndex = currentItems.findIndex((entry) => entry.id === item.id)

            if (existingIndex >= 0) {
                favorites[normalizedType] = currentItems.filter((entry) => entry.id !== item.id)
                const nextFavorites = writeState(favorites, scope)
                pendingMutation = {
                    kind: 'remove',
                    type: normalizedType,
                    id: item.id,
                    previousFavorites,
                    scope
                }
                syncController.markSyncing()
                void remoteRepository.remove(normalizedType, item.id).then((response) => {
                    if (!response.ok) {
                        failAndRestore(response, previousFavorites, scope)
                        return
                    }
                    confirmMutation()
                })

                return {
                    isFavorite: false,
                    favorites: nextFavorites
                }
            }

            const normalizedItem = normalizeFavoriteItem(normalizedType, item)
            favorites[normalizedType] = [
                normalizedItem,
                ...currentItems
            ]

            const nextFavorites = writeState(favorites, scope)
            pendingMutation = {
                kind: 'add',
                type: normalizedType,
                item: normalizedItem,
                previousFavorites,
                scope
            }
            syncController.markSyncing()
            void remoteRepository.add(normalizedType, normalizedItem).then((response) => {
                if (!response.ok) {
                    failAndRestore(response, previousFavorites, scope)
                    return
                }
                confirmMutation()
            })

            return {
                isFavorite: true,
                favorites: nextFavorites
            }
        },

        remove(type, id) {
            const scope = localRepository.scope()
            const normalizedType = normalizeFavoriteType(type)
            const favorites = localRepository.read(scope)
            const previousFavorites = cloneFavorites(favorites)

            favorites[normalizedType] = favorites[normalizedType].filter((item) => item.id !== id)

            const nextFavorites = writeState(favorites, scope)
            pendingMutation = {
                kind: 'remove',
                type: normalizedType,
                id,
                previousFavorites,
                scope
            }
            syncController.markSyncing()
            void remoteRepository.remove(normalizedType, id).then((response) => {
                if (!response.ok) {
                    failAndRestore(response, previousFavorites, scope)
                    return
                }
                confirmMutation()
            })
            return nextFavorites
        },

        retry() {
            if (!pendingMutation) {
                return this.hydrate()
            }

            const mutation = pendingMutation
            const scope = mutation.scope || localRepository.scope()
            const previousFavorites = mutation.previousFavorites || localRepository.read(scope)
            syncController.markSyncing()

            if (mutation.kind === 'add') {
                const favorites = localRepository.read(scope)
                const nextItems = [
                    mutation.item,
                    ...favorites[mutation.type].filter((entry) => entry.id !== mutation.item.id)
                ]
                writeState({
                    ...favorites,
                    [mutation.type]: nextItems
                }, scope)

                return remoteRepository.add(mutation.type, mutation.item).then((response) => {
                    if (!response.ok) {
                        failAndRestore(response, previousFavorites, scope)
                        return localRepository.read(scope)
                    }
                    confirmMutation()
                    return localRepository.read(scope)
                })
            }

            return remoteRepository.remove(mutation.type, mutation.id).then((response) => {
                if (!response.ok) {
                    failAndRestore(response, previousFavorites, scope)
                    return localRepository.read(scope)
                }
                confirmMutation()
                return localRepository.read(scope)
            })
        }
    }
}
