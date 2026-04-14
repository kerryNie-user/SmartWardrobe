function createSnapshot(status, extras = {}) {
    return {
        status,
        stale: false,
        error: null,
        conflict: null,
        lastSyncedAt: null,
        lastAttemptAt: null,
        ...extras
    }
}

export function createSyncController() {
    let state = createSnapshot('idle')
    const listeners = new Set()

    function notify() {
        listeners.forEach((listener) => listener(state))
    }

    function setState(nextState) {
        state = nextState
        notify()
        return state
    }

    return {
        getState() {
            return state
        },
        subscribe(listener) {
            listeners.add(listener)
            return () => {
                listeners.delete(listener)
            }
        },
        markIdle() {
            return setState(createSnapshot('idle'))
        },
        markLoading() {
            return setState(createSnapshot('loading', {
                lastAttemptAt: Date.now()
            }))
        },
        markSyncing() {
            return setState(createSnapshot('syncing', {
                lastAttemptAt: Date.now()
            }))
        },
        markSynced(extra = {}) {
            return setState(createSnapshot('synced', {
                lastSyncedAt: Date.now(),
                lastAttemptAt: Date.now(),
                ...extra
            }))
        },
        markStale(error = null, extra = {}) {
            return setState(createSnapshot('stale', {
                stale: true,
                error,
                lastAttemptAt: Date.now(),
                ...extra
            }))
        },
        markFailed(error, extra = {}) {
            return setState(createSnapshot('failed', {
                error,
                lastAttemptAt: Date.now(),
                ...extra
            }))
        },
        markConflict(conflict, extra = {}) {
            return setState(createSnapshot('conflict', {
                error: 'CONFLICT',
                conflict,
                lastAttemptAt: Date.now(),
                ...extra
            }))
        }
    }
}
