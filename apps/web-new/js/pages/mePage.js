import { getMeContent } from '../data/me.js';
import { renderTopbar } from '../components/topbar.js';
import { renderSecondaryTabs } from '../components/secondaryTabs.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { renderProfileHero } from '../components/profileHero.js';
import { renderMeSummaryGrid } from '../components/meSummaryGrid.js';
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js';
import { applyLocaleDocument, getLocale, getSharedCopy } from '../lib/locale.js';
import { bindPageStores } from '../lib/pageStoreBinding.js';
import { createMePageContract } from '../lib/pageContracts.js';
import { buildMePageSelectorInput } from '../lib/meSelectors.js';
import { getProfile, getProfileSyncState, hydrateProfile, retryProfileSync, subscribeProfileStore, subscribeProfileSyncState } from '../lib/profileStore.js';
import { getFavoritesByType, getFavoritesStats, getFavoritesSyncState, hydrateFavorites, retryFavoritesSync, subscribeFavoritesStore, subscribeFavoritesSyncState } from '../lib/favoritesStore.js';
import { getSettingsState, getSettingsSyncState, hydrateSettings, retrySettingsSync, subscribeSettingsStore, subscribeSettingsSyncState } from '../lib/settingsStore.js';
import { getScheduleFeed, getScheduleStats, getScheduleSummary, getScheduleSyncState, hydrateSchedule, retryScheduleSync, subscribeScheduleStore, subscribeScheduleSyncState } from '../lib/scheduleStore.js';
import { getRecentWardrobeItems, getWardrobeCount, getWardrobeItems, getWardrobeSyncState, hydrateWardrobe, retryWardrobeSync, subscribeWardrobeStore, subscribeWardrobeSyncState } from '../lib/wardrobeStore.js';

export function renderMePage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]');
    const syncFeedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'me');
    const heroRoot = document.querySelector('[data-ct-profile-hero]');
    const tabsRoot = document.querySelector('[data-ct-me-tabs]');
    const summaryRoot = document.querySelector('[data-ct-me-summary]');
    const bottomNavRoot = document.querySelector('[data-ct-bottom-nav]');

    let activeTab = 'schedule';

    const paint = () => {
        const locale = getLocale();
        const sharedCopy = getSharedCopy(locale);
        const content = getMeContent(locale);
        const selectorInput = buildMePageSelectorInput({
            locale,
            activeTab,
            content,
            profile: getProfile(locale),
            favoritesStats: getFavoritesStats(),
            favoriteLooks: getFavoritesByType('looks'),
            favoritePosts: getFavoritesByType('posts'),
            settingsState: getSettingsState(),
            scheduleSummary: getScheduleSummary(locale),
            scheduleStats: getScheduleStats(locale),
            scheduleFeed: getScheduleFeed(3, locale),
            wardrobeCount: getWardrobeCount(locale),
            wardrobeItems: getWardrobeItems(locale),
            recentWardrobeItems: getRecentWardrobeItems(3, locale),
            syncStates: {
                profile: getProfileSyncState(),
                favorites: getFavoritesSyncState(),
                wardrobe: getWardrobeSyncState(),
                settings: getSettingsSyncState(),
                schedule: getScheduleSyncState()
            }
        })
        const contract = createMePageContract(selectorInput);

        applyLocaleDocument('me', locale);
        if (topbarRoot) {
            topbarRoot.innerHTML = renderTopbar({
                rightLabel: locale === 'zh-CN' ? '打开设置' : 'Open Settings',
                rightIcon: '⚙',
                rightHref: 'settings.html'
            });
        }
        if (heroRoot) {
            heroRoot.innerHTML = renderProfileHero(contract.derivedView.hero);
        }
        if (bottomNavRoot) bottomNavRoot.innerHTML = renderBottomNav('me');
        const activeTabState = contract.derivedView.tabs.find((tab) => tab.active) || contract.derivedView.tabs[0];
        if (tabsRoot) tabsRoot.innerHTML = renderSecondaryTabs(contract.derivedView.tabs, sharedCopy.tabs.me);
        if (summaryRoot) {
            summaryRoot.id = activeTabState.panelId;
            summaryRoot.setAttribute('role', 'tabpanel');
            summaryRoot.setAttribute('aria-labelledby', activeTabState.tabId);
            summaryRoot.innerHTML = renderMeSummaryGrid(contract.derivedView.summary, contract.derivedView.stats);
        }
    };

    const hydrationLocale = getLocale();
    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeProfileStore(listener),
            (listener) => subscribeFavoritesStore(listener),
            (listener) => subscribeWardrobeStore(listener),
            (listener) => subscribeSettingsStore(listener),
            (listener) => subscribeScheduleStore(listener)
        ],
        hydrators: [
            () => hydrateProfile(hydrationLocale),
            () => hydrateFavorites(),
            () => hydrateWardrobe(hydrationLocale),
            () => hydrateSettings(),
            () => hydrateSchedule(hydrationLocale)
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
                    retry: (locale) => retryProfileSync(locale)
                },
                {
                    key: 'favorites',
                    label: { 'zh-CN': '收藏', 'en-US': 'Favorites' },
                    getState: () => getFavoritesSyncState(),
                    subscribe: (listener) => subscribeFavoritesSyncState(listener),
                    retry: () => retryFavoritesSync()
                },
                {
                    key: 'wardrobe',
                    label: { 'zh-CN': '衣橱', 'en-US': 'Wardrobe' },
                    getState: () => getWardrobeSyncState(),
                    subscribe: (listener) => subscribeWardrobeSyncState(listener),
                    retry: (locale) => retryWardrobeSync(locale)
                },
                {
                    key: 'settings',
                    label: { 'zh-CN': '设置', 'en-US': 'Settings' },
                    getState: () => getSettingsSyncState(),
                    subscribe: (listener) => subscribeSettingsSyncState(listener),
                    retry: () => retrySettingsSync()
                },
                {
                    key: 'schedule',
                    label: { 'zh-CN': '日程', 'en-US': 'Schedule' },
                    getState: () => getScheduleSyncState(),
                    subscribe: (listener) => subscribeScheduleSyncState(listener),
                    retry: (locale) => retryScheduleSync(locale)
                }
            ]
        }
    });

    if (tabsRoot) {
        tabsRoot.addEventListener('click', (event) => {
            const target = event.target.closest('[data-tab-key]');
            if (!target) return;
            activeTab = target.getAttribute('data-tab-key') || 'schedule';
            binding.paintNow();
        });
    }

    return binding;
}
