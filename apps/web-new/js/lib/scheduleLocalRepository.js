import { getStoredAuthUserId } from './authIdentity.js'

const SCHEDULE_KEY = 'ct_schedule'
const SCHEDULE_VERSION = 1

function resolveStorage(storage) {
    if (storage) return storage
    if (globalThis.localStorage) return globalThis.localStorage
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
    return null
}

function getOwnerId(storage) {
    return getStoredAuthUserId(storage) || 'guest'
}

function normalizeSnapshot(snapshot) {
    if (snapshot && typeof snapshot === 'object' && snapshot.users && typeof snapshot.users === 'object') {
        return {
            version: snapshot.version || SCHEDULE_VERSION,
            users: {
                ...snapshot.users
            }
        }
    }

    if (snapshot !== null && snapshot !== undefined) {
        return {
            version: SCHEDULE_VERSION,
            users: {
                guest: snapshot
            }
        }
    }

    return {
        version: SCHEDULE_VERSION,
        users: {}
    }
}

export function createScheduleLocalRepository({ storage = null } = {}) {
    return {
        read(locale = 'en-US') {
            try {
                const resolved = resolveStorage(storage)
                const raw = resolved?.getItem(SCHEDULE_KEY)
                const parsed = raw ? JSON.parse(raw) : null
                if (!parsed) return null

                if (parsed.users && typeof parsed.users === 'object') {
                    const ownerId = getOwnerId(resolved)
                    if (parsed.users[ownerId] !== undefined) return parsed.users[ownerId]
                    if (parsed.users.guest !== undefined) return parsed.users.guest
                    const firstKey = Object.keys(parsed.users)[0]
                    return firstKey ? parsed.users[firstKey] : null
                }

                return parsed
            } catch {
                return null
            }
        },
        write(nextState, locale = 'en-US') {
            const resolved = resolveStorage(storage)
            const ownerId = getOwnerId(resolved)
            const previous = (() => {
                try {
                    const raw = resolved?.getItem(SCHEDULE_KEY)
                    return raw ? JSON.parse(raw) : null
                } catch {
                    return null
                }
            })()
            const snapshot = normalizeSnapshot(previous)
            snapshot.users[ownerId] = nextState
            const storedSnapshot = {
                ...snapshot,
                ...nextState,
                users: snapshot.users
            }
            resolved?.setItem(SCHEDULE_KEY, JSON.stringify(storedSnapshot))
            return storedSnapshot
        },
        clear() {
            resolveStorage(storage)?.removeItem(SCHEDULE_KEY)
            return null
        }
    }
}
