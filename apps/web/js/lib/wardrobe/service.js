import { normalizeWardrobeItem } from './localRepository.js'

function mergeConfirmedItem(items, confirmedItem, existingIndex) {
    if (existingIndex >= 0) {
        return items.map((entry) => entry.id === confirmedItem.id ? confirmedItem : entry)
    }

    return [
        confirmedItem,
        ...items.filter((entry) => entry.id !== confirmedItem.id)
    ]
}

export function createWardrobeService({
    localRepository,
    remoteRepository,
    syncController,
    onStateChange = () => {}
}) {
    let pendingMutation = null

    function writeState(items, scope) {
        const nextItems = localRepository.write(items, scope)
        onStateChange(nextItems)
        return nextItems
    }

    function confirmMutation(extra = {}) {
        pendingMutation = null
        syncController.markSynced(extra)
    }

    function failWithRollback(response, previousItems, scope, extra = {}) {
        writeState(previousItems, scope)
        syncController.markFailed(response.message || response.error, extra)
    }

    return {
        hydrate(locale = 'en-US', nextScope = null) {
            const scope = localRepository.scope(nextScope)
            syncController.markLoading()
            return remoteRepository.fetch().then((remote) => {
                if (!remote.ok || !Array.isArray(remote.data?.items)) {
                    syncController.markStale(remote.message || remote.error)
                    return localRepository.read(locale, scope)
                }

                const nextItems = writeState(remote.data.items.map((item) => normalizeWardrobeItem(item)), scope)
                pendingMutation = null
                syncController.markSynced()
                return nextItems
            })
        },

        save(item, locale = 'en-US', nextScope = null) {
            const scope = localRepository.scope(nextScope)
            const items = localRepository.read(locale, scope)
            const nextItem = normalizeWardrobeItem({
                ...item,
                id: item.id || `wardrobe-${Date.now()}`
            })
            const existingIndex = items.findIndex((entry) => entry.id === nextItem.id)
            const nextItems = existingIndex >= 0
                ? items.map((entry) => entry.id === nextItem.id ? nextItem : entry)
                : [nextItem, ...items]

            writeState(nextItems, scope)
            pendingMutation = {
                kind: 'upsert',
                item: nextItem,
                locale,
                scope
            }
            syncController.markSyncing()

            const request = existingIndex >= 0
                ? remoteRepository.update(nextItem)
                : remoteRepository.create(nextItem)

            void request.then((response) => {
                if (!response.ok) {
                    syncController.markFailed(response.message || response.error, {
                        itemId: nextItem.id
                    })
                    return
                }

                const confirmedItem = normalizeWardrobeItem(response.data?.item || nextItem)
                const confirmedItems = mergeConfirmedItem(localRepository.read(locale, scope), confirmedItem, existingIndex)
                writeState(confirmedItems, scope)
                confirmMutation({
                    itemId: confirmedItem.id
                })
            })

            return nextItem
        },

        remove(id, locale = 'en-US', nextScope = null) {
            const scope = localRepository.scope(nextScope)
            const previousItems = localRepository.read(locale, scope)
            const nextItems = previousItems.filter((item) => item.id !== id)
            writeState(nextItems, scope)
            pendingMutation = {
                kind: 'delete',
                id,
                locale,
                previousItems,
                scope
            }
            syncController.markSyncing()
            void remoteRepository.remove(id).then((response) => {
                if (!response.ok) {
                    failWithRollback(response, previousItems, scope, {
                        itemId: id
                    })
                    return
                }

                confirmMutation({
                    itemId: id
                })
            })
            return nextItems
        },

        toggleFavorite(id, locale = 'en-US', nextScope = null) {
            const scope = localRepository.scope(nextScope)
            const previousItems = localRepository.read(locale, scope)
            const nextItems = previousItems.map((item) => item.id === id ? {
                ...item,
                favorite: !item.favorite
            } : item)

            writeState(nextItems, scope)
            const nextItem = nextItems.find((item) => item.id === id) || null
            if (nextItem) {
                pendingMutation = {
                    kind: 'toggle-favorite',
                    id,
                    locale,
                    previousItems,
                    scope
                }
                syncController.markSyncing()
                void remoteRepository.update(nextItem).then((response) => {
                    if (!response.ok) {
                        failWithRollback(response, previousItems, scope, {
                            itemId: id
                        })
                        return
                    }

                    confirmMutation({
                        itemId: id
                    })
                })
            }
            return nextItem
        },

        retry(locale = 'en-US') {
            if (!pendingMutation) {
                return this.hydrate(locale)
            }

            if (pendingMutation.kind === 'upsert') {
                return this.save(pendingMutation.item, pendingMutation.locale, pendingMutation.scope)
            }

            if (pendingMutation.kind === 'delete') {
                return this.remove(pendingMutation.id, pendingMutation.locale, pendingMutation.scope)
            }

            if (pendingMutation.kind === 'toggle-favorite') {
                return this.toggleFavorite(pendingMutation.id, pendingMutation.locale, pendingMutation.scope)
            }

            return this.hydrate(locale)
        }
    }
}
