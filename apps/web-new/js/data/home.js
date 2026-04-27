import { getHomeContent as fetchHomeContent } from '../lib/liteBackendClient.js'

let HOME_COPY = {
    'en-US': {
        weather: {
            condition: '',
            temperature: { current: '', low: '', high: '' },
            location: { label: '', precision: 'fallback' },
            summary: ''
        },
        schedule: { label: 'Upcoming Schedule', actionText: 'See All', actionHref: 'schedule.html', title: '', time: '', location: '' },
        tabs: [
            { key: 'recommend', label: 'Recommend', active: true },
            { key: 'featured', label: 'Featured', active: false }
        ],
        recommendLooks: [],
        featuredLooks: []
    },
    'zh-CN': {
        weather: {
            condition: '',
            temperature: { current: '', low: '', high: '' },
            location: { label: '', precision: 'fallback' },
            summary: ''
        },
        schedule: { label: '即将到来的日程', actionText: '查看全部', actionHref: 'schedule.html', title: '', time: '', location: '' },
        tabs: [
            { key: 'recommend', label: '推荐', active: true },
            { key: 'featured', label: '精选', active: false }
        ],
        recommendLooks: [],
        featuredLooks: []
    }
};

export function getHomeContent(locale) {
    return HOME_COPY[locale === 'zh-CN' ? 'zh-CN' : 'en-US'];
}


const listeners = new Set()

export function subscribeHomeContent(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

function notify() {
    listeners.forEach((listener) => listener())
}

export async function hydrateHomeContent(locale) {
    try {
        const response = await fetchHomeContent(locale)
        if (response.ok && response.data?.content) {
            const loc = response.data.locale || locale
            HOME_COPY[loc === 'zh-CN' ? 'zh-CN' : 'en-US'] = response.data.content
            notify()
        }
    } catch (err) {
        console.warn('Failed to hydrate home content', err)
    }
}
