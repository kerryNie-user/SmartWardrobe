export function renderMeModuleFeed(items) {
    return `
        <div class="ct-me-feed">
            ${items.map((item) => `
                <div class="ct-me-feed__item">
                    ${item.href ? `
                        <a class="ct-me-feed__item-title" href="${item.href}"${item.marker ? ` data-ct-${item.marker}` : ''}>${item.title}</a>
                    ` : `
                        <span class="ct-me-feed__item-title">${item.title}</span>
                    `}
                    <p class="ct-me-feed__item-subtitle">${item.subtitle}</p>
                </div>
            `).join('')}
        </div>
    `;
}
