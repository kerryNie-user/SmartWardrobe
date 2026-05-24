import { getLocale, getSharedCopy, getUiCopy } from '../lib/locale.js'
import { renderLoadFailedPanel } from './errorPanel.js'

export function renderFavoritesCollection(items, emptyState, syncState = null) {
    const locale = getLocale()
    const sharedCopy = getSharedCopy(locale)
    const uiCopy = getUiCopy(locale)

    if (!items.length) {
        if (syncState?.status === 'failed') {
            const message = String(syncState?.error || '').trim()
            return renderLoadFailedPanel(message, uiCopy.states.favoritesLoadFailed)
        }
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
