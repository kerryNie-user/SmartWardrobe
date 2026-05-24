import {
    createErrorSemantics,
    createLoadingSemantics,
    createStaticEmpty,
    createSyncSemantics
} from './shared.js'
import { getUiCopy } from '../locale.js'

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
    const copy = getUiCopy(locale)
    return {
        state: {
            postId,
            shareFeedback
        },
        derivedView: {
            topbar: {
                leftLabel: copy.topbar.backToDiscovery,
                leftHref: 'discovery.html',
                rightLabel: copy.topbar.openProfile,
                rightHref: 'profile.html'
            },
            article: post,
            social,
            comments,
            missingState: post ? null : {
                kind: 'error',
                eyebrow: copy.post.missing.eyebrow,
                title: copy.post.missing.title,
                description: copy.post.missing.description,
                action: {
                    label: copy.topbar.backToDiscovery,
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
