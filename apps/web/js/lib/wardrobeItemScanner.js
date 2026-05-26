import { callClosetTwinModel1 } from './closetTwinClient.js'

const SCAN_ENDPOINT_STORAGE_KEY = 'ct_wardrobe_scan_endpoint'

export const WARDROBE_SCAN_STATUS = Object.freeze({
    READY: 'ready',
    UNAVAILABLE: 'unavailable',
    ERROR: 'error'
})

function normalizeEndpoint(value) {
    return String(value || '').trim()
}

function readStoredEndpoint() {
    if (typeof window === 'undefined') return ''
    try {
        return normalizeEndpoint(window.localStorage?.getItem(SCAN_ENDPOINT_STORAGE_KEY))
    } catch {
        return ''
    }
}

function resolveEndpoint(options = {}) {
    return normalizeEndpoint(options.endpoint)
        || normalizeEndpoint(typeof window !== 'undefined' ? window.__CT_WARDROBE_SCAN_ENDPOINT__ : '')
        || readStoredEndpoint()
}

function resolveFetch(options = {}) {
    if (typeof options.fetchImpl === 'function') return options.fetchImpl
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') return window.fetch.bind(window)
    if (typeof globalThis.fetch === 'function') return globalThis.fetch
    return null
}

function normalizeArray(value) {
    return Array.isArray(value)
        ? value.map((item) => String(item || '').trim()).filter(Boolean)
        : []
}

function pickObject(payload) {
    if (!payload || typeof payload !== 'object') return {}
    return payload.item || payload.wardrobeItem || payload.result || payload.data || payload
}

function normalizeScannedItem(payload) {
    const item = pickObject(payload)
    const image = item.image || item.imageUrl || item.image_url || item.photoUrl || item.photo_url || item.imageData || item.image_data || ''
    const tags = normalizeArray(item.tags || item.aiTags || item.ai_tags)
    return {
        id: item.id || '',
        title: item.title || item.name || '',
        category: item.category || item.type || '',
        size: item.size || '',
        color: item.color || '',
        material: item.material || '',
        image,
        filter: item.filter || item.filterKey || item.filter_key || '',
        favorite: Boolean(item.favorite),
        tags,
        aiMetadata: item.aiMetadata || item.ai_metadata || item.metadata || null
    }
}

function buildMetadata(file, extra = {}) {
    return {
        fileName: file?.name || '',
        fileType: file?.type || '',
        fileSize: Number(file?.size || 0),
        ...extra
    }
}

function readFileAsDataUrl(file) {
    const FileReaderClass = typeof window !== 'undefined' ? window.FileReader : globalThis.FileReader
    if (typeof FileReaderClass !== 'function') {
        return Promise.resolve({
            ok: false,
            reason: 'file-reader-unavailable'
        })
    }

    return new Promise((resolve) => {
        const reader = new FileReaderClass()
        reader.onload = () => resolve({
            ok: true,
            src: String(reader.result || '')
        })
        reader.onerror = () => resolve({
            ok: false,
            reason: 'file-read-failed'
        })
        reader.readAsDataURL(file)
    })
}

function normalizeModelCallResponse(response) {
    if (!response?.ok) {
        return {
            ok: false,
            status: WARDROBE_SCAN_STATUS.ERROR,
            item: {},
            raw: response?.data || null,
            metadata: {
                reason: response?.error || response?.message || 'closettwin-request-failed',
                details: response?.details || null
            }
        }
    }

    const modelPayload = response.data || {}
    return {
        ok: Boolean(modelPayload.ok),
        status: modelPayload.status || (modelPayload.ok ? WARDROBE_SCAN_STATUS.READY : WARDROBE_SCAN_STATUS.UNAVAILABLE),
        item: normalizeScannedItem(modelPayload.data || {}),
        raw: modelPayload,
        metadata: {
            reason: modelPayload.error?.code || null,
            model: 'closettwin-model1'
        }
    }
}

async function scanWithClosetTwinModel1(file, options = {}) {
    const preview = await readFileAsDataUrl(file)
    if (!preview.ok) {
        return {
            ok: false,
            status: WARDROBE_SCAN_STATUS.ERROR,
            source: 'closettwin-model1',
            item: {},
            raw: null,
            metadata: buildMetadata(file, { reason: preview.reason })
        }
    }

    const response = await (options.callModel1 || callClosetTwinModel1)('daily_context', {
        imageData: preview.src,
        fileName: file?.name || 'wardrobe-photo',
        fileType: file?.type || '',
        fileSize: Number(file?.size || 0)
    })
    const normalized = normalizeModelCallResponse(response)

    return {
        ok: normalized.ok,
        status: normalized.status,
        source: 'closettwin-model1',
        item: normalized.item,
        raw: normalized.raw,
        metadata: buildMetadata(file, normalized.metadata)
    }
}

export async function scanWardrobePhoto(file, options = {}) {
    const endpoint = resolveEndpoint(options)
    const request = resolveFetch(options)
    const FormDataClass = typeof window !== 'undefined' ? window.FormData : globalThis.FormData

    if (!file || !String(file.type || '').startsWith('image/')) {
        return {
            ok: false,
            status: WARDROBE_SCAN_STATUS.ERROR,
            source: 'wardrobe-item-scanner',
            item: {},
            raw: null,
            metadata: buildMetadata(file, { reason: 'invalid-image-file' })
        }
    }

    if (!endpoint) {
        return scanWithClosetTwinModel1(file, options)
    }

    if (!endpoint || !request || typeof FormDataClass !== 'function') {
        return {
            ok: false,
            status: WARDROBE_SCAN_STATUS.UNAVAILABLE,
            source: 'wardrobe-item-scanner',
            item: {},
            raw: null,
            metadata: buildMetadata(file, { reason: 'scan-endpoint-not-configured' })
        }
    }

    const formData = new FormDataClass()
    formData.append('photo', file, file.name || 'wardrobe-photo')

    try {
        const response = await request(endpoint, {
            method: 'POST',
            body: formData
        })
        const payload = await response.json().catch(() => null)

        if (!response.ok) {
            return {
                ok: false,
                status: WARDROBE_SCAN_STATUS.ERROR,
                source: 'wardrobe-item-scanner',
                item: {},
                raw: payload,
                metadata: buildMetadata(file, {
                    reason: payload?.error?.code || payload?.error || 'scan-request-failed',
                    status: response.status
                })
            }
        }

        return {
            ok: true,
            status: WARDROBE_SCAN_STATUS.READY,
            source: 'wardrobe-item-scanner',
            item: normalizeScannedItem(payload),
            raw: payload,
            metadata: buildMetadata(file, { endpoint })
        }
    } catch (error) {
        return {
            ok: false,
            status: WARDROBE_SCAN_STATUS.ERROR,
            source: 'wardrobe-item-scanner',
            item: {},
            raw: null,
            metadata: buildMetadata(file, {
                reason: 'scan-request-error',
                message: error?.message || ''
            })
        }
    }
}
