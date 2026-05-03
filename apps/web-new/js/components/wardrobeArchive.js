import { getLocale, getSharedCopy } from '../lib/locale.js';
import { getWardrobeLayoutPreference } from '../lib/settingsStore.js';
import { renderStatePanel } from './statePanel.js';
import { renderLoadFailedPanel } from './errorPanel.js';

export function renderWardrobeArchive(items, syncState = null) {
    const sharedCopy = getSharedCopy(getLocale());
    const locale = getLocale();
    const layout = getWardrobeLayoutPreference();
    if (!items.length) {
        if (syncState?.status === 'failed') {
            const message = String(syncState?.error || '').trim();
            return renderLoadFailedPanel(message, getLocale() === 'zh-CN' ? '衣橱加载失败。' : 'Failed to load wardrobe.');
        }
        return renderStatePanel({
            kind: 'empty',
            eyebrow: sharedCopy.misc.noPieces,
            description: getLocale() === 'zh-CN' ? '添加一件单品，继续扩充这份衣橱档案。' : 'Add an item to keep building this archive.'
        });
    }

    return `
        <ul class="ct-wardrobe-archive" data-ct-layout="${layout}">
            ${items.map((item) => `
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
                                    <button class="ct-wardrobe-card__favorite${item.favorite ? ' is-active' : ''}" type="button" data-ct-toggle-wardrobe-favorite="${item.id}" aria-label="${item.favorite ? (locale === 'zh-CN' ? `取消收藏 ${item.title}` : `Remove ${item.title} from favorites`) : (locale === 'zh-CN' ? `收藏 ${item.title}` : `Favorite ${item.title}`)}" aria-pressed="${item.favorite ? 'true' : 'false'}">${item.favorite ? '★' : '◇'}</button>
                                    <a class="ct-wardrobe-card__edit" data-ct-edit-wardrobe href="wardrobe-item.html?id=${item.id}">${getLocale() === 'zh-CN' ? '编辑' : 'Edit'}</a>
                                    <button class="ct-wardrobe-card__delete" type="button" data-ct-delete-wardrobe="${item.id}" aria-label="${sharedCopy.actions.delete} ${item.title}">${sharedCopy.actions.delete}</button>
                                </div>
                            </div>
                            <dl class="ct-wardrobe-card__meta">
                                <div class="ct-wardrobe-card__meta-item"><dt>${getLocale() === 'zh-CN' ? '尺码' : 'Size'}</dt><dd>${item.size}</dd></div>
                                <div class="ct-wardrobe-card__meta-item"><dt>${getLocale() === 'zh-CN' ? '颜色' : 'Color'}</dt><dd>${item.color}</dd></div>
                                <div class="ct-wardrobe-card__meta-item"><dt>${getLocale() === 'zh-CN' ? '材质' : 'Material'}</dt><dd>${item.material}</dd></div>
                            </dl>
                        </div>
                    </article>
                </li>
            `).join('')}
        </ul>
    `;
}
