import { getStoredAuthUserId } from './authIdentity.js'

const USER_SCOPED_VERSION = 1

function resolveStorage(storage) {
    return storage || window.localStorage
}

function readJson(key, storage) {
    try {
        const raw = resolveStorage(storage)?.getItem(key)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

function writeJson(key, value, storage) {
    resolveStorage(storage)?.setItem(key, JSON.stringify(value))
    return value
}

export function getCurrentScopedUserId(storage) {
    return getStoredAuthUserId(storage) || 'guest'
}

export function getCurrentUserScope(storage) {
    const resolvedStorage = resolveStorage(storage)
    return {
        storage: resolvedStorage,
        ownerId: getCurrentScopedUserId(resolvedStorage)
    }
}

function createScopedSnapshot(snapshot) {
    if (snapshot && typeof snapshot === 'object' && snapshot.users && typeof snapshot.users === 'object') {
        return {
            version: USER_SCOPED_VERSION,
            users: {
                ...snapshot.users
            }
        }
    }

    if (snapshot !== null && snapshot !== undefined) {
        return {
            version: USER_SCOPED_VERSION,
            users: {
                guest: snapshot
            }
        }
    }

    return {
        version: USER_SCOPED_VERSION,
        users: {}
    }
}

export function readUserScopedValue(key, fallbackFactory = () => null, options = {}) {
    const storage = resolveStorage(options.storage)
    const ownerId = options.ownerId || getCurrentScopedUserId(storage)
    const snapshot = readJson(key, storage)

    if (snapshot && typeof snapshot === 'object' && snapshot.users && typeof snapshot.users === 'object') {
        if (snapshot.users[ownerId] !== undefined) {
            return snapshot.users[ownerId]
        }
        return fallbackFactory()
    }

    if (snapshot !== null && snapshot !== undefined) {
        return snapshot
    }

    return fallbackFactory()
}

export function writeUserScopedValue(key, value, options = {}) {
    const storage = resolveStorage(options.storage)
    const ownerId = options.ownerId || getCurrentScopedUserId(storage)
    const snapshot = createScopedSnapshot(readJson(key, storage))
    snapshot.users[ownerId] = value
    return writeJson(key, snapshot, storage)
}
