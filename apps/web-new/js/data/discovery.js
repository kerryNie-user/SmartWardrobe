import { getDiscoveryContent as fetchDiscoveryContent } from '../lib/liteBackendClient.js'

let DISCOVERY_COPY = {
    'en-US': {
        tabs: [
            { key: 'hotspots', label: 'Fashion Hotspots', active: true },
            { key: 'posts', label: 'Posts', active: false }
        ],
        hotspotTrendStrip: {
            eyebrow: '',
            title: '',
            action: '',
            items: []
        },
        postTrendStrip: {
            eyebrow: '',
            title: '',
            action: '',
            items: []
        },
        hotspotStories: [],
        communityPosts: [],
        searchPlaceholder: {
            hotspots: 'HOT SEARCHES · TOKYO · TAILORING · CITY EDITS',
            posts: 'HOT SEARCHES · ARCHIVES · TREND NOTES'
        }
    },
    'zh-CN': {
        tabs: [
            { key: 'hotspots', label: '时尚热点', active: true },
            { key: 'posts', label: '社区动态', active: false }
        ],
        hotspotTrendStrip: {
            eyebrow: '',
            title: '',
            action: '',
            items: []
        },
        postTrendStrip: {
            eyebrow: '',
            title: '',
            action: '',
            items: []
        },
        hotspotStories: [],
        communityPosts: [],
        searchPlaceholder: {
            hotspots: '热门搜索 · 东京 · 剪裁 · 城市选集',
            posts: '热门搜索 · 档案 · 趋势笔记'
        }
    }
};


const listeners = new Set()

export function subscribeDiscoveryContent(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

function notify() {
    listeners.forEach((listener) => listener())
}

export const tabs = DISCOVERY_COPY['en-US'].tabs;
export const hotspotTrendStrip = DISCOVERY_COPY['en-US'].hotspotTrendStrip;
export const postTrendStrip = DISCOVERY_COPY['en-US'].postTrendStrip;
export const hotspotStories = DISCOVERY_COPY['en-US'].hotspotStories;
export const communityPosts = DISCOVERY_COPY['en-US'].communityPosts;
export const searchPlaceholder = DISCOVERY_COPY['en-US'].searchPlaceholder;


export function getDiscoveryContent(locale) {
    return DISCOVERY_COPY[locale === 'zh-CN' ? 'zh-CN' : 'en-US'];
}


export async function hydrateDiscoveryContent(locale) {
    try {
        const response = await fetchDiscoveryContent(locale)
        if (response.ok && response.data?.content) {
            const loc = response.data.locale || locale
            DISCOVERY_COPY[loc === 'zh-CN' ? 'zh-CN' : 'en-US'] = response.data.content
            notify()
        }
    } catch (err) {
        console.warn('Failed to hydrate discovery content', err)
    }
}
