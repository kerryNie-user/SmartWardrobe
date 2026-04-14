const DISCOVERY_COMMENT_KEY = 'ct_discovery_comments'

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

function readSnapshot() {
    const snapshot = readJson(DISCOVERY_COMMENT_KEY)
    return snapshot && typeof snapshot === 'object' && snapshot.posts && typeof snapshot.posts === 'object'
        ? snapshot
        : { posts: {} }
}

export function getStoredComments(postId) {
    const snapshot = readSnapshot()
    return Array.isArray(snapshot.posts[postId]) ? snapshot.posts[postId] : []
}

export function getPostComments(post) {
    return [...(post.comments || []), ...getStoredComments(post.id)]
}

export function savePostComment(postId, comment) {
    const snapshot = readSnapshot()
    const nextComments = [...getStoredComments(postId), comment]
    snapshot.posts[postId] = nextComments
    writeJson(DISCOVERY_COMMENT_KEY, snapshot)
    return nextComments
}
