import { getWardrobeContent } from '../data/wardrobe.js';
import { renderTopbar } from '../components/topbar.js';
import { renderSecondaryTabs } from '../components/secondaryTabs.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { renderWardrobeHero } from '../components/wardrobeHero.js';
import { renderWardrobeArchive } from '../components/wardrobeArchive.js';
import { renderSearchBar } from '../components/searchBar.js';
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js';
import { applyLocaleDocument, getLocale, getSharedCopy, getUiCopy } from '../lib/locale.js';
import { bindPageStores } from '../lib/pageStoreBinding.js';
import { createWardrobePageContract } from '../lib/pageContracts.js';
import { buildWardrobePageSelectorInput } from '../lib/wardrobeSelectors.js';
import { deleteWardrobeItem, getWardrobeItems, getWardrobeSyncState, hydrateWardrobe, retryWardrobeSync, subscribeWardrobeStore, subscribeWardrobeSyncState, toggleWardrobeFavorite } from '../lib/wardrobeStore.js';
import { hydrateSettings, subscribeSettingsStore } from '../lib/settingsStore.js';

export function renderWardrobePage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]');
    const syncFeedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'wardrobe');
    const heroRoot = document.querySelector('[data-ct-wardrobe-hero]');
    const searchRoot = document.querySelector('[data-ct-wardrobe-search]');
    const tabsRoot = document.querySelector('[data-ct-wardrobe-tabs]');
    const archiveRoot = document.querySelector('[data-ct-wardrobe-archive]');
    const bottomNavRoot = document.querySelector('[data-ct-bottom-nav]');

    let activeTab = 'all';
    let query = '';

    const paint = () => {
        const locale = getLocale();
        const sharedCopy = getSharedCopy(locale);
        const uiCopy = getUiCopy(locale);
        const content = getWardrobeContent(locale);
        const items = getWardrobeItems(locale).map((item) => ({ ...item }));
        const selectorInput = buildWardrobePageSelectorInput({
            locale,
            activeTab,
            query,
            content,
            items,
            syncStates: {
                wardrobe: getWardrobeSyncState()
            }
        })
        const contract = createWardrobePageContract({
            ...selectorInput,
            searchedItems: selectorInput.visibleItems
        });
        const activeTabState = contract.derivedView.tabs.find((tab) => tab.active) || contract.derivedView.tabs[0];

        applyLocaleDocument('wardrobe', locale);
        if (topbarRoot) {
            topbarRoot.innerHTML = renderTopbar({
                leftLabel: uiCopy.topbar.backToMe,
                leftIcon: '←',
                leftHref: 'me.html',
                rightLabel: uiCopy.topbar.inventoryFocus,
                rightIcon: '+',
                rightHref: ''
            });
        }
        activeTab = selectorInput.activeTab;

        if (heroRoot) heroRoot.innerHTML = renderWardrobeHero(content.hero);
        if (searchRoot) searchRoot.innerHTML = renderSearchBar(uiCopy.wardrobe.searchPlaceholder, query);
        if (tabsRoot) tabsRoot.innerHTML = renderSecondaryTabs(contract.derivedView.tabs, sharedCopy.tabs.wardrobe);
        if (bottomNavRoot) bottomNavRoot.innerHTML = renderBottomNav('me');
        if (archiveRoot) {
            archiveRoot.id = activeTabState.panelId;
            archiveRoot.setAttribute('role', 'tabpanel');
            archiveRoot.setAttribute('aria-labelledby', activeTabState.tabId);
            archiveRoot.innerHTML = renderWardrobeArchive(contract.derivedView.archiveItems, getWardrobeSyncState());
        }
    };

    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeWardrobeStore(listener),
            (listener) => subscribeSettingsStore(listener),
            (listener) => subscribeWardrobeSyncState(listener)
        ],
        hydrators: [
            () => hydrateWardrobe(getLocale()),
            () => hydrateSettings()
        ],
        syncFeedback: {
            root: syncFeedbackRoot,
            locale: () => getLocale(),
            bindings: [
                {
                    key: 'wardrobe',
                    domainKey: 'wardrobe',
                    getState: () => getWardrobeSyncState(),
                    subscribe: (listener) => subscribeWardrobeSyncState(listener),
                    retry: (locale) => retryWardrobeSync(locale)
                }
            ]
        }
    });

    if (tabsRoot) {
        tabsRoot.addEventListener('click', (event) => {
            const target = event.target.closest('[data-tab-key]');
            if (!target) return;
            activeTab = target.getAttribute('data-tab-key') || 'all';
            binding.paintNow();
        });
    }

    if (searchRoot) {
        searchRoot.addEventListener('input', (event) => {
            const target = event.target.closest('.ct-search-bar__input');
            if (!target) return;
            query = target.value;
            binding.paintNow();
        });
    }

    if (archiveRoot) {
        archiveRoot.addEventListener('click', (event) => {
            const favoriteTarget = event.target.closest('[data-ct-toggle-wardrobe-favorite]');
            if (favoriteTarget) {
                const itemId = favoriteTarget.getAttribute('data-ct-toggle-wardrobe-favorite');
                const locale = getLocale();
                toggleWardrobeFavorite(itemId, locale);
                binding.paintNow();
                return;
            }

            const target = event.target.closest('[data-ct-delete-wardrobe]');
            if (!target) return;

            const itemId = target.getAttribute('data-ct-delete-wardrobe');
            const locale = getLocale();
            deleteWardrobeItem(itemId, locale);
            binding.paintNow();
        });
    }

    return {
        ...binding,
        teardown() {
            binding.teardown();
        }
    };
}
