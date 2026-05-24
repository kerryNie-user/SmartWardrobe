export function renderSecondaryTabs(tabs, label = 'Section Tabs') {
    return `
        <div class="ct-tab-list ct-home-tabs" role="tablist" aria-label="${label}">
            <div class="ct-tab-list__track">
                ${tabs.map((tab) => `
                    <button
                        class="ct-tab${tab.active ? ' is-active' : ''}"
                        type="button"
                        id="${tab.tabId || ''}"
                        role="tab"
                        data-tab-key="${tab.key}"
                        data-tab="${tab.key}"
                        aria-selected="${tab.active ? 'true' : 'false'}"
                        aria-controls="${tab.panelId || ''}"
                        tabindex="${tab.active ? '0' : '-1'}"
                    >
                        <span class="ct-tab__label">${tab.label}</span>
                        ${typeof tab.count === 'number' ? `<span class="ct-tab__count">${String(tab.count).padStart(2, '0')}</span>` : ''}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}
