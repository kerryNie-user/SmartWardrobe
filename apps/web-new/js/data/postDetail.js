import { getDiscoveryContent } from './discovery.js'

export function getPostDetailContent(locale, id) {
    const content = getDiscoveryContent(locale)
    const activePost = content.communityPosts.find((item) => item.id === id) || null

    return {
        activePost,
        posts: content.communityPosts
    }
}
