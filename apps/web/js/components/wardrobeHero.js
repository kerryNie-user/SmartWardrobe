import { getLocale, getSharedCopy } from '../lib/locale.js';

export function renderWardrobeHero(hero, form = '') {
    const sharedCopy = getSharedCopy(getLocale());
    const quickAddCopy = getLocale() === 'zh-CN' ? '快速新增' : 'Quick Add';
    return `
        <section class="ct-wardrobe-hero">
            <div class="ct-wardrobe-hero__intro">
                <span class="ct-eyebrow">${hero.eyebrow}</span>
                <h1 class="ct-wardrobe-hero__title">${hero.title}</h1>
                <p class="ct-wardrobe-hero__note">${hero.note}</p>
            </div>
            <div class="ct-wardrobe-hero__actions">
                <div class="ct-wardrobe-hero__cta-row">
                    <a class="ct-wardrobe-hero__cta" data-ct-add-wardrobe-link href="wardrobe-item.html">${sharedCopy.actions.addItem}</a>
                    <button class="ct-wardrobe-hero__ghost" type="button" data-ct-add-wardrobe>${quickAddCopy}</button>
                </div>
                <div class="ct-wardrobe-hero__scan">
                    <span class="ct-wardrobe-hero__scan-icon">⌕</span>
                    <div>
                        <span class="ct-wardrobe-hero__scan-title">${sharedCopy.misc.instantAiScan}</span>
                        <p class="ct-wardrobe-hero__scan-copy">${sharedCopy.misc.instantAiScanCopy}</p>
                    </div>
                </div>
            </div>
            ${form}
        </section>
    `;
}
