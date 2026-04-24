export function renderFavoritesSummary(summary, stats) {
    return `
        <section class="ct-favorites-summary">
            <article class="ct-favorites-summary__primary">
                <span class="ct-eyebrow">${summary.eyebrow}</span>
                <h1 class="ct-favorites-summary__title">${summary.title}</h1>
                <p class="ct-favorites-summary__note">${summary.note}</p>
            </article>
            <dl class="ct-favorites-summary__stats">
                ${stats.map((item) => `
                    <div class="ct-favorites-summary__stat">
                        <dt class="ct-favorites-summary__stat-label">${item.label}</dt>
                        <dd class="ct-favorites-summary__stat-value">${item.value}</dd>
                    </div>
                `).join('')}
            </dl>
        </section>
    `
}
