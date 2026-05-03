import { getLocale, getSharedCopy } from '../lib/locale.js';

export function renderSearchBar(placeholder, value = '') {
    const sharedCopy = getSharedCopy(getLocale());
    return `
        <form class="ct-search-bar" role="search">
            <label class="ct-search-bar__label" for="ct-discovery-search">${sharedCopy.misc.searchLabel}</label>
            <div class="ct-search-bar__surface">
                <div class="ct-search-bar__icon-shell" aria-hidden="true">⌕</div>
                <input id="ct-discovery-search" class="ct-search-bar__input" type="text" name="query" value="${value}" placeholder="${placeholder}" aria-label="${sharedCopy.misc.searchLabel}">
            </div>
        </form>
    `;
}
