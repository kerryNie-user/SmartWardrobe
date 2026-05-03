import { getLocale, getSharedCopy } from '../lib/locale.js';

export function renderSettingsProfile(profile) {
    const sharedCopy = getSharedCopy(getLocale());
    return `
        <section class="ct-settings-profile">
            <div class="ct-settings-profile__avatar-frame">
                <img class="ct-settings-profile__avatar" src="${profile.avatar}" alt="${profile.name}">
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
