export function renderAuthForm(config) {
    return `
        <section class="ct-auth-shell" data-ct-auth-shell>
            <div class="ct-auth-shell__intro">
                <span class="ct-eyebrow">${config.eyebrow}</span>
                <h1 class="ct-auth-shell__title">${config.title}</h1>
                <p class="ct-auth-shell__note">${config.note}</p>
            </div>
            <form class="ct-auth-form" data-ct-auth-form>
                ${config.fields.map((field) => `
                    <label class="ct-auth-form__field">
                        <span>${field.label}</span>
                        <input name="${field.name}" type="${field.type}" placeholder="${field.placeholder}" autocomplete="${field.autocomplete}">
                    </label>
                `).join('')}
                <p class="ct-auth-form__status" data-ct-auth-status>${config.status || ''}</p>
                <div class="ct-auth-form__actions">
                    <button class="ct-auth-form__submit" type="submit">${config.submitLabel}</button>
                    <a class="ct-auth-form__switch" href="${config.switchHref}">${config.switchLabel}</a>
                </div>
            </form>
        </section>
    `
}
