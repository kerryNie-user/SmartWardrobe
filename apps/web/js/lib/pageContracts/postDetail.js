import {
    createErrorSemantics,
    createLoadingSemantics,
    createStaticEmpty,
    createSyncSemantics
} from './shared.js'

export function createPostDetailPageContract({
    locale,
    postId,
    post,
    social,
    comments = [],
    shareFeedback = '',
    syncStates = {}
}) {
    const sync = createSyncSemantics(syncStates, ['discoverySocial', 'discoveryComments'])
    return {
        state: {
            postId,
            shareFeedback
        },
        derivedView: {
            topbar: {
                leftLabel: locale === 'zh-CN' ? '返回发现' : 'Back to discovery',
                leftHref: 'discovery.html',
                rightLabel: locale === 'zh-CN' ? '打开个人资料' : 'Open profile',
                rightHref: 'profile.html'
            },
            article: post,
            social,
            comments,
            missingState: post ? null : {
                kind: 'error',
                eyebrow: locale === 'zh-CN' ? '帖子未找到' : 'Post Missing',
                title: locale === 'zh-CN' ? '当前帖子不存在' : 'This post is unavailable',
                description: locale === 'zh-CN' ? '请返回发现页重新选择帖子。' : 'Return to discovery and choose another post.',
                action: {
                    label: locale === 'zh-CN' ? '返回发现' : 'Back to discovery',
                    href: 'discovery.html'
                }
            }
        },
        actions: {
            togglePostSave: { type: 'domain', optimistic: true, retryable: true },
            togglePostLike: { type: 'domain', optimistic: true, retryable: true },
            toggleAuthorFollow: { type: 'domain', optimistic: true, retryable: true },
            sharePost: { type: 'ui', retryable: false },
            saveComment: { type: 'domain', optimistic: true, retryable: true },
            backToDiscovery: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: createStaticEmpty(!post, 'noData'),
        error: createErrorSemantics(sync),
        sync
    }
}
