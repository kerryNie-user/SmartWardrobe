import { renderTopbar } from '../components/topbar.js';
import { renderSearchBar } from '../components/searchBar.js';
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js';
import { renderTrendStrip } from '../components/trendStrip.js';
import { renderDiscoveryFeed } from '../components/discoveryFeed.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { applyLocaleDocument, getLocale, getUiCopy } from '../lib/locale.js';
import { bindPageStores } from '../lib/pageStoreBinding.js';
import { createDiscoveryPageContract } from '../lib/pageContracts.js';
import { getDiscoveryContent } from '../data/discovery.js';
import { getDiscoverySocialSyncState, getPostSocialState, hydrateDiscoverySocial, retryDiscoverySocialSync, subscribeDiscoverySocialStore, subscribeDiscoverySocialSyncState, toggleDiscoveryPostLike } from '../lib/discoverySocialStore.js';
import { getDiscoveryViewSnapshot, getDiscoveryViewSyncState, hydrateDiscoveryView, retryDiscoveryViewHydration, setDiscoveryQuery, subscribeDiscoveryViewStore, subscribeDiscoveryViewSyncState } from '../lib/discoveryViewStore.js';
import { restoreDiscoveryScrollState, saveDiscoveryScrollState } from '../lib/discoveryScrollState.js';
import { installVerticalDragScroll } from '../lib/verticalDragScroll.js';

const DISCOVERY_PANEL_ID = 'ct-discovery-feed-panel';

function filterItems(items, fields, query) {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    if (!normalizedQuery) {
        return items;
    }

    return items.filter((item) => fields(item)
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery));
}

function buildFeedItems(content, query) {
    return filterItems(content.editorials || [], (item) => [item.title, item.description, item.author], query)
        .map((item) => ({
            ...item,
            social: getPostSocialState(item)
        }));
}

export function renderDiscoveryPage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]');
    const searchRoot = document.querySelector('[data-ct-search]');
    const trendRoot = document.querySelector('[data-ct-trend-strip]');
    const feedRoot = document.querySelector('[data-ct-discovery-feed]');
    const bottomNavRoot = document.querySelector('[data-ct-bottom-nav]');
    const syncFeedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'discovery');
    const listenerCleanups = [];
    const dragScrollBinding = installVerticalDragScroll(document);
    listenerCleanups.push(() => dragScrollBinding.teardown());

    const paint = () => {
        const locale = getLocale();
        const content = getDiscoveryContent(locale);
        const viewState = getDiscoveryViewSnapshot();
        const contract = createDiscoveryPageContract({
            locale,
            content,
            query: viewState.query,
            trendStrip: content.editorialTrendStrip,
            feed: {
                items: buildFeedItems(content, viewState.query)
            },
            shareFeedbackPostId: null,
            syncStates: {
                discoveryView: getDiscoveryViewSyncState(),
                discoverySocial: getDiscoverySocialSyncState()
            }
        });

        applyLocaleDocument('discovery', locale);
        if (topbarRoot) topbarRoot.innerHTML = renderTopbar();
        if (bottomNavRoot) bottomNavRoot.innerHTML = renderBottomNav('discovery');
        if (searchRoot) searchRoot.innerHTML = renderSearchBar(contract.derivedView.search.placeholder, contract.derivedView.search.value);
        if (trendRoot) trendRoot.innerHTML = renderTrendStrip(contract.derivedView.trendStrip);

        if (!feedRoot) return;
        feedRoot.id = DISCOVERY_PANEL_ID;
        feedRoot.setAttribute('role', 'region');
        feedRoot.setAttribute('aria-label', getUiCopy(locale).domains.discoveryView);
        feedRoot.innerHTML = renderDiscoveryFeed(contract.derivedView.feed.items, getDiscoveryViewSyncState());
        restoreDiscoveryScrollState(feedRoot);
    };

    if (searchRoot) {
        const handleSearchInput = (event) => {
            const target = event.target.closest('.ct-search-bar__input');
            if (!target) return;
            setDiscoveryQuery(target.value);
        };
        searchRoot.addEventListener('input', handleSearchInput);
        listenerCleanups.push(() => searchRoot.removeEventListener('input', handleSearchInput));
    }

    if (feedRoot) {
        const handleFeedClick = (event) => {
            const likeButton = event.target.closest('[data-ct-toggle-post-like]');
            if (likeButton) {
                const postId = likeButton.getAttribute('data-ct-toggle-post-like');
                toggleDiscoveryPostLike(postId);
                return;
            }

            const postLink = event.target.closest('[data-ct-post-link]');
            if (postLink) {
                const post = postLink.closest('[data-post-id]');
                saveDiscoveryScrollState({
                    postId: post?.getAttribute('data-post-id') || ''
                });
            }
        };
        feedRoot.addEventListener('click', handleFeedClick);
        listenerCleanups.push(() => feedRoot.removeEventListener('click', handleFeedClick));
    }

    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeDiscoveryViewStore(listener),
            (listener) => subscribeDiscoverySocialStore(listener),
            (listener) => subscribeDiscoveryViewSyncState(listener)
        ],
        hydrators: [
            () => hydrateDiscoveryView(getLocale()),
            () => hydrateDiscoverySocial(getLocale())
        ],
        syncFeedback: {
            root: syncFeedbackRoot,
            locale: () => getLocale(),
            bindings: [
                {
                    key: 'discoveryView',
                    domainKey: 'discoveryView',
                    getState: () => getDiscoveryViewSyncState(),
                    subscribe: (listener) => subscribeDiscoveryViewSyncState(listener),
                    retry: () => retryDiscoveryViewHydration(getLocale())
                },
                {
                    key: 'discoverySocial',
                    domainKey: 'discoverySocial',
                    getState: () => getDiscoverySocialSyncState(),
                    subscribe: (listener) => subscribeDiscoverySocialSyncState(listener),
                    retry: () => retryDiscoverySocialSync(getLocale())
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
