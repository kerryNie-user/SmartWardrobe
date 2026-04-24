const ME_COPY = {
    'en-US': {
        profile: {
            name: 'Elara Vance',
            label: 'Vogue Guild Member',
            bio: 'Curating a digital archive of architectural silhouettes, neutral tailoring, and quietly radical texture studies.',
            avatar: './images/profile/elara-vance.jpg'
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
                    value: 'Thursday 14:00',
                    meta: 'Studio A, Shibuya',
                    note: 'Product review and silhouette fitting with the outerwear capsule.',
                    actionText: 'Open Full Schedule',
                    actionHref: 'schedule.html'
                },
                stats: [
                    { label: 'Upcoming', value: '04', detail: 'This Week' },
                    { label: 'Travel', value: '02', detail: 'City Changes' }
                ],
                items: [
                    { title: 'Product Review', subtitle: 'Thu 14:00 · Studio A, Shibuya', href: 'schedule.html', marker: 'schedule-entry' },
                    { title: 'Gallery Pull', subtitle: 'Fri 11:30 · Aoyama Archive Room' }
                ]
            },
            favorites: {
                summary: {
                    eyebrow: 'Saved Edit',
                    title: 'Saved Looks',
                    value: '12',
                    meta: 'Curations',
                    note: 'A restrained library of tonal uniforms, editorial outerwear, and travel capsules.',
                    actionText: 'Open Favorites',
                    actionHref: 'favorites.html',
                    actionMarker: 'favorites-entry'
                },
                stats: [
                    { label: 'Pinned', value: '03', detail: 'Capsules' },
                    { label: 'Recent', value: '02', detail: 'This Week' }
                ],
                items: [
                    { title: 'Pinned Capsule', subtitle: 'Monochrome tailoring with sculpted outerwear' },
                    { title: 'Weekend Transit', subtitle: 'Soft knit layers and compact accessories' }
                ]
            },
            wardrobe: {
                summary: {
                    eyebrow: 'Archive Volume',
                    title: 'Wardrobe Volume',
                    value: '128',
                    meta: 'Pieces',
                    note: 'Mostly structured outerwear, wool layers, technical shirting, and Japanese denim.',
                    actionText: 'Open Inventory',
                    actionHref: 'wardrobe.html',
                    actionMarker: 'wardrobe-entry'
                },
                stats: [
                    { label: 'Outerwear', value: '18', detail: 'Hero Pieces' },
                    { label: 'Tailoring', value: '26', detail: 'Sharp Lines' }
                ],
                items: [
                    { title: 'Lemaire Coat', subtitle: 'Added 2d ago · Charcoal wool trench', href: 'wardrobe.html', marker: 'wardrobe-entry' },
                    { title: 'Studio Look 04', subtitle: 'Added 4d ago · White shirt and slate trousers' }
                ]
            },
            settings: {
                summary: {
                    eyebrow: 'Personal Mode',
                    title: 'Preference Profile',
                    value: '06',
                    meta: 'Signals',
                    note: 'System-level choices that shape language, theme, wardrobe layout, and climate reading.',
                    actionText: 'Open Settings',
                    actionHref: 'settings.html',
                    actionMarker: 'settings-entry'
                },
                stats: [
                    { label: 'Theme', value: 'Dark', detail: 'Editorial' },
                    { label: 'Unit', value: '°C', detail: 'Metric' }
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
            name: 'Elara Vance',
            label: 'Vogue 社群成员',
            bio: '持续整理建筑感轮廓、中性色剪裁与克制材质实验的数字风格档案。',
            avatar: './images/profile/elara-vance.jpg'
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
                    value: '周四 14:00',
                    meta: '涩谷 Studio A',
                    note: '外套胶囊系列的产品评审与轮廓试穿安排在这场会面中完成。',
                    actionText: '打开完整日程',
                    actionHref: 'schedule.html'
                },
                stats: [
                    { label: '即将到来', value: '04', detail: '本周' },
                    { label: '出行', value: '02', detail: '城市切换' }
                ],
                items: [
                    { title: '产品评审', subtitle: '周四 14:00 · 涩谷 Studio A', href: 'schedule.html', marker: 'schedule-entry' },
                    { title: '画廊调档', subtitle: '周五 11:30 · 青山档案室' }
                ]
            },
            favorites: {
                summary: {
                    eyebrow: '已存选集',
                    title: '收藏造型',
                    value: '12',
                    meta: '组',
                    note: '收录同色制服感、编辑式外套与出行胶囊造型的克制风格库。',
                    actionText: '打开收藏页',
                    actionHref: 'favorites.html',
                    actionMarker: 'favorites-entry'
                },
                stats: [
                    { label: '置顶', value: '03', detail: '胶囊' },
                    { label: '最近', value: '02', detail: '本周' }
                ],
                items: [
                    { title: '置顶胶囊', subtitle: '单色剪裁与雕塑感外套的组合' },
                    { title: '周末转场', subtitle: '柔软针织层次与紧凑型配饰' }
                ]
            },
            wardrobe: {
                summary: {
                    eyebrow: '档案体量',
                    title: '衣橱总量',
                    value: '128',
                    meta: '件',
                    note: '以结构外套、羊毛层次、技术感衬衫与日系丹宁为主。',
                    actionText: '打开库存',
                    actionHref: 'wardrobe.html',
                    actionMarker: 'wardrobe-entry'
                },
                stats: [
                    { label: '外套', value: '18', detail: '核心单品' },
                    { label: '剪裁', value: '26', detail: '锐利线条' }
                ],
                items: [
                    { title: 'Lemaire 大衣', subtitle: '2 天前添加 · 炭灰色羊毛风衣', href: 'wardrobe.html', marker: 'wardrobe-entry' },
                    { title: '工作室造型 04', subtitle: '4 天前添加 · 白衬衫与石板灰长裤' }
                ]
            },
            settings: {
                summary: {
                    eyebrow: '个人模式',
                    title: '偏好档案',
                    value: '06',
                    meta: '项',
                    note: '这些系统级偏好会影响语言、主题、衣橱布局与气候读数。',
                    actionText: '打开设置',
                    actionHref: 'settings.html',
                    actionMarker: 'settings-entry'
                },
                stats: [
                    { label: '主题', value: '深色', detail: '编辑感' },
                    { label: '单位', value: '°C', detail: '公制' }
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
