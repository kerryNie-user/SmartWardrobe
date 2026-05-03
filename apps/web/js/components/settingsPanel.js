function renderToggleItem(item) {
    return `
        <li class="ct-settings-item">
            <span class="ct-settings-item__label">${item.label}</span>
            <div class="ct-settings-item__control">
                <button class="ct-settings-item__toggle${item.value ? ' is-on' : ''}" type="button" aria-pressed="${item.value}" data-settings-toggle="${item.key}">
                    <span class="ct-settings-item__knob"></span>
                </button>
            </div>
        </li>
    `;
}

function renderChoiceItem(item) {
    return `
        <li class="ct-settings-item ct-settings-item--choice">
            <span class="ct-settings-item__label">${item.label}</span>
            <div class="ct-settings-item__control ct-settings-choice__options">
                ${item.options.map((option) => `
                    <button class="ct-settings-choice__option${option.value === item.value ? ' is-active' : ''}" type="button" data-settings-choice="${item.key}" data-settings-value="${option.value}">${option.label}</button>
                `).join('')}
            </div>
        </li>
    `;
}

function renderActionItem(item) {
    return `
        <li class="ct-settings-action">
            <button class="ct-settings-action__button" type="button" data-settings-action="${item.key}">${item.label}</button>
        </li>
    `;
}

export function renderSettingsPanel(view) {
    return `
        <div class="ct-settings-panel">
            <h2 class="ct-settings-panel__heading">${view.heading}</h2>
            <ul class="ct-settings-panel__content">
                ${view.items.map((item) => {
                    if (item.type === 'toggle') return renderToggleItem(item);
                    if (item.type === 'action') return renderActionItem(item);
                    return renderChoiceItem(item);
                }).join('')}
            </ul>
        </div>
    `;
}
