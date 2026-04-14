import { getLocale, getSharedCopy } from '../lib/locale.js'

export function renderOutfitDetailPanel(look, isSaved, alternatives = []) {
    const sharedCopy = getSharedCopy(getLocale())

    return `
        <article class="ct-outfit-detail">
            <div class="ct-outfit-detail__media">
                <img class="ct-outfit-detail__image" src="${look.image}" alt="${look.title}">
                <button class="ct-outfit-detail__save${isSaved ? ' is-active' : ''}" data-ct-outfit-save type="button" aria-pressed="${isSaved ? 'true' : 'false'}">${isSaved ? '♥' : '♡'} ${sharedCopy.actions.saveLook}</button>
            </div>
            <div class="ct-outfit-detail__content">
                <span class="ct-outfit-detail__serial">${look.detailSerial}</span>
                <h1 class="ct-outfit-detail__title">${look.title}</h1>
                <p class="ct-outfit-detail__description">${look.description}</p>
                <div class="ct-outfit-detail__tags">
                    ${look.detailTags.map((tag) => `<span class="ct-outfit-detail__tag">${tag}</span>`).join('')}
                </div>
                <section class="ct-outfit-detail__breakdown">
                    <h2 class="ct-outfit-detail__heading">${getLocale() === 'zh-CN' ? '搭配拆解' : 'The Breakdown'}</h2>
                    <ul class="ct-outfit-detail__list">
                        ${look.breakdown.map((item) => `
                            <li class="ct-outfit-detail__item">
                                <strong class="ct-outfit-detail__item-title">${item.title}</strong>
                                <span class="ct-outfit-detail__item-meta">${item.meta}</span>
                                <span class="ct-outfit-detail__item-note">${item.note}</span>
                            </li>
                        `).join('')}
                    </ul>
                </section>
                <div class="ct-outfit-detail__actions">
                    <button class="ct-outfit-detail__primary" data-ct-outfit-add-to-schedule type="button">${sharedCopy.actions.addToSchedule}</button>
                    <button class="ct-outfit-detail__secondary" data-ct-outfit-see-alternatives type="button">${sharedCopy.actions.seeAlternatives}</button>
                </div>
                ${alternatives.length ? `
                    <section class="ct-outfit-detail__alternatives" data-ct-outfit-alternatives>
                        <h2 class="ct-outfit-detail__heading">${getLocale() === 'zh-CN' ? '替代搭配' : 'Alternative Pairings'}</h2>
                        <div class="ct-outfit-detail__alternative-grid">
                            ${alternatives.map((item) => `
                                <a class="ct-outfit-detail__alternative-card" data-ct-outfit-alternative-card href="outfit-detail.html?id=${item.id}">
                                    <img class="ct-outfit-detail__alternative-image" src="${item.image}" alt="${item.title}">
                                    <span class="ct-outfit-detail__alternative-title">${item.title}</span>
                                    <span class="ct-outfit-detail__alternative-note">${item.description}</span>
                                </a>
                            `).join('')}
                        </div>
                    </section>
                ` : ''}
            </div>
        </article>
    `
}
