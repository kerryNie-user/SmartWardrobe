import { getAuthSession } from './authStore.js'
import { isFavorite, toggleFavorite } from './favoritesStore.js'
import { getStoredComments } from './discoveryCommentStore.js'
import { createSyncController } from './syncState.js'

const DISCOVERY_SOCIAL_KEY = 'ct_discovery_social'
const listeners = new Set()
const syncController = createSyncController()

let socialState = {
    likedPostIds: [],
    followedAuthors: []
}
let hasLoadedSnapshot = false

function notify() {
    listeners.forEach((listener) => listener(getDiscoverySocialSnapshot()))
}

function getOwnerId() {
    return getAuthSession()?.user?.id || 'guest'
}

function normalizeSnapshot(snapshot) {
    return {
        likedPostIds: Array.isArray(snapshot?.likedPostIds) ? snapshot.likedPostIds : [],
        followedAuthors: Array.isArray(snapshot?.followedAuthors) ? snapshot.followedAuthors : []
    }
}

function readRootResult() {
    try {
        const raw = window.localStorage?.getItem(DISCOVERY_SOCIAL_KEY)
        if (!raw) {
            return {
                ok: true,
                value: { users: {} }
            }
        }

        const parsed = JSON.parse(raw)
        return {
            ok: true,
            value: parsed && typeof parsed === 'object' ? parsed : { users: {} }
        }
    } catch (error) {
        return {
            ok: false,
            error
        }
    }
}

function readSocialSnapshotFromRoot(rootSnapshot) {
    const ownerId = getOwnerId()
    const userSnapshot = rootSnapshot?.users?.[ownerId] || rootSnapshot
    return normalizeSnapshot(userSnapshot)
}

function refreshSocialSnapshot() {
    const result = readRootResult()
    if (result.ok) {
        socialState = readSocialSnapshotFromRoot(result.value)
        hasLoadedSnapshot = true
    }
    return {
        ...socialState,
        likedPostIds: [...socialState.likedPostIds],
        followedAuthors: [...socialState.followedAuthors]
    }
}

function writeSocialSnapshot(nextSnapshot) {
    const ownerId = getOwnerId()
    const rootResult = readRootResult()
    const rootSnapshot = rootResult.ok && rootResult.value && typeof rootResult.value === 'object'
        ? rootResult.value
        : { users: {} }
    const nextRoot = {
        users: {
            ...(rootSnapshot && typeof rootSnapshot.users === 'object' ? rootSnapshot.users : {}),
            [ownerId]: normalizeSnapshot(nextSnapshot)
        }
    }

    socialState = normalizeSnapshot(nextSnapshot)
    hasLoadedSnapshot = true
    window.localStorage?.setItem(DISCOVERY_SOCIAL_KEY, JSON.stringify(nextRoot))
    notify()
    return getDiscoverySocialSnapshot()
}

function parseCompactCount(value) {
    const normalized = String(value || '').trim().toUpperCase()
    if (!normalized) return 0
    if (normalized.endsWith('K')) return Math.round(Number.parseFloat(normalized) * 1000)
    if (normalized.endsWith('M')) return Math.round(Number.parseFloat(normalized) * 1000000)
    return Number.parseInt(normalized, 10) || 0
}

function formatCount(value) {
    return new Intl.NumberFormat('en-US').format(value)
}

function createSavedPostItem(post) {
    return {
        id: post.id,
        title: post.title,
        subtitle: `${post.author} · ${post.time}`,
        image: post.heroImage || post.images?.[0] || '',
        href: `post-detail.html?id=${post.id}`
    }
}

export function getDiscoverySocialSnapshot() {
    if (!hasLoadedSnapshot) {
        refreshSocialSnapshot()
    }
    return {
        ...socialState,
        likedPostIds: [...socialState.likedPostIds],
        followedAuthors: [...socialState.followedAuthors]
    }
}

export function subscribeDiscoverySocialStore(listener) {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

export async function hydrateDiscoverySocial() {
    syncController.markLoading()
    const result = readRootResult()
    if (!result.ok) {
        socialState = normalizeSnapshot({})
        hasLoadedSnapshot = true
        notify()
        syncController.markFailed(result.error?.message || 'DISCOVERY_SOCIAL_READ_FAILED')
        return getDiscoverySocialSnapshot()
    }

    socialState = readSocialSnapshotFromRoot(result.value)
    hasLoadedSnapshot = true
    notify()
    syncController.markSynced()
    return getDiscoverySocialSnapshot()
}

export function retryDiscoverySocialSync() {
    return hydrateDiscoverySocial()
}

export function getPostSocialState(post) {
    refreshSocialSnapshot()
    const authorId = post.authorId || post.author
    const commentsCount = getStoredComments(post.id).length
    return {
        isSaved: isFavorite('posts', post.id),
        isLiked: socialState.likedPostIds.includes(post.id),
        isFollowed: socialState.followedAuthors.includes(authorId),
        likesDisplay: formatCount(parseCompactCount(post.stats?.likes) + (socialState.likedPostIds.includes(post.id) ? 1 : 0)),
        commentsDisplay: formatCount(parseCompactCount(post.stats?.comments) + commentsCount)
    }
}

export function toggleDiscoveryPostSave(post) {
    return toggleFavorite('posts', createSavedPostItem(post))
}

export function toggleDiscoveryPostLike(postId) {
    const isLiked = socialState.likedPostIds.includes(postId)
    const nextSnapshot = {
        ...socialState,
        likedPostIds: isLiked
            ? socialState.likedPostIds.filter((id) => id !== postId)
            : [postId, ...socialState.likedPostIds]
    }

    try {
        writeSocialSnapshot(nextSnapshot)
        syncController.markSynced()
    } catch (error) {
        syncController.markFailed(error?.message || 'DISCOVERY_SOCIAL_WRITE_FAILED')
    }

    return {
        isLiked: !isLiked,
        social: getDiscoverySocialSnapshot()
    }
}

export function toggleDiscoveryAuthorFollow(authorId) {
    const isFollowed = socialState.followedAuthors.includes(authorId)
    const nextSnapshot = {
        ...socialState,
        followedAuthors: isFollowed
            ? socialState.followedAuthors.filter((id) => id !== authorId)
            : [authorId, ...socialState.followedAuthors]
    }

    try {
        writeSocialSnapshot(nextSnapshot)
        syncController.markSynced()
    } catch (error) {
        syncController.markFailed(error?.message || 'DISCOVERY_SOCIAL_WRITE_FAILED')
    }

    return {
        isFollowed: !isFollowed,
        social: getDiscoverySocialSnapshot()
    }
}

export function getDiscoverySocialSyncState() {
    return syncController.getState()
}

export function subscribeDiscoverySocialSyncState(listener) {
    return syncController.subscribe(listener)
}
