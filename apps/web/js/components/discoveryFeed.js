import { getLocale, getSharedCopy } from '../lib/locale.js';
import { renderStatePanel } from './statePanel.js';
import { renderLoadFailedPanel } from './errorPanel.js';

function renderEmptyState() {
    const sharedCopy = getSharedCopy(getLocale());
    return renderStatePanel({
        kind: 'empty',
        eyebrow: sharedCopy.misc.noMatch,
        description: getLocale() === 'zh-CN' ? '试试其他城市、面料、作者或轮廓关键词。' : 'Try another city, fabric note, author, or silhouette keyword.'
    });
}

function renderPostCards(items) {
    const sharedCopy = getSharedCopy(getLocale());
    return `
        <ul class="ct-discovery-posts">
            ${items.map((item) => {
                const images = (Array.isArray(item.images) ? item.images : [])
                    .map((url) => String(url || '').trim())
                    .filter(Boolean);
                const thumbImages = images.slice(0, 3);
                const media = thumbImages.length
                    ? `
                        <div class="ct-discovery-post__media is-thumb-feature3">
                            <div class="ct-discovery-post__feature-main">
                                ${thumbImages[0] ? `<img class="ct-discovery-post__image" src="${thumbImages[0]}" alt="${item.title}">` : ''}
                            </div>
                            <div class="ct-discovery-post__feature-side">
                                ${thumbImages[1] ? `<div class="ct-discovery-post__frame"><img class="ct-discovery-post__image" src="${thumbImages[1]}" alt="${item.title}"></div>` : ''}
                                ${thumbImages[2] ? `<div class="ct-discovery-post__frame"><img class="ct-discovery-post__image" src="${thumbImages[2]}" alt="${item.title}"></div>` : ''}
                            </div>
                        </div>
                    `
                    : '';
                return `
                    <li class="ct-discovery-posts__item">
                        <article class="ct-discovery-post" data-post-id="${item.id}">
                            <header class="ct-discovery-post__header">
                                <div>
                                    <span class="ct-discovery-post__author">${item.author}</span>
                                    <span class="ct-discovery-post__time">${item.time}</span>
                                </div>
                                <div class="ct-discovery-post__actions">
                                    <button class="ct-discovery-post__like${item.social?.isLiked ? ' is-active' : ''}" type="button" data-ct-toggle-post-like="${item.id}" aria-label="${getLocale() === 'zh-CN' ? '点赞帖子' : 'Like post'}" aria-pressed="${item.social?.isLiked ? 'true' : 'false'}">${item.social?.isLiked ? '♥' : '♡'}</button>
                                </div>
                            </header>
                            <a class="ct-discovery-post__link" data-ct-post-link href="post-detail.html?id=${item.id}" aria-label="${sharedCopy.actions.openDetailPage}">
                                <div class="ct-discovery-post__body">
                                    <h3 class="ct-discovery-post__title">${item.title}</h3>
                                    <p class="ct-discovery-post__description">${item.description}</p>
                                </div>
                                ${media}
                            </a>
                        </article>
                    </li>
                `;
            }).join('')}
        </ul>
    `;
}

export function renderDiscoveryFeed(items, syncState = null) {
    if (syncState?.status === 'failed') {
        const message = String(syncState?.error || '').trim();
        return renderLoadFailedPanel(message, getLocale() === 'zh-CN' ? '发现内容加载失败。' : 'Failed to load discovery content.');
    }
    if (!items.length) {
        return renderEmptyState();
    }

    return renderPostCards(items);
}
