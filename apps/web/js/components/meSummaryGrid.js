export function renderMeSummaryGrid(summary, stats) {
    return `
        <div class="ct-me-summary">
            <article class="ct-me-summary__primary">
                <span class="ct-eyebrow">${summary.eyebrow}</span>
                <h2 class="ct-me-summary__title">${summary.title}</h2>
                <div class="ct-me-summary__metric">
                    <span class="ct-me-summary__value">${summary.value}</span>
                    <span class="ct-me-summary__meta">${summary.meta}</span>
                </div>
                <p class="ct-me-summary__note">${summary.note}</p>
                ${summary.actionText && summary.actionHref ? `
                    <a class="ct-me-summary__action" href="${summary.actionHref}"${summary.actionMarker ? ` data-ct-${summary.actionMarker}` : ''}>
                        ${summary.actionText}
                    </a>
                ` : ''}
            </article>
            <dl class="ct-me-summary__stats">
                ${stats.map((item) => `
                    <div class="ct-me-summary__stat">
                        <dt class="ct-me-summary__stat-label">${item.label}</dt>
                        <dd class="ct-me-summary__stat-value">${item.value}</dd>
                        <dd class="ct-me-summary__stat-detail">${item.detail}</dd>
                    </div>
                `).join('')}
            </dl>
        </div>
    `;
}
