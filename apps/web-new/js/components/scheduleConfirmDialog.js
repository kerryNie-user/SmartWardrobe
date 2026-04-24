export function renderScheduleConfirmDialog(config) {
    if (!config) return '';

    return `
        <div class="ct-schedule-dialog" data-ct-schedule-delete-dialog>
            <div class="ct-schedule-dialog__scrim" data-ct-cancel-schedule-delete></div>
            <div class="ct-schedule-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="ct-schedule-dialog-title">
                <span class="ct-eyebrow">${config.eyebrow}</span>
                <h2 class="ct-schedule-dialog__title" id="ct-schedule-dialog-title">${config.title}</h2>
                <p class="ct-schedule-dialog__copy">${config.description}</p>
                <div class="ct-schedule-dialog__actions">
                    <button class="ct-schedule-dialog__cancel" type="button" data-ct-cancel-schedule-delete>${config.cancelLabel}</button>
                    <button class="ct-schedule-dialog__confirm" type="button" data-ct-confirm-schedule-delete>${config.confirmLabel}</button>
                </div>
            </div>
        </div>
    `;
}
