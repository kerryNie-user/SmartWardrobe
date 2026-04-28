import { renderTopbar } from '../components/topbar.js';
import { renderSecondaryTabs } from '../components/secondaryTabs.js';
import { renderSearchBar } from '../components/searchBar.js';
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js';
import { renderTrendStrip } from '../components/trendStrip.js';
import { renderDiscoveryFeed } from '../components/discoveryFeed.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { applyLocaleDocument, getLocale, getSharedCopy } from '../lib/locale.js';
import { bindPageStores } from '../lib/pageStoreBinding.js';
import { createDiscoveryPageContract } from '../lib/pageContracts.js';
import { buildCanonicalHref, shareLink } from '../lib/shareAdapter.js';
import { subscribeFavoritesStore } from '../lib/favoritesStore.js';
import { getDiscoveryContent } from '../data/discovery.js';
import { getStoredComments, subscribeDiscoveryCommentStore } from '../lib/discoveryCommentStore.js';
import { getDiscoverySocialSyncState, getPostSocialState, hydrateDiscoverySocial, retryDiscoverySocialSync, subscribeDiscoverySocialStore, subscribeDiscoverySocialSyncState, toggleDiscoveryPostLike, toggleDiscoveryPostSave } from '../lib/discoverySocialStore.js';
import { getDiscoveryViewSnapshot, getDiscoveryViewSyncState, hydrateDiscoveryView, retryDiscoveryViewHydration, setDiscoveryActiveTab, setDiscoveryQuery, setDiscoveryShareFeedback, subscribeDiscoveryViewStore, subscribeDiscoveryViewSyncState } from '../lib/discoveryViewStore.js';

const DISCOVERY_PANEL_ID = 'ct-discovery-feed-panel';

function buildTabState(activeKey, tabs) {
    return tabs.map((tab) => ({
        ...tab,
        active: tab.key === activeKey,
        tabId: `ct-discovery-tab-${tab.key}`,
        panelId: DISCOVERY_PANEL_ID
    }));
}

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

function buildFeedItems(content, activeTab, query, locale, shareFeedbackPostId) {
    if (activeTab === 'posts') {
        return filterItems(content.communityPosts, (item) => [item.title, item.description, item.author], query)
            .map((item) => ({
                ...item,
                social: {
                    ...getPostSocialState(item),
                    shareFeedback: shareFeedbackPostId === item.id
                        ? (locale === 'zh-CN' ? '链接已复制' : 'Link copied')
                        : ''
                }
            }));
    }
    if (activeTab === 'editorials') {
        return filterItems(content.editorials, (item) => [item.title, item.description, item.author], query)
            .map((item) => ({
                ...item,
                social: {
                    ...getPostSocialState(item),
                    shareFeedback: shareFeedbackPostId === item.id
                        ? (locale === 'zh-CN' ? '链接已复制' : 'Link copied')
                        : ''
                }
            }));
    }

    return filterItems(content.hotspotStories, (item) => [item.title, item.description, item.tag, item.meta], query);
}

export function renderDiscoveryPage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]');
    const tabsRoot = document.querySelector('[data-ct-discovery-tabs]');
    const searchRoot = document.querySelector('[data-ct-search]');
    const trendRoot = document.querySelector('[data-ct-trend-strip]');
    const feedRoot = document.querySelector('[data-ct-discovery-feed]');
    const bottomNavRoot = document.querySelector('[data-ct-bottom-nav]');
    const syncFeedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'discovery');
    const listenerCleanups = [];

    const paint = () => {
        const locale = getLocale();
        const content = getDiscoveryContent(locale);
        const viewState = getDiscoveryViewSnapshot();
        const feedItems = buildFeedItems(
            content,
            viewState.activeTab,
            viewState.query,
            locale,
            viewState.shareFeedbackPostId
        );
        const contract = createDiscoveryPageContract({
            locale,
            content,
            activeTab: viewState.activeTab,
            query: viewState.query,
            trendStrip: viewState.activeTab === 'posts' ? content.postTrendStrip : (viewState.activeTab === 'editorials' ? content.editorialTrendStrip : content.hotspotTrendStrip),
            feed: {
                kind: feedItems.length ? 'ready' : 'empty',
                items: feedItems
            },
            shareFeedbackPostId: viewState.shareFeedbackPostId,
            syncStates: {
                discoveryView: getDiscoveryViewSyncState(),
                discoverySocial: getDiscoverySocialSyncState()
            }
        });
        const activeTabState = contract.derivedView.tabs.find((tab) => tab.active) || contract.derivedView.tabs[0];

        applyLocaleDocument('discovery', locale);
        if (topbarRoot) topbarRoot.innerHTML = renderTopbar();
        if (bottomNavRoot) bottomNavRoot.innerHTML = renderBottomNav('discovery');
        if (tabsRoot) tabsRoot.innerHTML = renderSecondaryTabs(contract.derivedView.tabs, getSharedCopy(locale).tabs.discovery);
        if (searchRoot) searchRoot.innerHTML = renderSearchBar(contract.derivedView.search.placeholder, contract.derivedView.search.value);
        if (trendRoot) trendRoot.innerHTML = renderTrendStrip(contract.derivedView.trendStrip);

        if (!feedRoot) return;
        feedRoot.id = DISCOVERY_PANEL_ID;
        feedRoot.setAttribute('role', 'tabpanel');
        feedRoot.setAttribute('aria-labelledby', activeTabState.tabId);
        feedRoot.innerHTML = renderDiscoveryFeed(contract.derivedView.activeTab, contract.derivedView.feed.items);
    };

    if (tabsRoot) {
        const handleTabsClick = (event) => {
            const target = event.target.closest('[data-tab-key]');
            if (!target) return;
            setDiscoveryActiveTab(target.getAttribute('data-tab-key') || 'hotspots');
        };
        tabsRoot.addEventListener('click', handleTabsClick);
        listenerCleanups.push(() => tabsRoot.removeEventListener('click', handleTabsClick));
    }

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
            const favoriteButton = event.target.closest('.ct-discovery-post__favorite');
            if (favoriteButton) {
                const postId = favoriteButton.getAttribute('data-ct-toggle-post-favorite');
                const locale = getLocale();
                const content = getDiscoveryContent(locale);
                const viewState = getDiscoveryViewSnapshot();
                const feedItems = buildFeedItems(content, viewState.activeTab, viewState.query, locale, viewState.shareFeedbackPostId);
                const item = feedItems.find((post) => post.id === postId);
                if (!item) return;

                toggleDiscoveryPostSave(item);
                return;
            }

            const likeButton = event.target.closest('[data-ct-toggle-post-like]');
            if (likeButton) {
                const postId = likeButton.getAttribute('data-ct-toggle-post-like');
                toggleDiscoveryPostLike(postId);
                return;
            }

            const shareButton = event.target.closest('[data-ct-share-post]');
            if (!shareButton) return;

            const locale = getLocale();
            const postId = shareButton.getAttribute('data-ct-share-post');
            const shareUrl = buildCanonicalHref('post-detail.html', { id: postId });
            setDiscoveryShareFeedback(postId);
            void shareLink({
                href: shareUrl,
                title: postId,
                text: locale === 'zh-CN' ? '发现内容分享' : 'Discovery share'
            });
        };
        feedRoot.addEventListener('click', handleFeedClick);
        listenerCleanups.push(() => feedRoot.removeEventListener('click', handleFeedClick));
    }

    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeDiscoveryViewStore(listener),
            (listener) => subscribeDiscoverySocialStore(listener),
            (listener) => subscribeFavoritesStore(listener),
            (listener) => subscribeDiscoveryCommentStore(listener)
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
                    label: { 'zh-CN': '发现视图', 'en-US': 'Discovery View' },
                    getState: () => getDiscoveryViewSyncState(),
                    subscribe: (listener) => subscribeDiscoveryViewSyncState(listener),
                    retry: () => retryDiscoveryViewHydration(getLocale())
                },
                {
                    key: 'discoverySocial',
                    label: { 'zh-CN': '发现社交', 'en-US': 'Discovery Social' },
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
