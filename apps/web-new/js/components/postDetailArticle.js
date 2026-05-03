import { getLocale, getSharedCopy } from '../lib/locale.js'

export function renderPostDetailArticle(post, social, detailState = {}) {
    const sharedCopy = getSharedCopy(getLocale())
    const heroUrl = post.heroImage || post.images?.[0] || ''

    return `
        <article class="ct-post-detail">
            <header class="ct-post-detail__header">
                <div>
                    <span class="ct-post-detail__author">${post.author}</span>
                    <span class="ct-post-detail__time">${post.time}</span>
                </div>
                <button class="ct-post-detail__follow${social.isFollowed ? ' is-active' : ''}" data-ct-post-follow type="button" aria-pressed="${social.isFollowed ? 'true' : 'false'}">${sharedCopy.actions.follow}</button>
            </header>
            <div class="ct-post-detail__hero">
                ${heroUrl ? `<img class="ct-post-detail__image" src="${heroUrl}" alt="${post.title}">` : ''}
            </div>
            <div class="ct-post-detail__copy">
                <h1 class="ct-post-detail__title">${post.title}</h1>
                <div class="ct-post-detail__body">
                    ${post.body.map((paragraph) => {
                        if (paragraph && paragraph.type === 'html') {
                            return paragraph.content;
                        }
                        return `<p>${paragraph}</p>`;
                    }).join('')}
                </div>
                <div class="ct-post-detail__tags">
                    ${post.tags.map((tag) => `<span class="ct-post-detail__tag">#${tag}</span>`).join('')}
                </div>
            </div>
            <div class="ct-post-detail__actions">
                <button class="ct-post-detail__like${social.isLiked ? ' is-active' : ''}" data-ct-post-like type="button" aria-pressed="${social.isLiked ? 'true' : 'false'}">♥ ${social.likesDisplay || post.stats.likes}</button>
                <span>✦ ${social.commentsDisplay || post.stats.comments}</span>
                <button class="ct-post-detail__share" data-ct-post-share type="button">${getLocale() === 'zh-CN' ? '↗ 分享' : '↗ Share'}</button>
                <button class="ct-post-detail__bookmark${social.isSaved ? ' is-active' : ''}" data-ct-post-bookmark type="button" aria-pressed="${social.isSaved ? 'true' : 'false'}">${social.isSaved ? '♥' : '♡'} ${sharedCopy.actions.savePost}</button>
            </div>
            <p class="ct-post-detail__feedback" data-ct-post-share-feedback>${detailState.shareFeedback || ''}</p>
        </article>
    `
}
