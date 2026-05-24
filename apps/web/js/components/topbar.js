import { getLocale, getSharedCopy, getUiCopy } from '../lib/locale.js';
import { getCurrentPath } from '../lib/navigationAdapter.js';

function normalizeHref(value) {
    if (!value) return '';
    return value.split('?')[0].split('#')[0];
}

function isPlaceholderControl(href) {
    const normalizedHref = normalizeHref(href);
    if (!normalizedHref) {
        return true;
    }

    const currentPath = getCurrentPath();
    return normalizedHref === currentPath;
}

function renderControl({ label, icon, href }) {
    if (isPlaceholderControl(href)) {
        return `<span class="ct-icon-button is-placeholder" aria-hidden="true"></span>`;
    }

    return `<a class="ct-icon-button" href="${href}" aria-label="${label}">${icon}</a>`;
}

export function renderTopbar(options = {}) {
    const locale = getLocale();
    const sharedCopy = getSharedCopy(locale);
    const uiCopy = getUiCopy(locale);
    const {
        leftLabel = sharedCopy.topbar.openMenu,
        leftIcon = '≡',
        leftHref = '',
        rightLabel = sharedCopy.topbar.openProfile,
        rightIcon = '●',
        rightHref = 'profile.html'
    } = options;

    const leftControl = renderControl({ label: leftLabel, icon: leftIcon, href: leftHref });
    const rightControl = renderControl({ label: rightLabel, icon: rightIcon, href: rightHref });

    return `
        <div class="ct-topbar">
            ${leftControl}
            <div class="ct-topbar__brand">${uiCopy.brand}</div>
            ${rightControl}
        </div>
    `;
}
