import { getDiscoveryContent } from '../data/discovery.js'
import { isFavorite, toggleFavorite } from './favoritesStore.js'
import { getAuthSession } from './authStore.js'
import { getStoredComments } from './discoveryCommentStore.js'

const DISCOVERY_SOCIAL_KEY = 'ct_discovery_social'

function readJson(key) {
    try {
        const raw = window.localStorage?.getItem(key)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

function writeJson(key, value) {
    window.localStorage?.setItem(key, JSON.stringify(value))
    return value
}

function getSocialOwnerId() {
    return getAuthSession()?.user?.id || 'guest'
}

function readSocialSnapshot() {
    const snapshot = readJson(DISCOVERY_SOCIAL_KEY)
    const ownerId = getSocialOwnerId()
    const userSnapshot = snapshot?.users?.[ownerId] || snapshot

    return {
        likedPostIds: Array.isArray(userSnapshot?.likedPostIds) ? userSnapshot.likedPostIds : [],
        followedAuthors: Array.isArray(userSnapshot?.followedAuthors) ? userSnapshot.followedAuthors : []
    }
}

function writeSocialSnapshot(snapshot) {
    const ownerId = getSocialOwnerId()
    const rootSnapshot = readJson(DISCOVERY_SOCIAL_KEY)
    return writeJson(DISCOVERY_SOCIAL_KEY, {
        users: {
            ...(rootSnapshot && typeof rootSnapshot === 'object' && rootSnapshot.users && typeof rootSnapshot.users === 'object' ? rootSnapshot.users : {}),
            [ownerId]: snapshot
        }
    })
}

function normalizeTab(tab) {
    return tab === 'posts' ? 'posts' : 'hotspots'
}

function filterItems(items, fields, query) {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
        return items
    }

    return items.filter((item) => fields(item)
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery))
}

function createSavedPostItem(post) {
    return {
        id: post.id,
        title: post.title,
        subtitle: `${post.author} · ${post.time}`,
        image: post.heroImage || post.images[0],
        href: `post-detail.html?id=${post.id}`
    }
}

function getFeedItems(activeTab, content, query) {
    if (activeTab === 'posts') {
        return filterItems(content.communityPosts, (item) => [item.title, item.description, item.author], query)
    }

    return filterItems(content.hotspotStories, (item) => [item.title, item.description, item.tag, item.meta], query)
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

export function createDiscoveryState(locale = 'en-US') {
    return {
        locale,
        activeTab: 'hotspots',
        query: ''
    }
}

export function setDiscoveryTab(state, tab) {
    state.activeTab = normalizeTab(tab)
    return state
}

export function setDiscoveryQuery(state, query) {
    state.query = query || ''
    return state
}

export function getPostSocialState(post) {
    const social = readSocialSnapshot()
    const authorId = post.authorId || post.author
    const isLiked = social.likedPostIds.includes(post.id)
    const storedCommentCount = getStoredComments(post.id).length

    return {
        isSaved: isFavorite('posts', post.id),
        isLiked,
        isFollowed: social.followedAuthors.includes(authorId),
        likesDisplay: formatCount(parseCompactCount(post.stats?.likes) + (isLiked ? 1 : 0)),
        commentsDisplay: formatCount(parseCompactCount(post.stats?.comments) + storedCommentCount)
    }
}

export function toggleDiscoverySave(post) {
    return toggleFavorite('posts', createSavedPostItem(post))
}

export function toggleDiscoveryLike(postId) {
    const social = readSocialSnapshot()
    const isLiked = social.likedPostIds.includes(postId)
    const nextSocial = {
        ...social,
        likedPostIds: isLiked
            ? social.likedPostIds.filter((id) => id !== postId)
            : [postId, ...social.likedPostIds]
    }

    writeSocialSnapshot(nextSocial)
    return {
        isLiked: !isLiked,
        social: nextSocial
    }
}

export function toggleDiscoveryFollow(authorId) {
    const social = readSocialSnapshot()
    const isFollowed = social.followedAuthors.includes(authorId)
    const nextSocial = {
        ...social,
        followedAuthors: isFollowed
            ? social.followedAuthors.filter((id) => id !== authorId)
            : [authorId, ...social.followedAuthors]
    }

    writeSocialSnapshot(nextSocial)
    return {
        isFollowed: !isFollowed,
        social: nextSocial
    }
}

export function getDiscoveryView(state, locale = state.locale || 'en-US') {
    const content = getDiscoveryContent(locale)
    const activeTab = normalizeTab(state.activeTab)
    const items = getFeedItems(activeTab, content, state.query)

    return {
        activeTab,
        query: state.query,
        tabs: content.tabs.map((tab) => ({
            ...tab,
            active: tab.key === activeTab
        })),
        trendStrip: activeTab === 'posts' ? content.postTrendStrip : content.hotspotTrendStrip,
        searchPlaceholder: content.searchPlaceholder[activeTab],
        feed: {
            kind: items.length ? 'ready' : 'empty',
            items: activeTab === 'posts'
                ? items.map((item) => ({
                    ...item,
                    social: getPostSocialState(item)
                }))
                : items
        }
    }
}
