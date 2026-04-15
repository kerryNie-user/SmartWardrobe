function normalizeTone(tone) {
    if (tone === 'success') return 'success'
    if (tone === 'warning') return 'warning'
    if (tone === 'error') return 'error'
    return 'info'
}

export function renderFormNotice(input) {
    if (!input) return ''

    const tone = input.tone || 'info'
    const title = input.title
    const message = input.message
    const actions = Array.isArray(input.actions) ? input.actions : []
    const normalizedTone = normalizeTone(tone)
    const hasBody = Boolean(title || message)

    if (!hasBody) {
        return ''
    }

    return `
        <div class="ct-form-notice" data-ct-form-notice-panel data-tone="${normalizedTone}">
            <div class="ct-form-notice__body">
                ${title ? `<strong class="ct-form-notice__title">${title}</strong>` : ''}
                ${message ? `<p class="ct-form-notice__message">${message}</p>` : ''}
            </div>
            ${actions.length ? `
                <div class="ct-form-notice__actions">
                    ${actions.map((action) => `
                        <button class="ct-form-notice__action${action.variant === 'secondary' ? ' is-secondary' : ''}" type="button" data-ct-form-notice-action="${action.key}">
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `
}

export function bindFormNoticeActions(root, handlers = {}) {
    if (!root) return () => {}

    const handleClick = (event) => {
        const action = event.target.closest('[data-ct-form-notice-action]')
        if (!action) return

        const key = action.getAttribute('data-ct-form-notice-action')
        const handler = handlers[key]
        if (typeof handler === 'function') {
            handler(event)
        }
    }

    root.addEventListener('click', handleClick)
    return () => root.removeEventListener('click', handleClick)
}
