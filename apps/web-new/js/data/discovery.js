const DISCOVERY_COPY = {
    'en-US': {
        tabs: [
            { key: 'hotspots', label: 'Fashion Hotspots', active: true },
            { key: 'posts', label: 'Posts', active: false }
        ],
        hotspotTrendStrip: null,
        postTrendStrip: null,
        hotspotStories: [],
        communityPosts: [],
        searchPlaceholder: {
            hotspots: 'HOT SEARCHES · TOKYO · TAILORING · CITY EDITS',
            posts: 'HOT SEARCHES · ARCHIVES · TREND NOTES'
        }
    },
    'zh-CN': {
        tabs: [
            { key: 'hotspots', label: '热点趋势', active: true },
            { key: 'posts', label: '帖子', active: false }
        ],
        hotspotTrendStrip: null,
        postTrendStrip: null,
        hotspotStories: [],
        communityPosts: [],
        searchPlaceholder: {
            hotspots: '热门搜索 · 东京 · 剪裁 · 城市选集',
            posts: '热门搜索 · 档案 · 趋势笔记'
        }
    }
};

const DEFAULT_DISCOVERY_CONTENT = DISCOVERY_COPY['en-US'];

export const tabs = DEFAULT_DISCOVERY_CONTENT.tabs;
export const hotspotTrendStrip = DEFAULT_DISCOVERY_CONTENT.hotspotTrendStrip;
export const postTrendStrip = DEFAULT_DISCOVERY_CONTENT.postTrendStrip;
export const hotspotStories = DEFAULT_DISCOVERY_CONTENT.hotspotStories;
export const communityPosts = DEFAULT_DISCOVERY_CONTENT.communityPosts;
export const searchPlaceholder = DEFAULT_DISCOVERY_CONTENT.searchPlaceholder;

export function getDiscoveryContent(locale) {
    return DISCOVERY_COPY[locale === 'zh-CN' ? 'zh-CN' : 'en-US'];
}
