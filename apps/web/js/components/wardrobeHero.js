import { getLocale, getSharedCopy } from '../lib/locale.js';

export function renderWardrobeHero(hero) {
    const locale = getLocale();
    const sharedCopy = getSharedCopy(locale);
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
                </div>
            </div>
        </section>
    `;
}
