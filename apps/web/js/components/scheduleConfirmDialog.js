export function renderScheduleConfirmDialog(config) {
    if (!config) return '';

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')

    return `
        <div class="ct-dialog-backdrop" data-ct-cancel-schedule-delete>
            <div class="ct-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
                <div class="ct-dialog__eyebrow">${escapeHtml(config.eyebrow)}</div>
                <h3 id="dialog-title" class="ct-dialog__title">${escapeHtml(config.title)}</h3>
                <p class="ct-dialog__description">${escapeHtml(config.description)}</p>
                <div class="ct-dialog__actions">
                    <button class="ct-btn ct-btn--secondary ct-btn--capsule" type="button" data-dialog-action="cancel" data-ct-cancel-schedule-delete>
                        ${escapeHtml(config.cancelLabel)}
                    </button>
                    <button class="ct-btn ct-btn--danger ct-btn--capsule" type="button" data-dialog-action="confirm" data-ct-confirm-schedule-delete>
                        ${escapeHtml(config.confirmLabel)}
                    </button>
                </div>
            </div>
        </div>
    `;
}
