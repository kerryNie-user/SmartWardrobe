import { getMeContent } from '../data/me.js';
import { renderTopbar } from '../components/topbar.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { renderProfileHero } from '../components/profileHero.js';
import { renderMeDashboard } from '../components/meDashboard.js';
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js';
import { applyLocaleDocument, getLocale, getUiCopy } from '../lib/locale.js';
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
    const dashboardRoot = document.querySelector('[data-ct-me-dashboard]');
    const bottomNavRoot = document.querySelector('[data-ct-bottom-nav]');

    const paint = () => {
        const locale = getLocale();
        const content = getMeContent(locale);
        const selectorInput = buildMePageSelectorInput({
            locale,
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
                rightLabel: getUiCopy(locale).topbar.openSettings,
                rightIcon: '⚙',
                rightHref: 'settings.html'
            });
        }
        if (heroRoot) {
            heroRoot.innerHTML = renderProfileHero(contract.derivedView.hero);
        }
        if (bottomNavRoot) bottomNavRoot.innerHTML = renderBottomNav('me');
        if (dashboardRoot) {
            dashboardRoot.innerHTML = renderMeDashboard(contract.derivedView.dashboard);
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
                    domainKey: 'profile',
                    getState: () => getProfileSyncState(),
                    subscribe: (listener) => subscribeProfileSyncState(listener),
                    retry: (locale) => retryProfileSync(locale)
                },
                {
                    key: 'favorites',
                    domainKey: 'favorites',
                    getState: () => getFavoritesSyncState(),
                    subscribe: (listener) => subscribeFavoritesSyncState(listener),
                    retry: () => retryFavoritesSync()
                },
                {
                    key: 'wardrobe',
                    domainKey: 'wardrobe',
                    getState: () => getWardrobeSyncState(),
                    subscribe: (listener) => subscribeWardrobeSyncState(listener),
                    retry: (locale) => retryWardrobeSync(locale)
                },
                {
                    key: 'settings',
                    domainKey: 'settings',
                    getState: () => getSettingsSyncState(),
                    subscribe: (listener) => subscribeSettingsSyncState(listener),
                    retry: () => retrySettingsSync()
                },
                {
                    key: 'schedule',
                    domainKey: 'schedule',
                    getState: () => getScheduleSyncState(),
                    subscribe: (listener) => subscribeScheduleSyncState(listener),
                    retry: (locale) => retryScheduleSync(locale)
                }
            ]
        }
    });

    return binding;
}
