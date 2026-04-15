import { createSyncController } from './syncState.js'

const DISCOVERY_COMMENT_KEY = 'ct_discovery_comments'
const listeners = new Set()
const syncController = createSyncController()

let snapshotState = { posts: {} }

function notify() {
    listeners.forEach((listener) => listener(getDiscoveryCommentSnapshot()))
}

function normalizeSnapshot(snapshot) {
    return snapshot && typeof snapshot === 'object' && snapshot.posts && typeof snapshot.posts === 'object'
        ? snapshot
        : { posts: {} }
}

function readSnapshotResult() {
    try {
        const raw = window.localStorage?.getItem(DISCOVERY_COMMENT_KEY)
        if (!raw) {
            return {
                ok: true,
                value: { posts: {} }
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

function writeSnapshot(nextSnapshot) {
    snapshotState = normalizeSnapshot(nextSnapshot)
    window.localStorage?.setItem(DISCOVERY_COMMENT_KEY, JSON.stringify(snapshotState))
    notify()
    return getDiscoveryCommentSnapshot()
}

function refreshSnapshotFromStorage() {
    const result = readSnapshotResult()
    if (result.ok) {
        snapshotState = normalizeSnapshot(result.value)
    }
    return getDiscoveryCommentSnapshot()
}

export function getDiscoveryCommentSnapshot() {
    return {
        posts: {
            ...snapshotState.posts
        }
    }
}

export function subscribeDiscoveryCommentStore(listener) {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

export async function hydrateDiscoveryComments() {
    syncController.markLoading()
    const result = readSnapshotResult()
    if (!result.ok) {
        snapshotState = { posts: {} }
        notify()
        syncController.markFailed(result.error?.message || 'DISCOVERY_COMMENTS_READ_FAILED')
        return getDiscoveryCommentSnapshot()
    }

    snapshotState = normalizeSnapshot(result.value)
    notify()
    syncController.markSynced()
    return getDiscoveryCommentSnapshot()
}

export function retryDiscoveryCommentSync() {
    return hydrateDiscoveryComments()
}

export function getStoredComments(postId) {
    if (!Object.keys(snapshotState.posts).length) {
        refreshSnapshotFromStorage()
    }
    return Array.isArray(snapshotState.posts[postId]) ? snapshotState.posts[postId] : []
}

export function getPostComments(post) {
    return [...(post.comments || []), ...getStoredComments(post.id)]
}

export function savePostComment(postId, comment) {
    const nextComments = [...getStoredComments(postId), comment]
    const nextSnapshot = {
        posts: {
            ...snapshotState.posts,
            [postId]: nextComments
        }
    }

    try {
        writeSnapshot(nextSnapshot)
        syncController.markSynced()
    } catch (error) {
        syncController.markFailed(error?.message || 'DISCOVERY_COMMENTS_WRITE_FAILED')
    }

    return nextComments
}

export function getDiscoveryCommentSyncState() {
    return syncController.getState()
}

export function subscribeDiscoveryCommentSyncState(listener) {
    return syncController.subscribe(listener)
}
