export function renderStatePanel({ kind, eyebrow, title = '', description = '', action = null }) {
    const isLoading = kind === 'loading'
    return `
        <div class="ct-state-panel${kind === 'empty' ? ' ct-empty-state' : ''}" data-state-kind="${kind}"${isLoading ? ' aria-busy="true"' : ''}>
            <span class="ct-eyebrow">${eyebrow}</span>
            ${title ? `<h2 class="ct-state-panel__title">${title}</h2>` : ''}
            ${description ? `<p class="ct-state-panel__description">${description}</p>` : ''}
            ${action ? `<a class="ct-state-panel__action" href="${action.href || '#'}">${action.label}</a>` : ''}
        </div>
    `
}
