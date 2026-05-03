import { getLocale, getSharedCopy } from '../lib/locale.js';

export function renderProfileHero(profile) {
    const sharedCopy = getSharedCopy(getLocale());
    return `
        <section class="ct-profile-hero">
            <div class="ct-profile-hero__avatar-frame">
                <img class="ct-profile-hero__avatar" src="${profile.avatar}" alt="${profile.name}">
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
