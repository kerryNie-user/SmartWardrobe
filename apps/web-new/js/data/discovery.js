import { getDiscoveryContent as fetchDiscoveryContent } from '../lib/liteBackendClient.js'

let DISCOVERY_COPY = {
    'en-US': {
        editorialTrendStrip: {
            eyebrow: '',
            title: '',
            action: '',
            items: []
        },
        editorials: [],
        searchPlaceholder: {
            editorials: 'HOT SEARCHES · STYLE GUIDE · TRENDS'
        }
    },
    'zh-CN': {
        editorialTrendStrip: {
            eyebrow: '',
            title: '',
            action: '',
            items: []
        },
        editorials: [],
        searchPlaceholder: {
            editorials: '热门搜索 · 穿搭指南 · 趋势解析'
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

export const editorialTrendStrip = DISCOVERY_COPY['en-US'].editorialTrendStrip;
export const editorials = DISCOVERY_COPY['en-US'].editorials;
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
