import { renderTopbar } from '../components/topbar.js'
import { renderPostDetailArticle } from '../components/postDetailArticle.js'
import { renderStatePanel } from '../components/statePanel.js'
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js'
import { renderFormNotice } from '../components/formNotice.js'
import { getPostDetailContent } from '../data/postDetail.js'
import { applyLocaleDocument, getLocale, getSharedCopy } from '../lib/locale.js'
import { bindPageStores } from '../lib/pageStoreBinding.js'
import { createPostDetailPageContract } from '../lib/pageContracts.js'
import { getQueryParam } from '../lib/navigationAdapter.js'
import { getFormFeedbackCopy, focusFirstInvalidField, validateRequired } from '../lib/formValidation.js'
import { buildCanonicalHref, shareLink } from '../lib/shareAdapter.js'
import { getDiscoveryCommentSyncState, getPostComments, hydrateDiscoveryComments, retryDiscoveryCommentSync, savePostComment, subscribeDiscoveryCommentStore, subscribeDiscoveryCommentSyncState } from '../lib/discoveryCommentStore.js'
import { subscribeFavoritesStore } from '../lib/favoritesStore.js'
import { getDiscoverySocialSyncState, getPostSocialState, hydrateDiscoverySocial, retryDiscoverySocialSync, subscribeDiscoverySocialStore, subscribeDiscoverySocialSyncState, toggleDiscoveryAuthorFollow, toggleDiscoveryPostLike, toggleDiscoveryPostSave } from '../lib/discoverySocialStore.js'

function getPostId() {
    return getQueryParam('id')
}

function renderComments(post) {
    const sharedCopy = getSharedCopy(getLocale())
    const comments = getPostComments(post)

    return `
        <section class="ct-post-comments">
            <h2 class="ct-post-comments__heading">${sharedCopy.actions.viewComments}</h2>
            <form class="ct-post-comments__form" data-ct-post-comment-form>
                <textarea class="ct-post-comments__input" name="commentBody" placeholder="${getLocale() === 'zh-CN' ? '写下你的评论' : 'Write your comment'}"></textarea>
                <button class="ct-post-detail__share" type="submit">${getLocale() === 'zh-CN' ? '发布评论' : 'Post Comment'}</button>
                <div data-ct-form-notice></div>
            </form>
            <ul class="ct-post-comments__list">
                ${comments.map((comment) => `
                    <li class="ct-post-comments__item">
                        <strong class="ct-post-comments__author">${comment.author}</strong>
                        <span class="ct-post-comments__time">${comment.time}</span>
                        <p class="ct-post-comments__body">${comment.body}</p>
                    </li>
                `).join('')}
            </ul>
        </section>
    `
}

export function renderPostDetailPage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]')
    const detailRoot = document.querySelector('[data-ct-post-detail]')
    const commentsRoot = document.querySelector('[data-ct-post-comments]')
    const syncFeedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'post-detail')
    let shareFeedback = ''
    let commentNotice = null
    const listenerCleanups = []

    const paint = () => {
        const locale = getLocale()
        const { activePost } = getPostDetailContent(locale, getPostId())
        const social = activePost ? getPostSocialState(activePost) : null
        const comments = activePost ? getPostComments(activePost) : []
        const contract = createPostDetailPageContract({
            locale,
            postId: getPostId(),
            post: activePost,
            social,
            comments,
            shareFeedback,
            syncStates: {
                discoverySocial: getDiscoverySocialSyncState(),
                discoveryComments: getDiscoveryCommentSyncState()
            }
        })

        applyLocaleDocument('postDetail', locale)

        if (topbarRoot) {
            topbarRoot.innerHTML = renderTopbar({
                leftLabel: contract.derivedView.topbar.leftLabel,
                leftIcon: '←',
                leftHref: contract.derivedView.topbar.leftHref,
                rightLabel: contract.derivedView.topbar.rightLabel,
                rightIcon: '◐',
                rightHref: contract.derivedView.topbar.rightHref
            })
        }

        if (!contract.derivedView.article) {
            if (detailRoot) {
                detailRoot.innerHTML = renderStatePanel(contract.derivedView.missingState)
            }
            if (commentsRoot) commentsRoot.innerHTML = ''
            return
        }

        if (detailRoot) {
            detailRoot.innerHTML = renderPostDetailArticle(contract.derivedView.article, contract.derivedView.social, {
                shareFeedback: contract.state.shareFeedback
            })
        }
        if (commentsRoot) {
            commentsRoot.innerHTML = renderComments(contract.derivedView.article)
            const noticeRoot = commentsRoot.querySelector('[data-ct-post-comment-form] [data-ct-form-notice]')
            if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(commentNotice)
        }
    }

    if (detailRoot) {
        const handleDetailClick = (event) => {
            const bookmark = event.target.closest('[data-ct-post-bookmark]')
            const locale = getLocale()
            const { activePost } = getPostDetailContent(locale, getPostId())
            if (!activePost) return

            if (bookmark) {
                toggleDiscoveryPostSave(activePost)
                return
            }

            const likeButton = event.target.closest('[data-ct-post-like]')
            if (likeButton) {
                toggleDiscoveryPostLike(activePost.id)
                return
            }

            const followButton = event.target.closest('[data-ct-post-follow]')
            if (followButton) {
                toggleDiscoveryAuthorFollow(activePost.authorId || activePost.author)
                return
            }

            const shareButton = event.target.closest('[data-ct-post-share]')
            if (shareButton) {
                const shareUrl = buildCanonicalHref('post-detail.html', { id: activePost.id })
                shareFeedback = locale === 'zh-CN' ? '链接已复制' : 'Link copied'
                binding.requestPaint()
                void shareLink({
                    href: shareUrl,
                    title: activePost.title,
                    text: activePost.description
                })
            }
        }
        detailRoot.addEventListener('click', handleDetailClick)
        listenerCleanups.push(() => detailRoot.removeEventListener('click', handleDetailClick))
    }

    if (commentsRoot) {
        const handleCommentSubmit = (event) => {
            const form = event.target.closest('[data-ct-post-comment-form]')
            if (!form) return
            event.preventDefault()

            const locale = getLocale()
            const copy = getFormFeedbackCopy(locale)
            const { activePost } = getPostDetailContent(locale, getPostId())
            if (!activePost) return

            const formData = new window.FormData(form)
            const validation = validateRequired(formData, [
                { field: 'commentBody', label: locale === 'zh-CN' ? '评论' : 'Comment' }
            ], locale)

            if (!validation.ok) {
                commentNotice = {
                    tone: 'error',
                    title: copy.status.validating,
                    message: validation.errors[0]?.message || copy.status.validating,
                    actions: []
                }
                const noticeRoot = form.querySelector('[data-ct-form-notice]')
                if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(commentNotice)
                focusFirstInvalidField(form, validation.errors)
                return
            }

            const body = String(formData.get('commentBody') || '').trim()
            commentNotice = null
            const noticeRoot = form.querySelector('[data-ct-form-notice]')
            if (noticeRoot) noticeRoot.innerHTML = ''

            savePostComment(activePost.id, {
                author: locale === 'zh-CN' ? '你' : 'You',
                time: locale === 'zh-CN' ? '刚刚' : 'Just now',
                body
            })
        }
        commentsRoot.addEventListener('submit', handleCommentSubmit)
        listenerCleanups.push(() => commentsRoot.removeEventListener('submit', handleCommentSubmit))
    }

    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeDiscoverySocialStore(listener),
            (listener) => subscribeDiscoveryCommentStore(listener),
            (listener) => subscribeFavoritesStore(listener)
        ],
        hydrators: [
            () => hydrateDiscoverySocial(getLocale()),
            () => hydrateDiscoveryComments(getLocale())
        ],
        syncFeedback: {
            root: syncFeedbackRoot,
            locale: () => getLocale(),
            bindings: [
                {
                    key: 'discoverySocial',
                    label: { 'zh-CN': '发现社交', 'en-US': 'Discovery Social' },
                    getState: () => getDiscoverySocialSyncState(),
                    subscribe: (listener) => subscribeDiscoverySocialSyncState(listener),
                    retry: () => retryDiscoverySocialSync(getLocale())
                },
                {
                    key: 'discoveryComments',
                    label: { 'zh-CN': '帖子评论', 'en-US': 'Post Comments' },
                    getState: () => getDiscoveryCommentSyncState(),
                    subscribe: (listener) => subscribeDiscoveryCommentSyncState(listener),
                    retry: () => retryDiscoveryCommentSync(getLocale())
                }
            ]
        }
    })

    return {
        ...binding,
        teardown() {
            binding.teardown()
            listenerCleanups.forEach((cleanup) => cleanup())
        }
    }
}
