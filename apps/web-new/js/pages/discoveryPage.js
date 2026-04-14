import { renderTopbar } from '../components/topbar.js';
import { renderSecondaryTabs } from '../components/secondaryTabs.js';
import { renderSearchBar } from '../components/searchBar.js';
import { renderTrendStrip } from '../components/trendStrip.js';
import { renderDiscoveryFeed } from '../components/discoveryFeed.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { applyLocaleDocument, getLocale, getSharedCopy } from '../lib/locale.js';
import { buildCanonicalHref, shareLink } from '../lib/shareAdapter.js';
import {
    createDiscoveryState,
    getDiscoveryView,
    setDiscoveryQuery,
    setDiscoveryTab,
    toggleDiscoveryLike,
    toggleDiscoverySave
} from '../lib/discoveryState.js';

const DISCOVERY_PANEL_ID = 'ct-discovery-feed-panel';

function buildTabState(activeKey, tabs) {
    return tabs.map((tab) => ({
        ...tab,
        active: tab.key === activeKey,
        tabId: `ct-discovery-tab-${tab.key}`,
        panelId: DISCOVERY_PANEL_ID
    }));
}

export function renderDiscoveryPage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]');
    const tabsRoot = document.querySelector('[data-ct-discovery-tabs]');
    const searchRoot = document.querySelector('[data-ct-search]');
    const trendRoot = document.querySelector('[data-ct-trend-strip]');
    const feedRoot = document.querySelector('[data-ct-discovery-feed]');
    const bottomNavRoot = document.querySelector('[data-ct-bottom-nav]');

    const locale = getLocale();
    const state = createDiscoveryState(locale);
    let shareFeedbackPostId = '';

    applyLocaleDocument('discovery', locale);
    if (topbarRoot) topbarRoot.innerHTML = renderTopbar();
    if (bottomNavRoot) bottomNavRoot.innerHTML = renderBottomNav('discovery');

    const renderFeedPanel = () => {
        const view = getDiscoveryView(state, locale);
        const tabs = buildTabState(view.activeTab, view.tabs);
        const activeTabState = tabs.find((tab) => tab.active) || tabs[0];

        if (!feedRoot) return;
        feedRoot.id = DISCOVERY_PANEL_ID;
        feedRoot.setAttribute('role', 'tabpanel');
        feedRoot.setAttribute('aria-labelledby', activeTabState.tabId);
        feedRoot.innerHTML = renderDiscoveryFeed(view.activeTab, view.feed.items.map((item) => ({
            ...item,
            social: item.social ? {
                ...item.social,
                shareFeedback: shareFeedbackPostId === item.id
                    ? (locale === 'zh-CN' ? '链接已复制' : 'Link copied')
                    : item.social.shareFeedback
            } : item.social
        })));
    };

    const paint = () => {
        const view = getDiscoveryView(state, locale);
        const tabs = buildTabState(view.activeTab, view.tabs);
        if (tabsRoot) tabsRoot.innerHTML = renderSecondaryTabs(tabs, getSharedCopy(locale).tabs.discovery);
        if (searchRoot) searchRoot.innerHTML = renderSearchBar(view.searchPlaceholder, view.query);
        if (trendRoot) trendRoot.innerHTML = renderTrendStrip(view.trendStrip);
        renderFeedPanel();
    };

    paint();

    if (tabsRoot) {
        tabsRoot.addEventListener('click', (event) => {
            const target = event.target.closest('[data-tab-key]');
            if (!target) return;
            setDiscoveryTab(state, target.getAttribute('data-tab-key') || 'hotspots');
            paint();
        });
    }

    if (searchRoot) {
        searchRoot.addEventListener('input', (event) => {
            const target = event.target.closest('.ct-search-bar__input');
            if (!target) return;
            setDiscoveryQuery(state, target.value);
            renderFeedPanel();
        });
    }

    if (feedRoot) {
        feedRoot.addEventListener('click', (event) => {
            const favoriteButton = event.target.closest('.ct-discovery-post__favorite');
            if (favoriteButton) {
                const postId = favoriteButton.getAttribute('data-ct-toggle-post-favorite');
                const view = getDiscoveryView(state, locale);
                const item = view.feed.items.find((post) => post.id === postId);
                if (!item) return;

                toggleDiscoverySave(item);
                renderFeedPanel();
                return;
            }

            const likeButton = event.target.closest('[data-ct-toggle-post-like]');
            if (likeButton) {
                const postId = likeButton.getAttribute('data-ct-toggle-post-like');
                toggleDiscoveryLike(postId);
                renderFeedPanel();
                return;
            }

            const shareButton = event.target.closest('[data-ct-share-post]');
            if (!shareButton) return;

            const postId = shareButton.getAttribute('data-ct-share-post');
            const shareUrl = buildCanonicalHref('post-detail.html', { id: postId });
            shareFeedbackPostId = postId;
            renderFeedPanel();
            void shareLink({
                href: shareUrl,
                title: postId,
                text: locale === 'zh-CN' ? '发现内容分享' : 'Discovery share'
            });
        });
    }
}
