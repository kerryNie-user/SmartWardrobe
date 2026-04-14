import { renderTopbar } from '../components/topbar.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { renderProfileEditor } from '../components/profileEditor.js';
import { getProfilePageContent } from '../data/profile.js';
import { applyLocaleDocument, getLocale } from '../lib/locale.js';
import { getFallbackAvatar, getProfile, hydrateProfile, saveProfile } from '../lib/profileStore.js';
import { navigateTo } from '../lib/navigation.js';

export function renderProfileEditPage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]');
    const editorRoot = document.querySelector('[data-ct-profile-editor]');
    const bottomNavRoot = document.querySelector('[data-ct-bottom-nav]');

    let locale = getLocale();
    let content = getProfilePageContent(locale);
    let profile = getProfile(locale);
    let status = '';

    const paint = () => {
        locale = getLocale();
        content = getProfilePageContent(locale);
        applyLocaleDocument('profileEdit', locale);

        if (topbarRoot) {
            topbarRoot.innerHTML = renderTopbar({
                leftLabel: locale === 'zh-CN' ? '返回资料' : 'Back to profile',
                leftIcon: '←',
                leftHref: 'profile.html',
                rightLabel: content.topbar.rightLabel,
                rightIcon: '◐',
                rightHref: ''
            });
        }

        if (editorRoot) {
            editorRoot.innerHTML = renderProfileEditor(content, profile, status);
        }

        if (bottomNavRoot) {
            bottomNavRoot.innerHTML = renderBottomNav('me');
        }
    };

    paint();

    if (!editorRoot) return;

    editorRoot.addEventListener('click', (event) => {
        const restoreButton = event.target.closest('[data-ct-profile-restore]');
        if (!restoreButton) return;

        profile = {
            ...getProfilePageContent(locale).form.fallback,
            avatar: getFallbackAvatar()
        };
        status = '';
        paint();
    });

    editorRoot.addEventListener('submit', (event) => {
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
    });

    void hydrateProfile(locale).then((nextProfile) => {
        profile = nextProfile;
        paint();
    });
}
