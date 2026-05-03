const ME_COPY = {
    'en-US': {
        profile: {
            name: '',
            label: 'Vogue Guild Member',
            bio: '',
            avatar: ''
        },
        tabs: [
            { key: 'schedule', label: 'Schedule', active: true },
            { key: 'favorites', label: 'Favorites', active: false },
            { key: 'wardrobe', label: 'Wardrobe', active: false },
            { key: 'settings', label: 'Settings', active: false }
        ],
        views: {
            schedule: {
                summary: {
                    eyebrow: 'Current Focus',
                    title: 'Next Schedule',
                    value: '',
                    meta: '',
                    note: 'Product review and silhouette fitting with the outerwear capsule.',
                    actionText: 'Open Full Schedule',
                    actionHref: 'schedule.html'
                },
                stats: [
                    { label: 'Upcoming', value: '-', detail: 'This Week' },
                    { label: 'Travel', value: '-', detail: 'City Changes' }
                ],
                items: []
            },
            favorites: {
                summary: {
                    eyebrow: 'Saved Edit',
                    title: 'Saved Looks',
                    value: '-',
                    meta: 'Curations',
                    note: 'A restrained library of tonal uniforms, editorial outerwear, and travel capsules.',
                    actionText: 'Open Favorites',
                    actionHref: 'favorites.html',
                    actionMarker: 'favorites-entry'
                },
                stats: [
                    { label: 'Pinned', value: '-', detail: 'Capsules' },
                    { label: 'Recent', value: '-', detail: 'This Week' }
                ],
                items: []
            },
            wardrobe: {
                summary: {
                    eyebrow: 'Archive Volume',
                    title: 'Wardrobe Volume',
                    value: '-',
                    meta: 'Pieces',
                    note: 'Mostly structured outerwear, wool layers, technical shirting, and Japanese denim.',
                    actionText: 'Open Inventory',
                    actionHref: 'wardrobe.html',
                    actionMarker: 'wardrobe-entry'
                },
                stats: [
                    { label: 'Outerwear', value: '-', detail: 'Hero Pieces' },
                    { label: 'Tailoring', value: '-', detail: 'Sharp Lines' }
                ],
                items: []
            },
            settings: {
                summary: {
                    eyebrow: 'Personal Mode',
                    title: 'Preference Profile',
                    value: '-',
                    meta: 'Signals',
                    note: 'System-level choices that shape language, theme, wardrobe layout, and climate reading.',
                    actionText: 'Open Settings',
                    actionHref: 'settings.html',
                    actionMarker: 'settings-entry'
                },
                stats: [
                    { label: 'Theme', value: '-', detail: 'Editorial' },
                    { label: 'Unit', value: '-', detail: 'Metric' }
                ],
                items: [
                    { title: 'Language', subtitle: 'English · Ready for future bilingual sync', href: 'settings.html', marker: 'settings-entry' },
                    { title: 'Notifications', subtitle: 'Comments, likes, and trend drops enabled' }
                ]
            }
        }
    },
    'zh-CN': {
        profile: {
            name: '',
            label: 'Vogue 社群成员',
            bio: '',
            avatar: ''
        },
        tabs: [
            { key: 'schedule', label: '日程', active: true },
            { key: 'favorites', label: '收藏', active: false },
            { key: 'wardrobe', label: '衣橱', active: false },
            { key: 'settings', label: '设置', active: false }
        ],
        views: {
            schedule: {
                summary: {
                    eyebrow: '当前重点',
                    title: '下一条日程',
                    value: '',
                    meta: '',
                    note: '外套胶囊系列的产品评审与轮廓试穿安排在这场会面中完成。',
                    actionText: '打开完整日程',
                    actionHref: 'schedule.html'
                },
                stats: [
                    { label: '即将到来', value: '-', detail: '本周' },
                    { label: '出行', value: '-', detail: '城市切换' }
                ],
                items: []
            },
            favorites: {
                summary: {
                    eyebrow: '已存选集',
                    title: '收藏造型',
                    value: '-',
                    meta: '组',
                    note: '收录同色制服感、编辑式外套与出行胶囊造型的克制风格库。',
                    actionText: '打开收藏页',
                    actionHref: 'favorites.html',
                    actionMarker: 'favorites-entry'
                },
                stats: [
                    { label: '置顶', value: '-', detail: '胶囊' },
                    { label: '最近', value: '-', detail: '本周' }
                ],
                items: []
            },
            wardrobe: {
                summary: {
                    eyebrow: '档案体量',
                    title: '衣橱总量',
                    value: '-',
                    meta: '件',
                    note: '以结构外套、羊毛层次、技术感衬衫与日系丹宁为主。',
                    actionText: '打开库存',
                    actionHref: 'wardrobe.html',
                    actionMarker: 'wardrobe-entry'
                },
                stats: [
                    { label: '外套', value: '-', detail: '核心单品' },
                    { label: '剪裁', value: '-', detail: '锐利线条' }
                ],
                items: []
            },
            settings: {
                summary: {
                    eyebrow: '个人模式',
                    title: '偏好档案',
                    value: '-',
                    meta: '项',
                    note: '这些系统级偏好会影响语言、主题、衣橱布局与气候读数。',
                    actionText: '打开设置',
                    actionHref: 'settings.html',
                    actionMarker: 'settings-entry'
                },
                stats: [
                    { label: '主题', value: '-', detail: '编辑感' },
                    { label: '单位', value: '-', detail: '公制' }
                ],
                items: [
                    { title: '语言', subtitle: '中文 · 可与全站同步', href: 'settings.html', marker: 'settings-entry' },
                    { title: '通知', subtitle: '评论、点赞与趋势推送已启用' }
                ]
            }
        }
    }
};

export function getMeContent(locale) {
    return ME_COPY[locale === 'zh-CN' ? 'zh-CN' : 'en-US'];
}
