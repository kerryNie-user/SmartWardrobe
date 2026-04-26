import { getStoredAuthUserId } from './authIdentity.js'

export function getLiteBackendUserId() {
    return getStoredAuthUserId() || null
}

function normalizeBaseUrl(baseUrl) {
    if (typeof baseUrl !== 'string') return ''
    return baseUrl.trim().replace(/\/+$/, '')
}

function readBaseUrlOverride() {
    if (typeof window === 'undefined') return ''

    const globalOverride = normalizeBaseUrl(window.__CT_LITE_BACKEND_BASE_URL__)
    if (globalOverride) return globalOverride

    try {
        const storedOverride = normalizeBaseUrl(window.localStorage?.getItem('ct_lite_backend_base_url'))
        if (storedOverride) return storedOverride
    } catch {
        return ''
    }

    return ''
}

export function resolveLiteBackendBaseUrl(locationObject = typeof window !== 'undefined' ? window.location : null) {
    const override = readBaseUrlOverride()
    if (override) return override

    if (!locationObject?.hostname) return ''

    const protocol = locationObject.protocol === 'https:' ? 'https:' : 'http:'
    const port = String(locationObject.port || '').trim()
    if (port === '8140') {
        return ''
    }

    return `${protocol}//${locationObject.hostname}:8140`
}

export function buildLiteBackendUrl(path, locationObject = typeof window !== 'undefined' ? window.location : null) {
    if (typeof path !== 'string' || !path) return path
    if (/^https?:\/\//i.test(path)) return path

    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const baseUrl = resolveLiteBackendBaseUrl(locationObject)
    return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath
}

export function canUseLiteBackend() {
    return typeof window !== 'undefined' && typeof window.fetch === 'function'
}

export async function requestLiteBackend(path, { method = 'GET', payload, userId } = {}) {
    if (!canUseLiteBackend()) {
        return {
            ok: false,
            status: 0,
            error: 'FETCH_UNAVAILABLE',
            kind: 'network',
            data: null
        }
    }

    try {
        const response = await window.fetch(buildLiteBackendUrl(path), {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(userId || getLiteBackendUserId() ? { 'X-User-Id': userId || getLiteBackendUserId() } : {})
            },
            ...(payload === undefined ? {} : { body: JSON.stringify(payload) })
        })

        const contentType = response.headers.get('content-type') || ''
        const data = contentType.includes('application/json') ? await response.json().catch(() => null) : null

        if (!response.ok) {
            return {
                ok: false,
                status: response.status,
                error: data?.error || 'REQUEST_FAILED',
                kind: response.status === 409 ? 'conflict' : 'http',
                data
            }
        }

        return {
            ok: true,
            status: response.status,
            data,
            error: null,
            kind: 'success'
        }
    } catch {
        return {
            ok: false,
            status: 0,
            error: 'NETWORK_ERROR',
            kind: 'network',
            data: null
        }
    }
}

export async function getDiscoveryContent(locale = 'en-US') {
    return requestLiteBackend(`/api/discovery/content?locale=${locale}`, { method: 'GET' })
}

export async function getHomeContent(locale = 'en-US') {
    return requestLiteBackend(`/api/home/content?locale=${locale}`, { method: 'GET' })
}

export async function getDiscoverySocial() {
    return requestLiteBackend('/api/discovery/social', { method: 'GET' })
}
