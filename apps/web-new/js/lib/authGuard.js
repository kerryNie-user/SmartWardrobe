import { ensureDebugAuthSession, getAuthSession, isAuthenticated } from './authStore.js'
import { hydrateProtectedApp } from './appHydration.js'
import { navigateTo } from './navigation.js'
import { getCurrentPath, getCurrentPathWithSearch, getQueryParam } from './navigationAdapter.js'

function getCurrentPage() {
    const pathname = getCurrentPath()
    const search = new URL(getCurrentPathWithSearch(), 'http://localhost/').search || ''
    return `${pathname}${search}`
}

export function requireAuth() {
    ensureDebugAuthSession()
    if (isAuthenticated()) {
        hydrateProtectedApp()
        return true
    }

    navigateTo(`login.html?redirect=${encodeURIComponent(getCurrentPage())}`)
    return false
}

export function redirectIfAuthenticated() {
    const session = getAuthSession()
    if (!session?.user) {
        return false
    }

    const redirect = getQueryParam('redirect') || 'me.html'
    navigateTo(redirect)
    return true
}

export function getPostAuthRedirect() {
    return getQueryParam('redirect') || 'me.html'
}
