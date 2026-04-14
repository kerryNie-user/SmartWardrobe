export const AUTH_USERS_KEY = 'ct_auth_users'
export const SESSION_KEY = 'ct_auth_session'
export const CURRENT_USER_KEY = 'currentUser'
export const IS_LOGGED_IN_KEY = 'isLoggedIn'

function resolveStorage(storage) {
    return storage || window.localStorage
}

export function readAuthJson(key, storage) {
    try {
        const raw = resolveStorage(storage)?.getItem(key)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export function writeAuthJson(key, value, storage) {
    resolveStorage(storage)?.setItem(key, JSON.stringify(value))
    return value
}

export function getStoredAuthSession(storage) {
    return readAuthJson(SESSION_KEY, storage)
}

export function getStoredAuthUser(storage) {
    return getStoredAuthSession(storage)?.user || null
}

export function getStoredAuthUserId(storage) {
    return getStoredAuthUser(storage)?.id || null
}

export function writeAuthSession(session, storage) {
    const nextSession = session || null
    if (!nextSession?.user) {
        resolveStorage(storage)?.removeItem(SESSION_KEY)
        resolveStorage(storage)?.removeItem(CURRENT_USER_KEY)
        resolveStorage(storage)?.removeItem(IS_LOGGED_IN_KEY)
        return null
    }

    writeAuthJson(SESSION_KEY, nextSession, storage)
    writeAuthJson(CURRENT_USER_KEY, nextSession.user, storage)
    resolveStorage(storage)?.setItem(IS_LOGGED_IN_KEY, 'true')
    return nextSession
}

export function clearAuthSession(storage) {
    resolveStorage(storage)?.removeItem(SESSION_KEY)
    resolveStorage(storage)?.removeItem(CURRENT_USER_KEY)
    resolveStorage(storage)?.removeItem(IS_LOGGED_IN_KEY)
}

export function syncStoredAuthUser(userPatch, storage) {
    const session = getStoredAuthSession(storage)
    if (!session?.user?.id) return null

    const nextUser = {
        ...session.user,
        ...userPatch
    }

    writeAuthSession({
        ...session,
        user: nextUser
    }, storage)

    const authUsers = readAuthJson(AUTH_USERS_KEY, storage)
    if (Array.isArray(authUsers)) {
        writeAuthJson(AUTH_USERS_KEY, authUsers.map((user) => user.id === nextUser.id ? {
            ...user,
            ...nextUser
        } : user), storage)
    }

    return nextUser
}
