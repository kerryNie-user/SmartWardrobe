import { getDiscoveryContent } from './discovery.js'

export function getPostDetailContent(locale, id) {
    const content = getDiscoveryContent(locale)
    const allPosts = [...(content.communityPosts || []), ...(content.editorials || [])]
    const activePost = allPosts.find((item) => item.id === id) || null

    return {
        activePost,
        posts: allPosts
    }
}
