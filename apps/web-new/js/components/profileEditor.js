export function renderProfileEditor(content, profile, status = '') {
    return `
        <section class="ct-profile-editor">
            <form class="ct-profile-form" id="ct-profile-form-panel" data-ct-profile-form>
                <div class="ct-profile-form__header">
                    <h2 class="ct-profile-form__heading">${content.form.heading}</h2>
                    <div class="ct-profile-form__status" data-ct-form-notice>${status || ''}</div>
                </div>
                <div class="ct-profile-form__field">
                    <label for="ct-profile-avatar">${content.form.labels.avatar}</label>
                    <input id="ct-profile-avatar" name="avatar" type="text" value="${profile.avatar}" placeholder="${content.form.placeholders.avatar}" aria-label="${content.form.labels.avatar}">
                </div>
                <div class="ct-profile-form__field">
                    <label for="ct-profile-name">${content.form.labels.name}</label>
                    <input id="ct-profile-name" name="name" type="text" value="${profile.name}" placeholder="${content.form.placeholders.name}" aria-label="${content.form.labels.name}">
                </div>
                <div class="ct-profile-form__field">
                    <label for="ct-profile-bio">${content.form.labels.bio}</label>
                    <textarea id="ct-profile-bio" name="bio" rows="5" placeholder="${content.form.placeholders.bio}" aria-label="${content.form.labels.bio}">${profile.bio}</textarea>
                </div>
                <div class="ct-profile-form__actions">
                    <button class="ct-profile-form__restore" type="button" data-ct-profile-restore>${content.form.actions.restore}</button>
                    <button class="ct-profile-form__submit" type="submit">${content.form.actions.save}</button>
                </div>
            </form>
        </section>
    `;
}
