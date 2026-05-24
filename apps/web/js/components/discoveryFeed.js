import { getLocale, getSharedCopy, getUiCopy } from '../lib/locale.js';
import { renderStatePanel } from './statePanel.js';
import { renderLoadFailedPanel } from './errorPanel.js';

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function normalizeCaption(value) {
    if (Array.isArray(value)) {
        for (const item of value) {
            const text = normalizeCaption(item);
            if (text) return text;
        }
        return '';
    }
    if (value && typeof value === 'object') {
        const preferredKeys = ['zh-CN', 'zh_CN', 'zh', 'caption_zh', 'image_caption_zh', 'caption', 'image_caption', 'text', 'en-US', 'en_US', 'en'];
        for (const key of preferredKeys) {
            const text = normalizeCaption(value[key]);
            if (text) return text;
        }
        return '';
    }
    return String(value ?? '').trim();
}

function renderEmptyState() {
    const locale = getLocale();
    const sharedCopy = getSharedCopy(locale);
    const uiCopy = getUiCopy(locale);
    return renderStatePanel({
        kind: 'empty',
        eyebrow: sharedCopy.misc.noMatch,
        description: uiCopy.states.discoveryNoMatchDescription
    });
}

function collectCaptionMap(item) {
    const captionMap = new Map();
    const paragraphs = Array.isArray(item?.ai?.paragraphs) ? item.ai.paragraphs : [];
    for (const paragraph of paragraphs) {
        const urls = Array.isArray(paragraph?.image_urls) ? paragraph.image_urls : [];
        const captions = paragraph?.image_captions || paragraph?.imageCaptions || paragraph?.captions || [];
        for (let idx = 0; idx < urls.length; idx += 1) {
            const url = String(urls[idx] || '').trim();
            if (!url || captionMap.has(url)) continue;
            const caption = normalizeCaption(captions[idx] || '');
            if (caption) {
                captionMap.set(url, caption);
            }
        }
    }
    const heroUrl = String(item?.ai?.hero?.image_url || '').trim();
    const heroCaption = normalizeCaption(item?.ai?.hero?.caption || '');
    if (heroUrl && heroCaption && !captionMap.has(heroUrl)) {
        captionMap.set(heroUrl, heroCaption);
    }
    return captionMap;
}

function renderDiscoveryMedia(url, alt, caption, size = 'main') {
    const safeUrl = String(url || '').trim();
    if (!safeUrl) return '';
    const visibleCaption = size === 'feature' ? normalizeCaption(caption) : '';
    const fallbackText = getUiCopy(getLocale()).image.unavailable;
    const loading = size === 'feature' ? 'eager' : 'lazy';
    return `
        <figure class="ct-discovery-post__figure ct-discovery-post__figure--${size}">
            <div class="ct-discovery-post__frame">
                <img class="ct-discovery-post__image" src="${escapeHtml(safeUrl)}" alt="${escapeHtml(String(alt || '').trim() || visibleCaption)}" loading="${loading}" decoding="async" draggable="false" onerror="this.hidden=true;const fallback=this.nextElementSibling;if(fallback){fallback.hidden=false;}this.parentElement&&this.parentElement.parentElement&&this.parentElement.parentElement.classList.add('is-broken');">
                <div class="ct-discovery-post__fallback" hidden aria-hidden="true">${escapeHtml(fallbackText)}</div>
            </div>
            ${visibleCaption ? `<figcaption class="ct-discovery-post__caption">${escapeHtml(visibleCaption)}</figcaption>` : ''}
        </figure>
    `;
}

function renderPostCards(items) {
    const locale = getLocale();
    const sharedCopy = getSharedCopy(locale);
    const uiCopy = getUiCopy(locale);
    return `
        <ul class="ct-discovery-posts">
            ${items.map((item) => {
                const images = (Array.isArray(item.images) ? item.images : [])
                    .map((url) => String(url || '').trim())
                    .filter(Boolean);
                const captionMap = collectCaptionMap(item);
                const thumbImages = images.slice(0, 3);
                const media = thumbImages.length
                    ? `
                        <div class="ct-discovery-post__media is-thumb-feature3">
                            <div class="ct-discovery-post__feature-main">
                                ${renderDiscoveryMedia(thumbImages[0], item.title, captionMap.get(thumbImages[0]), 'feature')}
                            </div>
                            <div class="ct-discovery-post__feature-side">
                                ${thumbImages[1] ? renderDiscoveryMedia(thumbImages[1], item.title, captionMap.get(thumbImages[1]), 'thumb') : ''}
                                ${thumbImages[2] ? renderDiscoveryMedia(thumbImages[2], item.title, captionMap.get(thumbImages[2]), 'thumb') : ''}
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
                                    <button class="ct-discovery-post__like${item.social?.isLiked ? ' is-active' : ''}" type="button" data-ct-toggle-post-like="${item.id}" aria-label="${uiCopy.post.likePost}" aria-pressed="${item.social?.isLiked ? 'true' : 'false'}">${item.social?.isLiked ? '♥' : '♡'}</button>
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
        return renderLoadFailedPanel(message, getUiCopy(getLocale()).states.discoveryLoadFailed);
    }
    if (!items.length) {
        return renderEmptyState();
    }

    return renderPostCards(items);
}
