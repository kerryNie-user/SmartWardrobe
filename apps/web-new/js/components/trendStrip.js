export function renderTrendStrip(section) {
    return `
        <section class="ct-trend-strip" aria-label="${section.title}">
            <div class="ct-trend-strip__header">
                <div>
                    <span class="ct-eyebrow">${section.eyebrow}</span>
                    <h2 class="ct-trend-strip__title">${section.title}</h2>
                </div>
                <button class="ct-trend-strip__action" type="button">${section.action}</button>
            </div>
            <div class="ct-trend-strip__rail">
                <ul class="ct-trend-strip__list">
                ${section.items.map((item) => `
                    <li class="ct-trend-strip__item">
                        <article class="ct-trend-card">
                            <img class="ct-trend-card__image" src="${item.image}" alt="${item.title}">
                            <div class="ct-trend-card__overlay">
                                <span class="ct-trend-card__tag">${item.tag}</span>
                                <h3 class="ct-trend-card__title">${item.title}</h3>
                                <p class="ct-trend-card__description">${item.description}</p>
                            </div>
                        </article>
                    </li>
                `).join('')}
                </ul>
            </div>
        </section>
    `;
}
