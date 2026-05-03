import { getDiscoveryContent } from './discovery.js'

export function getPostDetailContent(locale, id) {
    const content = getDiscoveryContent(locale)
    const allPosts = content.editorials || []
    let activePost = allPosts.find((item) => item.id === id) || null

    if (!activePost && id) {
        const fallbackLocale = locale === 'zh-CN' ? 'en-US' : 'zh-CN'
        const fallbackContent = getDiscoveryContent(fallbackLocale)
        const fallbackPosts = fallbackContent.editorials || []
        activePost = fallbackPosts.find((item) => item.id === id) || null
    }

    return {
        activePost,
        posts: allPosts
    }
}
