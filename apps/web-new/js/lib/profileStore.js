import { createProfileLocalRepository, getFallbackProfile } from './profileLocalRepository.js';
import { createProfileRemoteRepository } from './profileRemoteRepository.js';
import { createProfileService } from './profileService.js';
import { createSyncController } from './syncState.js';
import { getCurrentUserScope } from './userScopedStorage.js';

const FALLBACK_AVATAR = '/uploads/shared/elara-vance.jpg';
const profileListeners = new Set();
const profileSyncController = createSyncController();

function notifyProfileStore(profile) {
    profileListeners.forEach((listener) => listener(profile));
}

const profileLocalRepository = createProfileLocalRepository()
const profileRemoteRepository = createProfileRemoteRepository()
const profileService = createProfileService({
    localRepository: profileLocalRepository,
    remoteRepository: profileRemoteRepository,
    syncController: profileSyncController,
    onStateChange: (profile) => notifyProfileStore(profile)
})

export function getProfile(locale = 'en-US') {
    return profileLocalRepository.read(locale)
}

export function getFallbackAvatar() {
    return FALLBACK_AVATAR;
}

export function subscribeProfileStore(listener) {
    profileListeners.add(listener);
    return () => {
        profileListeners.delete(listener);
    };
}

export async function hydrateProfile(locale = 'en-US') {
    return profileService.hydrate(locale)
}

export function saveProfile(profile, locale = 'en-US') {
    const nextProfile = profileLocalRepository.write(profile, locale, getCurrentUserScope());
    notifyProfileStore(nextProfile);
    void profileService.save(nextProfile, locale);
    return nextProfile;
}

export function getProfileSyncState() {
    return profileSyncController.getState();
}

export function subscribeProfileSyncState(listener) {
    return profileSyncController.subscribe(listener);
}

export async function retryProfileSync(locale = 'en-US') {
    return profileService.retry(locale);
}
