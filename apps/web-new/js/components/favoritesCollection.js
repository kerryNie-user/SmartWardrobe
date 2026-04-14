import { getLocale, getSharedCopy } from '../lib/locale.js'

export function renderFavoritesCollection(items, emptyState) {
    const sharedCopy = getSharedCopy(getLocale())

    if (!items.length) {
        return `
            <div class="ct-favorites-empty">
                <span class="ct-eyebrow">${emptyState.eyebrow}</span>
                <p class="ct-favorites-empty__copy">${emptyState.copy}</p>
            </div>
        `
    }

    return `
        <ul class="ct-favorites-collection">
            ${items.map((item) => `
                <li class="ct-favorites-collection__item">
                    <article class="ct-favorites-card">
                        <div class="ct-favorites-card__media">
                            <img class="ct-favorites-card__image" src="${item.image}" alt="${item.title}">
                        </div>
                        <div class="ct-favorites-card__body">
                            <h2 class="ct-favorites-card__title">${item.title}</h2>
                            <p class="ct-favorites-card__subtitle">${item.subtitle}</p>
                            <div class="ct-favorites-card__actions">
                                <button class="ct-favorites-card__remove" type="button" data-ct-remove-favorite="${item.id}" aria-label="${sharedCopy.actions.removeFavorite}">${sharedCopy.actions.removeFavorite}</button>
                            </div>
                        </div>
                    </article>
                </li>
            `).join('')}
        </ul>
    `
}
