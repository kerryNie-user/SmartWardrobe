const HOME_COPY = {
    'en-US': {
        weather: null,
        schedule: null,
        tabs: [
            { key: 'recommend', label: 'Recommend', active: true },
            { key: 'featured', label: 'Featured', active: false }
        ],
        recommendLooks: [],
        featuredLooks: []
    },
    'zh-CN': {
        weather: null,
        schedule: null,
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
