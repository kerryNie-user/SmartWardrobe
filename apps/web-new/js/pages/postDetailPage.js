import { renderTopbar } from '../components/topbar.js'
import { renderPostDetailArticle } from '../components/postDetailArticle.js'
import { renderStatePanel } from '../components/statePanel.js'
import { getPostDetailContent } from '../data/postDetail.js'
import { applyLocaleDocument, getLocale, getSharedCopy } from '../lib/locale.js'
import { getQueryParam } from '../lib/navigationAdapter.js'
import { buildCanonicalHref, shareLink } from '../lib/shareAdapter.js'
import { getPostComments, savePostComment } from '../lib/discoveryCommentStore.js'
import {
    getPostSocialState,
    toggleDiscoveryFollow,
    toggleDiscoveryLike,
    toggleDiscoverySave
} from '../lib/discoveryState.js'

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
    const locale = getLocale()
    let shareFeedback = ''

    applyLocaleDocument('postDetail', locale)

    if (topbarRoot) {
        topbarRoot.innerHTML = renderTopbar({
            leftLabel: locale === 'zh-CN' ? '返回发现' : 'Back to discovery',
            leftIcon: '←',
            leftHref: 'discovery.html',
            rightLabel: locale === 'zh-CN' ? '打开个人资料' : 'Open profile',
            rightIcon: '◐',
            rightHref: 'profile.html'
        })
    }

    const paint = () => {
        const { activePost } = getPostDetailContent(locale, getPostId())
        if (!activePost) {
            if (detailRoot) {
                detailRoot.innerHTML = renderStatePanel({
                    kind: 'error',
                    eyebrow: locale === 'zh-CN' ? '帖子未找到' : 'Post Missing',
                    title: locale === 'zh-CN' ? '当前帖子不存在' : 'This post is unavailable',
                    description: locale === 'zh-CN' ? '请返回发现页重新选择帖子。' : 'Return to discovery and choose another post.',
                    action: {
                        label: locale === 'zh-CN' ? '返回发现' : 'Back to discovery',
                        href: 'discovery.html'
                    }
                })
            }
            if (commentsRoot) commentsRoot.innerHTML = ''
            return
        }

        if (detailRoot) {
            detailRoot.innerHTML = renderPostDetailArticle(activePost, getPostSocialState(activePost), { shareFeedback })
        }
        if (commentsRoot) {
            commentsRoot.innerHTML = renderComments(activePost)
        }
    }

    paint()

    if (detailRoot) {
        detailRoot.addEventListener('click', (event) => {
            const bookmark = event.target.closest('[data-ct-post-bookmark]')
            const { activePost } = getPostDetailContent(locale, getPostId())
            if (!activePost) return

            if (bookmark) {
                toggleDiscoverySave(activePost)
                paint()
                return
            }

            const likeButton = event.target.closest('[data-ct-post-like]')
            if (likeButton) {
                toggleDiscoveryLike(activePost.id)
                paint()
                return
            }

            const followButton = event.target.closest('[data-ct-post-follow]')
            if (followButton) {
                toggleDiscoveryFollow(activePost.authorId || activePost.author)
                paint()
                return
            }

            const shareButton = event.target.closest('[data-ct-post-share]')
            if (shareButton) {
                const shareUrl = buildCanonicalHref('post-detail.html', { id: activePost.id })
                shareFeedback = locale === 'zh-CN' ? '链接已复制' : 'Link copied'
                paint()
                void shareLink({
                    href: shareUrl,
                    title: activePost.title,
                    text: activePost.description
                })
            }
        })
    }

    if (commentsRoot) {
        commentsRoot.addEventListener('submit', (event) => {
            const form = event.target.closest('[data-ct-post-comment-form]')
            if (!form) return
            event.preventDefault()

            const { activePost } = getPostDetailContent(locale, getPostId())
            if (!activePost) return

            const formData = new window.FormData(form)
            const body = String(formData.get('commentBody') || '').trim()
            if (!body) return

            savePostComment(activePost.id, {
                author: locale === 'zh-CN' ? '你' : 'You',
                time: locale === 'zh-CN' ? '刚刚' : 'Just now',
                body
            })
            paint()
        })
    }
}
