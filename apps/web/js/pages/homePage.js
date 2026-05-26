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
import { getBackendUserId } from '../lib/backendClient.js';
import { getClosetTwinRecommendationLookById, getClosetTwinRecommendationLooks, hydrateClosetTwinRecommendations, subscribeClosetTwinRecommendations } from '../lib/closetTwinRecommendations.js';
import { getScheduleSummary, getScheduleSyncState, hydrateSchedule, retryScheduleSync, subscribeScheduleStore, subscribeScheduleSyncState } from '../lib/scheduleStore.js';
import { getSettingsState, getTemperatureUnitPreference, subscribeSettingsStore } from '../lib/settingsStore.js';
import { getRecentWardrobeItems, getWardrobeCount, getWardrobeItems, getWardrobeSyncState, hydrateWardrobe, retryWardrobeSync, subscribeWardrobeStore, subscribeWardrobeSyncState } from '../lib/wardrobeStore.js';
import { getHomeContent, getHomeContentSyncState, hydrateHomeContent, retryHomeContentHydration, subscribeHomeContent, subscribeHomeContentSyncState } from '../data/home.js';

export function renderHomePage() {
    if (globalThis.localStorage && window.localStorage && globalThis.localStorage !== window.localStorage) {
        globalThis.localStorage = window.localStorage
    }
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
    let recommendationRefreshTimer = null;
    const canHydrateRemote = Boolean(getBackendUserId());

    const applyTemperatureUnit = (weather, unit = 'celsius') => {
        const normalize = (value) => {
            const match = String(value || '').trim().match(/(-?\\d+(?:\\.\\d+)?)\\s*°?([CF])/i)
            if (!match) return null
            return { value: parseFloat(match[1]), unit: match[2].toUpperCase() }
        }
        const toF = (c) => Math.round((c * 9) / 5 + 32)
        const toC = (f) => Math.round(((f - 32) * 5) / 9)
        const format = (record) => {
            if (!record) return ''
            const target = unit === 'fahrenheit' ? 'F' : 'C'
            if (record.unit === target) return `${Math.round(record.value)}°${target}`
            const converted = target === 'F' ? toF(record.value) : toC(record.value)
            return `${converted}°${target}`
        }
        const current = format(normalize(weather?.temperature?.current))
        const low = format(normalize(weather?.temperature?.low))
        const high = format(normalize(weather?.temperature?.high))
        return {
            ...weather,
            temperature: {
                current: current || weather?.temperature?.current || '',
                low: low || weather?.temperature?.low || '',
                high: high || weather?.temperature?.high || ''
            }
        }
    }

    const buildWeatherContext = (locale) => applyTemperatureUnit(
        applyLocationToWeather(getHomeContent(locale).weather, locationResult, locale),
        getTemperatureUnitPreference()
    )

    const buildRecommendationInput = () => {
        const locale = getLocale()
        return buildHomeRecommendationInput({
            locale,
            activeTab,
            favorites: {
                lookIds: getFavoriteIds('looks')
            },
            wardrobe: {
                totalCount: getWardrobeCount(locale),
                items: getWardrobeItems(locale),
                recentItems: getRecentWardrobeItems(3, locale)
            },
            schedule: {
                nextEvent: getScheduleSummary(locale)
            },
            weather: buildWeatherContext(locale),
            settings: getSettingsState()
        })
    }

    const requestClosetTwinRefresh = () => {
        if (!canHydrateRemote) return
        if (recommendationRefreshTimer) {
            window.clearTimeout(recommendationRefreshTimer)
        }
        recommendationRefreshTimer = window.setTimeout(() => {
            recommendationRefreshTimer = null
            void hydrateClosetTwinRecommendations(buildRecommendationInput())
        }, 0)
    }

    const paint = () => {
        const locale = getLocale();
        const recommendationInput = buildRecommendationInput();
        const homeView = selectHomeView(recommendationInput);
        const closetTwinLooks = activeTab === 'recommend' ? getClosetTwinRecommendationLooks() : [];
        const renderedLooks = closetTwinLooks.length ? closetTwinLooks : homeView.looks;
        const contract = createHomePageContract({
            locale,
            activeTab,
            content: homeView.content,
            recommendationInput,
            homeView: {
                ...homeView,
                looks: renderedLooks
            },
            syncStates: {
                favorites: getFavoritesSyncState(),
                wardrobe: getWardrobeSyncState(),
                schedule: getScheduleSyncState()
            }
        });
        const favoriteIds = new Set(contract.derivedView.favoriteIds);
        const activeTabState = contract.derivedView.tabs.find((tab) => tab.active) || contract.derivedView.tabs[0];
        const weatherView = applyTemperatureUnit(
            applyLocationToWeather(contract.derivedView.weather, locationResult, locale),
            getTemperatureUnitPreference()
        );
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
            (listener) => subscribeFavoritesStore(() => {
                requestClosetTwinRefresh()
                listener()
            }),
            (listener) => subscribeWardrobeStore(() => {
                requestClosetTwinRefresh()
                listener()
            }),
            (listener) => subscribeScheduleStore(() => {
                requestClosetTwinRefresh()
                listener()
            }),
            (listener) => subscribeSettingsStore(() => {
                requestClosetTwinRefresh()
                listener()
            }),
            (listener) => subscribeHomeContent(() => {
                requestClosetTwinRefresh()
                listener()
            }),
            (listener) => subscribeClosetTwinRecommendations(listener)
        ],
        hydrators: [
            () => canHydrateRemote ? hydrateFavorites() : undefined,
            () => canHydrateRemote ? hydrateWardrobe(getLocale()) : undefined,
            () => canHydrateRemote ? hydrateSchedule() : undefined,
            () => canHydrateRemote ? hydrateHomeContent(getLocale()) : undefined,
            () => requestClosetTwinRefresh()
        ],
        syncFeedback: {
            root: syncFeedbackRoot,
            locale: () => getLocale(),
            bindings: [
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
                    key: 'schedule',
                    domainKey: 'schedule',
                    getState: () => getScheduleSyncState(),
                    subscribe: (listener) => subscribeScheduleSyncState(listener),
                    retry: (locale) => retryScheduleSync(locale)
                },
                {
                    key: 'homeContent',
                    domainKey: 'homeContent',
                    getState: () => getHomeContentSyncState(),
                    subscribe: (listener) => subscribeHomeContentSyncState(listener),
                    retry: (locale) => retryHomeContentHydration(locale)
                }
            ]
        }
    });

    async function requestLocation() {
        if (locationRequested) return;
        locationRequested = true;
        locationResult = await getCurrentLocation(getLocale());
        requestClosetTwinRefresh();
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
                const item = getClosetTwinRecommendationLookById(lookId) || selectHomeLookById(locale, lookId);
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

    return {
        ...binding,
        teardown() {
            if (recommendationRefreshTimer) {
                window.clearTimeout(recommendationRefreshTimer)
                recommendationRefreshTimer = null
            }
            binding.teardown()
        }
    };
}
