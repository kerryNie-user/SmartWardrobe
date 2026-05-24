function renderFocusStats(stats = []) {
    return stats.map((item) => `
        <div class="ct-me-focus__stat">
            <span class="ct-me-focus__stat-value">${item.value}</span>
            <span class="ct-me-focus__stat-label">${item.label}</span>
            <span class="ct-me-focus__stat-detail">${item.detail}</span>
        </div>
    `).join('');
}

function renderQuickLinks(quickLinks) {
    return `
        <section class="ct-me-dashboard__section" aria-labelledby="ct-me-quick-title">
            <div class="ct-me-section-heading">
                <h2 id="ct-me-quick-title">${quickLinks.title}</h2>
            </div>
            <div class="ct-me-quick-grid">
                ${quickLinks.items.map((item) => `
                    <a class="ct-me-quick-link" href="${item.href}" data-ct-me-entry="${item.key}">
                        <span class="ct-me-quick-link__icon" aria-hidden="true">${item.icon}</span>
                        <span class="ct-me-quick-link__body">
                            <span class="ct-me-quick-link__label">${item.label}</span>
                            <span class="ct-me-quick-link__value">${item.value}</span>
                            <span class="ct-me-quick-link__detail">${item.detail}</span>
                        </span>
                    </a>
                `).join('')}
            </div>
        </section>
    `;
}

function renderRecent(recent) {
    const items = recent.items || [];

    return `
        <section class="ct-me-dashboard__section" aria-labelledby="ct-me-recent-title">
            <div class="ct-me-section-heading">
                <h2 id="ct-me-recent-title">${recent.title}</h2>
            </div>
            ${items.length ? `
                <ul class="ct-me-recent-list">
                    ${items.map((item) => `
                        <li class="ct-me-recent-list__item">
                            <a class="ct-me-recent-link" href="${item.href}">
                                <span class="ct-me-recent-link__type">${item.type}</span>
                                <span class="ct-me-recent-link__body">
                                    <span class="ct-me-recent-link__title">${item.title}</span>
                                    <span class="ct-me-recent-link__meta">${item.meta}</span>
                                </span>
                                <span class="ct-me-recent-link__arrow" aria-hidden="true">›</span>
                            </a>
                        </li>
                    `).join('')}
                </ul>
            ` : `
                <div class="ct-me-recent-empty">
                    <p class="ct-me-recent-empty__title">${recent.emptyTitle}</p>
                    <p class="ct-me-recent-empty__meta">${recent.emptyMeta}</p>
                </div>
            `}
        </section>
    `;
}

export function renderMeDashboard(dashboard) {
    const focus = dashboard.focus;

    return `
        <div class="ct-me-dashboard">
            <section class="ct-me-focus" aria-labelledby="ct-me-focus-title">
                <div class="ct-me-focus__main">
                    <span class="ct-me-focus__label">${focus.label}</span>
                    <h2 id="ct-me-focus-title" class="ct-me-focus__title">${focus.title}</h2>
                    <p class="ct-me-focus__primary">${focus.primary}</p>
                    <p class="ct-me-focus__meta">${focus.meta}</p>
                    <p class="ct-me-focus__note">${focus.note}</p>
                    <a class="ct-me-focus__action" href="${focus.actionHref}" data-ct-me-entry="schedule">
                        ${focus.actionText}
                    </a>
                </div>
                <div class="ct-me-focus__stats">
                    ${renderFocusStats(focus.stats)}
                </div>
            </section>
            ${renderQuickLinks(dashboard.quickLinks)}
            ${renderRecent(dashboard.recent)}
        </div>
    `;
}
