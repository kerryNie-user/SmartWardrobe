import { getLocale, getSharedCopy } from '../lib/locale.js';

function renderAvatar(profile) {
    if (profile.avatar) {
        return `<img class="ct-settings-profile__avatar" src="${profile.avatar}" alt="${profile.name}">`;
    }

    const initial = String(profile.name || 'CT').trim().slice(0, 2).toUpperCase();
    return `<span class="ct-settings-profile__avatar-placeholder" aria-hidden="true">${initial}</span>`;
}

export function renderSettingsProfile(profile) {
    const sharedCopy = getSharedCopy(getLocale());
    return `
        <section class="ct-settings-profile">
            <div class="ct-settings-profile__avatar-frame">
                ${renderAvatar(profile)}
            </div>
            <div class="ct-settings-profile__content">
                <span class="ct-eyebrow">${profile.eyebrow}</span>
                <h1 class="ct-settings-profile__name">${profile.name}</h1>
                <p class="ct-settings-profile__bio">${profile.bio}</p>
                <a class="ct-settings-profile__action" href="profile-edit.html">${sharedCopy.actions.editProfile}</a>
            </div>
        </section>
    `;
}
