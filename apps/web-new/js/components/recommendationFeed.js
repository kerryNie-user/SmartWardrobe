import { getLocale, getSharedCopy } from '../lib/locale.js';

export function renderRecommendationFeed(items, favoriteIds = new Set()) {
    const sharedCopy = getSharedCopy(getLocale());
    return `
        <ul class="ct-feed-list">
            ${items.map((item) => `
                <li class="ct-feed-list__item">
                    <article class="ct-feed-card" data-look-id="${item.id}">
                        <div class="ct-feed-card__media">
                            <a class="ct-feed-card__link" data-ct-look-link href="outfit-detail.html?id=${item.id}" aria-label="${item.openLabel || item.title}">
                                <img class="ct-feed-card__image" src="${item.image}" alt="${item.title}">
                            </a>
                            <button class="ct-feed-card__favorite${favoriteIds.has(item.id) ? ' is-active' : ''}" type="button" data-ct-toggle-look-favorite="${item.id}" aria-label="${sharedCopy.actions.saveLook}" aria-pressed="${favoriteIds.has(item.id) ? 'true' : 'false'}">${favoriteIds.has(item.id) ? '♥' : '♡'}</button>
                        </div>
                        <a class="ct-feed-card__link" data-ct-look-link href="outfit-detail.html?id=${item.id}" aria-label="${item.openLabel || item.title}">
                        <div class="ct-feed-card__content">
                            <span class="ct-feed-card__tag">${item.tag}</span>
                            <h2 class="ct-feed-card__title">${item.title}</h2>
                            <p class="ct-feed-card__description">${item.description}</p>
                        </div>
                        </a>
                    </article>
                </li>
            `).join('')}
        </ul>
    `;
}
