import { AUTH_USERS_KEY, clearAuthSession, CURRENT_USER_KEY, getStoredAuthSession, SESSION_KEY, syncStoredAuthUser, writeAuthJson, writeAuthSession } from './authIdentity.js'
import { getUiCopy } from './locale.js'

const USERS_KEY = AUTH_USERS_KEY
const DEBUG_SESSION_KEY = 'ct_debug_auto_login'
const DEBUG_USER_COPY = getUiCopy('en-US').defaults.debugUser
const DEBUG_USER = {
    id: 'user-096fb511f3ff',
    name: DEBUG_USER_COPY.name,
    emailOrMobile: DEBUG_USER_COPY.emailOrMobile,
    password: 'password123',
    avatar: DEBUG_USER_COPY.avatar,
    bio: DEBUG_USER_COPY.bio
}

function readJson(key) {
    try {
        const raw = window.localStorage?.getItem(key)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

function writeJson(key, value) {
    writeAuthJson(key, value)
}

function readUsers() {
    const users = readJson(USERS_KEY)
    return Array.isArray(users) ? users : []
}

function writeUsers(users) {
    writeJson(USERS_KEY, users)
    return users
}

function ensureDebugUser() {
    const users = readUsers()
    const existing = users.find((item) => item.emailOrMobile === DEBUG_USER.emailOrMobile)
    const nextUser = existing ? {
        ...existing,
        ...DEBUG_USER
    } : DEBUG_USER

    if (!existing) {
        writeUsers([nextUser, ...users])
        return nextUser
    }

    const nextUsers = users.map((item) => item.emailOrMobile === DEBUG_USER.emailOrMobile ? nextUser : item)
    writeUsers(nextUsers)
    return nextUser
}

function createSession(user) {
    const sessionUser = {
        ...user
    }

    delete sessionUser.password

    const session = {
        user: sessionUser,
        signedInAt: Date.now()
    }

    writeAuthSession(session)
    return getStoredAuthSession()
}

function createDebugSession() {
    const user = ensureDebugUser()
    const session = createSession(user)
    writeJson(DEBUG_SESSION_KEY, {
        enabled: true,
        userId: user.id
    })
    return {
        ...session,
        debug: true
    }
}

async function postAuth(path, payload) {
    if (typeof window.fetch !== 'function') return null

    try {
        const response = await window.fetch(path, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (response.ok) {
            return response.json()
        }

        const contentType = response.headers.get('content-type') || ''
        if (![404, 405, 500, 501].includes(response.status) && contentType.includes('application/json')) {
            const errorPayload = await response.json().catch(() => ({}))
            throw new Error(errorPayload.error || errorPayload.message || 'AUTH_FAILED')
        }
    } catch (error) {
        if (error instanceof Error && error.message !== 'AUTH_FAILED') {
            return null
        }
        throw error
    }

    return null
}

function normalizeUser(rawUser, payload) {
    const defaultUser = getUiCopy('en-US').defaults.debugUser
    return {
        id: rawUser?.id || `user-${Date.now()}`,
        name: rawUser?.name || payload.name || defaultUser.name,
        emailOrMobile: rawUser?.emailOrMobile || payload.emailOrMobile,
        avatar: rawUser?.avatar || defaultUser.avatar,
        bio: rawUser?.bio || '',
        password: rawUser?.password || payload.password || ''
    }
}

export function getAuthSession() {
    return getStoredAuthSession()
}

export function ensureDebugAuthSession() {
    const session = readJson(SESSION_KEY)
    if (session?.user) {
        return session
    }
    return createDebugSession()
}

export function isAuthenticated() {
    return Boolean(getAuthSession()?.user)
}

export async function registerUser(payload) {
    const remote = await postAuth('/api/auth/register', payload)

    if (remote?.user) {
        const user = normalizeUser(remote.user, payload)
        const users = readUsers().filter((item) => item.emailOrMobile !== user.emailOrMobile)
        writeUsers([user, ...users])
        return createSession(user)
    }

    throw new Error('AUTH_REMOTE_UNAVAILABLE')
}

export async function loginUser(payload) {
    const remote = await postAuth('/api/auth/login', payload)

    if (remote?.user) {
        const user = normalizeUser(remote.user, payload)
        const users = readUsers()
        if (!users.some((item) => item.emailOrMobile === user.emailOrMobile)) {
            writeUsers([user, ...users])
        }
        return createSession(user)
    }

    throw new Error('AUTH_REMOTE_UNAVAILABLE')
}

export function logoutUser() {
    clearAuthSession()
    window.localStorage?.removeItem(DEBUG_SESSION_KEY)
}

export function syncCurrentUser(userPatch) {
    const session = getAuthSession()
    if (!session?.user) return null

    const users = readUsers()
    const storedUser = users.find((item) => item.id === session.user.id)
    const nextUser = syncStoredAuthUser({
        ...storedUser,
        ...session.user,
        ...userPatch
    })

    if (!nextUser) return null

    if (readJson(CURRENT_USER_KEY)?.id !== nextUser.id) {
        writeJson(CURRENT_USER_KEY, nextUser)
    }

    return nextUser
}
