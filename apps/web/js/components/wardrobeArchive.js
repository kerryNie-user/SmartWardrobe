import { formatCopy, getLocale, getSharedCopy, getUiCopy } from '../lib/locale.js';
import { getWardrobeLayoutPreference } from '../lib/settingsStore.js';
import { renderStatePanel } from './statePanel.js';
import { renderLoadFailedPanel } from './errorPanel.js';

function buildWardrobeMeta(item, uiCopy) {
    return [
        { label: uiCopy.wardrobe.fields.size, value: item.size },
        { label: uiCopy.wardrobe.fields.color, value: item.color },
        { label: uiCopy.wardrobe.fields.material, value: item.material }
    ].filter((entry) => String(entry.value || '').trim())
}

export function renderWardrobeArchive(items, syncState = null) {
    const locale = getLocale();
    const sharedCopy = getSharedCopy(locale);
    const uiCopy = getUiCopy(locale);
    const layout = getWardrobeLayoutPreference();
    if (!items.length) {
        if (syncState?.status === 'failed') {
            const message = String(syncState?.error || '').trim();
            return renderLoadFailedPanel(message, uiCopy.states.wardrobeLoadFailed);
        }
        return renderStatePanel({
            kind: 'empty',
            eyebrow: sharedCopy.misc.noPieces,
            description: uiCopy.states.wardrobeEmptyDescription
        });
    }

    return `
        <ul class="ct-wardrobe-archive" data-ct-layout="${layout}">
            ${items.map((item) => {
                const metaItems = buildWardrobeMeta(item, uiCopy)
                return `
                    <li class="ct-wardrobe-archive__item">
                        <article class="ct-wardrobe-card">
                            <div class="ct-wardrobe-card__media">
                                <img class="ct-wardrobe-card__image" src="${item.image}" alt="${item.title}">
                            </div>
                            <div class="ct-wardrobe-card__content">
                                <div class="ct-wardrobe-card__header">
                                    <div>
                                        <span class="ct-wardrobe-card__category">${item.category}</span>
                                        <h2 class="ct-wardrobe-card__title"><a class="ct-wardrobe-card__detail-link" data-ct-open-wardrobe-detail href="wardrobe-detail.html?id=${item.id}">${item.title}</a></h2>
                                    </div>
                                    <div class="ct-wardrobe-card__actions">
                                        <button class="ct-wardrobe-card__favorite${item.favorite ? ' is-active' : ''}" type="button" data-ct-toggle-wardrobe-favorite="${item.id}" aria-label="${formatCopy(item.favorite ? uiCopy.wardrobe.favoriteRemove : uiCopy.wardrobe.favoriteAdd, { title: item.title })}" aria-pressed="${item.favorite ? 'true' : 'false'}">${item.favorite ? '★' : '◇'}</button>
                                        <a class="ct-wardrobe-card__edit" data-ct-edit-wardrobe href="wardrobe-item.html?id=${item.id}">${uiCopy.wardrobe.edit}</a>
                                        <button class="ct-wardrobe-card__delete" type="button" data-ct-delete-wardrobe="${item.id}" aria-label="${sharedCopy.actions.delete} ${item.title}">${sharedCopy.actions.delete}</button>
                                    </div>
                                </div>
                                ${metaItems.length ? `
                                    <dl class="ct-wardrobe-card__meta">
                                        ${metaItems.map((entry) => `<div class="ct-wardrobe-card__meta-item"><dt>${entry.label}</dt><dd>${entry.value}</dd></div>`).join('')}
                                    </dl>
                                ` : ''}
                            </div>
                        </article>
                    </li>
                `
            }).join('')}
        </ul>
    `;
}
