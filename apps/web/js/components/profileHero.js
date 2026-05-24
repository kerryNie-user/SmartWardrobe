import { getLocale, getSharedCopy } from '../lib/locale.js';

function renderAvatar(profile) {
    if (profile.avatar) {
        return `<img class="ct-profile-hero__avatar" src="${profile.avatar}" alt="${profile.name}">`;
    }

    const initial = String(profile.name || 'CT').trim().slice(0, 2).toUpperCase();
    return `<span class="ct-profile-hero__avatar-placeholder" aria-hidden="true">${initial}</span>`;
}

export function renderProfileHero(profile) {
    const sharedCopy = getSharedCopy(getLocale());
    return `
        <section class="ct-profile-hero">
            <div class="ct-profile-hero__avatar-frame">
                ${renderAvatar(profile)}
            </div>
            <div class="ct-profile-hero__content">
                <span class="ct-eyebrow">${profile.label}</span>
                <h1 class="ct-profile-hero__name">${profile.name}</h1>
                <p class="ct-profile-hero__bio">${profile.bio}</p>
                <a class="ct-profile-hero__action" href="profile-edit.html">${sharedCopy.actions.editProfile}</a>
            </div>
        </section>
    `;
}
