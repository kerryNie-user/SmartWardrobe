import { renderTopbar } from '../components/topbar.js';
import { renderWeatherBar } from '../components/weatherBar.js';
import { renderScheduleCard } from '../components/scheduleCard.js';
import { renderSecondaryTabs } from '../components/secondaryTabs.js';
import { renderRecommendationFeed } from '../components/recommendationFeed.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js';
import { applyLocaleDocument, getLocale, getSharedCopy } from '../lib/locale.js';
import { buildHomeRecommendationInput, selectHomeLookById, selectHomeView } from '../lib/homeSelectors.js';
import { applyLocationToWeather, getCurrentLocation } from '../lib/locationAdapter.js';
import { createHomePageContract } from '../lib/pageContracts.js';
import { bindPageStores } from '../lib/pageStoreBinding.js';
import { getFavoriteIds, getFavoritesSyncState, hydrateFavorites, retryFavoritesSync, subscribeFavoritesStore, subscribeFavoritesSyncState, toggleFavorite } from '../lib/favoritesStore.js';
import { getScheduleSummary, getScheduleSyncState, hydrateSchedule, retryScheduleSync, subscribeScheduleStore, subscribeScheduleSyncState } from '../lib/scheduleStore.js';
import { getSettingsState, subscribeSettingsStore } from '../lib/settingsStore.js';
import { getRecentWardrobeItems, getWardrobeCount, getWardrobeSyncState, hydrateWardrobe, retryWardrobeSync, subscribeWardrobeStore, subscribeWardrobeSyncState } from '../lib/wardrobeStore.js';

export function renderHomePage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]');
    const syncFeedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'home');
    const weatherRoot = document.querySelector('[data-ct-weather]');
    const scheduleRoot = document.querySelector('[data-ct-schedule]');
    const tabsRoot = document.querySelector('[data-ct-secondary-tabs]');
    const feedRoot = document.querySelector('[data-ct-recommend-feed]');
    const bottomNavRoot = document.querySelector('[data-ct-bottom-nav]');

    let activeTab = 'recommend';
    let locationResult = null;
    let locationRequested = false;

    const paint = () => {
        const locale = getLocale();
        const recommendationInput = buildHomeRecommendationInput({
            locale,
            activeTab,
            favorites: {
                lookIds: getFavoriteIds('looks')
            },
            wardrobe: {
                totalCount: getWardrobeCount(locale),
                recentItems: getRecentWardrobeItems(3, locale)
            },
            schedule: {
                nextEvent: getScheduleSummary(locale)
            },
            settings: getSettingsState()
        });
        const homeView = selectHomeView(recommendationInput);
        const contract = createHomePageContract({
            locale,
            activeTab,
            content: homeView.content,
            recommendationInput,
            homeView,
            syncStates: {
                favorites: getFavoritesSyncState(),
                wardrobe: getWardrobeSyncState(),
                schedule: getScheduleSyncState()
            }
        });
        const favoriteIds = new Set(contract.derivedView.favoriteIds);
        const activeTabState = contract.derivedView.tabs.find((tab) => tab.active) || contract.derivedView.tabs[0];
        const weatherView = applyLocationToWeather(contract.derivedView.weather, locationResult, locale);
        applyLocaleDocument('home', locale);
        if (topbarRoot) topbarRoot.innerHTML = renderTopbar();
        if (weatherRoot) weatherRoot.innerHTML = renderWeatherBar(weatherView);
        if (scheduleRoot) scheduleRoot.innerHTML = renderScheduleCard(contract.derivedView.scheduleCard);
        if (bottomNavRoot) bottomNavRoot.innerHTML = renderBottomNav('home');
        if (tabsRoot) tabsRoot.innerHTML = renderSecondaryTabs(contract.derivedView.tabs, getSharedCopy(locale).tabs.home);
        if (feedRoot) {
            feedRoot.id = activeTabState.panelId;
            feedRoot.setAttribute('role', 'tabpanel');
            feedRoot.setAttribute('aria-labelledby', activeTabState.tabId);
            feedRoot.innerHTML = renderRecommendationFeed(contract.derivedView.looks, favoriteIds);
        }
    };

    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeFavoritesStore(listener),
            (listener) => subscribeWardrobeStore(listener),
            (listener) => subscribeScheduleStore(listener),
            (listener) => subscribeSettingsStore(listener)
        ],
        hydrators: [
            () => hydrateFavorites(),
            () => hydrateWardrobe(getLocale()),
            () => hydrateSchedule()
        ],
        syncFeedback: {
            root: syncFeedbackRoot,
            locale: () => getLocale(),
            bindings: [
                {
                    key: 'favorites',
                    label: {
                        'zh-CN': '收藏',
                        'en-US': 'Favorites'
                    },
                    getState: () => getFavoritesSyncState(),
                    subscribe: (listener) => subscribeFavoritesSyncState(listener),
                    retry: () => retryFavoritesSync()
                },
                {
                    key: 'wardrobe',
                    label: {
                        'zh-CN': '衣橱',
                        'en-US': 'Wardrobe'
                    },
                    getState: () => getWardrobeSyncState(),
                    subscribe: (listener) => subscribeWardrobeSyncState(listener),
                    retry: (locale) => retryWardrobeSync(locale)
                },
                {
                    key: 'schedule',
                    label: {
                        'zh-CN': '日程',
                        'en-US': 'Schedule'
                    },
                    getState: () => getScheduleSyncState(),
                    subscribe: (listener) => subscribeScheduleSyncState(listener),
                    retry: (locale) => retryScheduleSync(locale)
                }
            ]
        }
    });

    async function requestLocation() {
        if (locationRequested) return;
        locationRequested = true;
        locationResult = await getCurrentLocation(getLocale());
        binding.paintNow();
    }

    if (tabsRoot) {
        tabsRoot.addEventListener('click', (event) => {
            const target = event.target.closest('[data-tab-key]');
            if (!target) return;
            activeTab = target.getAttribute('data-tab-key') || 'recommend';
            binding.paintNow();
        });
    }

    if (feedRoot) {
        feedRoot.addEventListener('click', (event) => {
            const favoriteButton = event.target.closest('.ct-feed-card__favorite');
            if (favoriteButton) {
                const lookId = favoriteButton.getAttribute('data-ct-toggle-look-favorite');
                const locale = getLocale();
                const item = selectHomeLookById(locale, lookId);
                if (!item) return;

                toggleFavorite('looks', {
                    id: item.id,
                    title: item.title,
                    subtitle: item.description,
                    image: item.image,
                    href: `outfit-detail.html?id=${item.id}`
                });
                binding.paintNow();
                return;
            }
        });
    }

    void requestLocation();

    return binding;
}
