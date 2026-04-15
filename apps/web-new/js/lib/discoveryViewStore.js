import { createSyncController } from './syncState.js'

const DISCOVERY_VIEW_KEY = 'ct_discovery_view'
const listeners = new Set()
const syncController = createSyncController()

let state = {
    activeTab: 'hotspots',
    query: '',
    shareFeedbackPostId: ''
}

function notify() {
    listeners.forEach((listener) => listener(getDiscoveryViewSnapshot()))
}

function normalizeTab(tab) {
    return tab === 'posts' ? 'posts' : 'hotspots'
}

function normalizeSnapshot(snapshot) {
    return {
        activeTab: normalizeTab(snapshot?.activeTab),
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
    notify()
    syncController.markSynced()
    return getDiscoveryViewSnapshot()
}

export function retryDiscoveryViewHydration() {
    return hydrateDiscoveryView()
}

export function setDiscoveryActiveTab(tab) {
    try {
        writeSnapshot({
            ...state,
            activeTab: normalizeTab(tab)
        })
        syncController.markSynced()
    } catch (error) {
        syncController.markFailed(error?.message || 'DISCOVERY_VIEW_WRITE_FAILED')
    }
    return getDiscoveryViewSnapshot()
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
