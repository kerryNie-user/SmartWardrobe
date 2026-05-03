import { getLocale, getSharedCopy } from '../lib/locale.js';

export function renderBottomNav(activePage = 'home') {
    const sharedCopy = getSharedCopy(getLocale());
    const items = [
        { key: 'home', icon: '⌂', label: sharedCopy.nav.home, href: 'index.html' },
        { key: 'discovery', icon: '◇', label: sharedCopy.nav.discovery, href: 'discovery.html' },
        { key: 'me', icon: '◐', label: sharedCopy.nav.me, href: 'me.html' }
    ];

    return `
        <div class="ct-bottom-nav">
            <ul class="ct-bottom-nav__list">
                ${items.map((item) => `
                    <li class="ct-bottom-nav__list-item">
                        <a
                            class="ct-bottom-nav__item${item.key === activePage ? ' is-active' : ''}"
                            href="${item.href}"
                            ${item.key === activePage ? 'aria-current="page"' : ''}
                        >
                            <span>${item.icon}</span>
                            <span>${item.label}</span>
                        </a>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
}
