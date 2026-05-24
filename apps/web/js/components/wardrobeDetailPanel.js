import { getUiCopy } from '../lib/locale.js'

function buildDetailMeta(item, uiCopy) {
    return [
        { label: uiCopy.wardrobe.fields.size, value: item.size },
        { label: uiCopy.wardrobe.fields.color, value: item.color },
        { label: uiCopy.wardrobe.fields.material, value: item.material }
    ].filter((entry) => String(entry.value || '').trim())
}

export function renderWardrobeDetailPanel(item, locale) {
    const uiCopy = getUiCopy(locale)
    const metaItems = buildDetailMeta(item, uiCopy)
    return `
        <section class="ct-wardrobe-detail">
            <div class="ct-wardrobe-detail__media">
                <img class="ct-wardrobe-detail__image" src="${item.image}" alt="${item.title}">
            </div>
            <div class="ct-wardrobe-detail__content">
                <span class="ct-eyebrow">${item.category}</span>
                <h1 class="ct-wardrobe-detail__title">${item.title}</h1>
                ${metaItems.length ? `
                    <dl class="ct-wardrobe-detail__meta">
                        ${metaItems.map((entry) => `<div><dt>${entry.label}</dt><dd>${entry.value}</dd></div>`).join('')}
                    </dl>
                ` : ''}
                <div class="ct-wardrobe-detail__actions">
                    <span class="ct-wardrobe-card__badge">${item.favorite ? '★' : '◇'}</span>
                    <a class="ct-wardrobe-form__cancel-link" data-ct-edit-wardrobe-detail href="wardrobe-item.html?id=${item.id}">${uiCopy.wardrobe.editItem}</a>
                </div>
            </div>
        </section>
    `
}
