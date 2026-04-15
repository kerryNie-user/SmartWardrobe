import { renderTopbar } from '../components/topbar.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { renderProfileEditor } from '../components/profileEditor.js';
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js';
import { getProfilePageContent } from '../data/profile.js';
import { applyLocaleDocument, getLocale } from '../lib/locale.js';
import { bindPageStores } from '../lib/pageStoreBinding.js';
import { createProfileEditPageContract } from '../lib/pageContracts.js';
import { getFallbackAvatar, getProfile, getProfileSyncState, hydrateProfile, retryProfileSync, saveProfile, subscribeProfileStore, subscribeProfileSyncState } from '../lib/profileStore.js';
import { navigateTo } from '../lib/navigation.js';

export function renderProfileEditPage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]');
    const editorRoot = document.querySelector('[data-ct-profile-editor]');
    const bottomNavRoot = document.querySelector('[data-ct-bottom-nav]');
    const syncFeedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'profile-edit');

    let locale = getLocale();
    let content = getProfilePageContent(locale);
    let profile = getProfile(locale);
    let status = '';
    const listenerCleanups = [];

    const paint = () => {
        locale = getLocale();
        content = getProfilePageContent(locale);
        const contract = createProfileEditPageContract({
            locale,
            content,
            profile,
            status,
            syncStates: {
                profile: getProfileSyncState()
            }
        });
        applyLocaleDocument('profileEdit', locale);

        if (topbarRoot) {
            topbarRoot.innerHTML = renderTopbar({
                leftLabel: contract.derivedView.topbar.leftLabel,
                leftIcon: '←',
                leftHref: contract.derivedView.topbar.leftHref,
                rightLabel: contract.derivedView.topbar.rightLabel,
                rightIcon: '◐',
                rightHref: ''
            });
        }

        if (editorRoot) {
            editorRoot.innerHTML = renderProfileEditor(contract.derivedView.content, contract.derivedView.profile, contract.state.status);
        }

        if (bottomNavRoot) {
            bottomNavRoot.innerHTML = renderBottomNav('me');
        }
    };

    if (!editorRoot) return;

    const handleClick = (event) => {
        const restoreButton = event.target.closest('[data-ct-profile-restore]');
        if (!restoreButton) return;

        profile = {
            ...getProfilePageContent(locale).form.fallback,
            avatar: getFallbackAvatar()
        };
        status = '';
        paint();
    };
    editorRoot.addEventListener('click', handleClick);
    listenerCleanups.push(() => editorRoot.removeEventListener('click', handleClick));

    const handleSubmit = (event) => {
        const form = event.target.closest('[data-ct-profile-form]');
        if (!form) return;
        event.preventDefault();

        const formData = new window.FormData(form);
        profile = saveProfile({
            avatar: formData.get('avatar')?.toString() || getFallbackAvatar(),
            name: formData.get('name')?.toString() || content.form.fallback.name,
            bio: formData.get('bio')?.toString() || content.form.fallback.bio
        }, locale);
        status = content.form.status.saved;
        paint();
        navigateTo('profile.html');
    };
    editorRoot.addEventListener('submit', handleSubmit);
    listenerCleanups.push(() => editorRoot.removeEventListener('submit', handleSubmit));

    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeProfileStore(listener)
        ],
        hydrators: [
            () => hydrateProfile(getLocale()).then((nextProfile) => {
                profile = nextProfile;
            })
        ],
        syncFeedback: {
            root: syncFeedbackRoot,
            locale: () => getLocale(),
            bindings: [
                {
                    key: 'profile',
                    label: { 'zh-CN': '资料', 'en-US': 'Profile' },
                    getState: () => getProfileSyncState(),
                    subscribe: (listener) => subscribeProfileSyncState(listener),
                    retry: (nextLocale) => retryProfileSync(nextLocale)
                }
            ]
        }
    });

    return {
        ...binding,
        teardown() {
            binding.teardown();
            listenerCleanups.forEach((cleanup) => cleanup());
        }
    };
}
