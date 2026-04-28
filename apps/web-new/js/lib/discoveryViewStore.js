import { createSyncController } from './syncState.js'
import { hydrateDiscoveryContent } from '../data/discovery.js'
import { getLocale } from './locale.js'

const DISCOVERY_VIEW_KEY = 'ct_discovery_view'
const listeners = new Set()
const syncController = createSyncController()

let state = {
    query: '',
    shareFeedbackPostId: ''
}

function notify() {
    listeners.forEach((listener) => listener(getDiscoveryViewSnapshot()))
}

function normalizeSnapshot(snapshot) {
    return {
        query: typeof snapshot?.query === 'string' ? snapshot.query : '',
        shareFeedbackPostId: typeof snapshot?.shareFeedbackPostId === 'string' ? snapshot.shareFeedbackPostId : ''
    }
}

function readSnapshotResult() {
    try {
        const raw = window.localStorage?.getItem(DISCOVERY_VIEW_KEY)
        if (!raw) {
            return {
                ok: true,
                value: normalizeSnapshot({})
            }
        }

        return {
            ok: true,
            value: normalizeSnapshot(JSON.parse(raw))
        }
    } catch (error) {
        return {
            ok: false,
            error
        }
    }
}

function writeSnapshot(nextState) {
    state = normalizeSnapshot(nextState)
    window.localStorage?.setItem(DISCOVERY_VIEW_KEY, JSON.stringify(state))
    notify()
    return getDiscoveryViewSnapshot()
}

export function getDiscoveryViewSnapshot() {
    return {
        ...state
    }
}

export function subscribeDiscoveryViewStore(listener) {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

export async function hydrateDiscoveryView() {
    syncController.markLoading()
    const result = readSnapshotResult()
    if (!result.ok) {
        state = normalizeSnapshot({})
        notify()
        syncController.markFailed(result.error?.message || 'DISCOVERY_VIEW_READ_FAILED')
        return getDiscoveryViewSnapshot()
    }

    state = result.value
    
    try {
        await hydrateDiscoveryContent(getLocale())
        notify()
        syncController.markSynced()
    } catch (error) {
        syncController.markFailed(error?.message || 'DISCOVERY_CONTENT_FETCH_FAILED')
    }
    
    return getDiscoveryViewSnapshot()
}

export function retryDiscoveryViewHydration() {
    return hydrateDiscoveryView()
}

export function setDiscoveryQuery(query) {
    try {
        writeSnapshot({
            ...state,
            query: String(query || '')
        })
        syncController.markSynced()
    } catch (error) {
        syncController.markFailed(error?.message || 'DISCOVERY_VIEW_WRITE_FAILED')
    }
    return getDiscoveryViewSnapshot()
}

export function setDiscoveryShareFeedback(postId) {
    try {
        writeSnapshot({
            ...state,
            shareFeedbackPostId: String(postId || '')
        })
        syncController.markSynced()
    } catch (error) {
        syncController.markFailed(error?.message || 'DISCOVERY_VIEW_WRITE_FAILED')
    }
    return getDiscoveryViewSnapshot()
}

export function clearDiscoveryShareFeedback() {
    return setDiscoveryShareFeedback('')
}

export function getDiscoveryViewSyncState() {
    return syncController.getState()
}

export function subscribeDiscoveryViewSyncState(listener) {
    return syncController.subscribe(listener)
}
