import { getLocale, getSharedCopy } from '../lib/locale.js';
import { renderStatePanel } from './statePanel.js';

function renderEmptyState() {
    const sharedCopy = getSharedCopy(getLocale());
    return renderStatePanel({
        kind: 'empty',
        eyebrow: sharedCopy.misc.noMatch,
        description: getLocale() === 'zh-CN' ? '试试其他城市、面料、作者或轮廓关键词。' : 'Try another city, fabric note, author, or silhouette keyword.'
    });
}

function renderHotspotCards(items) {
    return `
        <ul class="ct-discovery-grid">
            ${items.map((item) => `
                <li class="ct-discovery-grid__item">
                    <article class="ct-discovery-card">
                        <div class="ct-discovery-card__media">
                            <img class="ct-discovery-card__image" src="${item.image}" alt="${item.title}">
                        </div>
                        <div class="ct-discovery-card__content">
                            <div class="ct-discovery-card__meta">
                                <span class="ct-discovery-card__tag">${item.tag}</span>
                                <span class="ct-discovery-card__rule"></span>
                                <span class="ct-discovery-card__subtag">${item.meta}</span>
                            </div>
                            <h3 class="ct-discovery-card__title">${item.title}</h3>
                            <p class="ct-discovery-card__description">${item.description}</p>
                        </div>
                    </article>
                </li>
            `).join('')}
        </ul>
    `;
}

function renderPostCards(items) {
    const sharedCopy = getSharedCopy(getLocale());
    return `
        <ul class="ct-discovery-posts">
            ${items.map((item) => `
                <li class="ct-discovery-posts__item">
                    <article class="ct-discovery-post" data-post-id="${item.id}">
                        <header class="ct-discovery-post__header">
                            <div>
                                <span class="ct-discovery-post__author">${item.author}</span>
                                <span class="ct-discovery-post__time">${item.time}</span>
                            </div>
                            <div class="ct-discovery-post__actions">
                                <button class="ct-discovery-post__favorite${item.social?.isSaved ? ' is-active' : ''}" type="button" data-ct-toggle-post-favorite="${item.id}" aria-label="${sharedCopy.actions.savePost}" aria-pressed="${item.social?.isSaved ? 'true' : 'false'}">${item.social?.isSaved ? '♥' : '♡'}</button>
                                <button class="ct-discovery-post__like${item.social?.isLiked ? ' is-active' : ''}" type="button" data-ct-toggle-post-like="${item.id}" aria-label="${getLocale() === 'zh-CN' ? '点赞帖子' : 'Like post'}" aria-pressed="${item.social?.isLiked ? 'true' : 'false'}">${item.social?.isLiked ? '♥' : '♡'}</button>
                                <button class="ct-discovery-post__share" type="button" data-ct-share-post="${item.id}" aria-label="${getLocale() === 'zh-CN' ? '分享帖子' : 'Share post'}">↗</button>
                                <button class="ct-discovery-post__more" type="button">⋯</button>
                            </div>
                        </header>
                        <a class="ct-discovery-post__link" data-ct-post-link href="post-detail.html?id=${item.id}" aria-label="${sharedCopy.actions.openDetailPage}">
                        <div class="ct-discovery-post__media${item.images.length > 1 ? ' is-split' : ''}">
                            ${item.images.map((image) => `
                                <div class="ct-discovery-post__frame">
                                    <img class="ct-discovery-post__image" src="${image}" alt="${item.title}">
                                </div>
                            `).join('')}
                        </div>
                        <div class="ct-discovery-post__body">
                            <h3 class="ct-discovery-post__title">${item.title}</h3>
                            <p class="ct-discovery-post__description">${item.description}</p>
                            <div class="ct-discovery-post__stats">
                                <span>♥ ${item.social?.likesDisplay || item.stats.likes}</span>
                                <span>✦ ${item.social?.commentsDisplay || item.stats.comments}</span>
                                <span data-ct-share-feedback="${item.id}">${item.social?.shareFeedback || `↗ ${sharedCopy.actions.share}`}</span>
                            </div>
                        </div>
                        </a>
                    </article>
                </li>
            `).join('')}
        </ul>
    `;
}

export function renderDiscoveryFeed(activeTab, items) {
    if (!items.length) {
        return renderEmptyState();
    }

    if (activeTab === 'posts' || activeTab === 'editorials') {
        return renderPostCards(items);
    }

    return renderHotspotCards(items);
}
