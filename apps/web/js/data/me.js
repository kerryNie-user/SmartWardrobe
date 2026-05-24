const ME_COPY = {
    'en-US': {
        profile: {
            name: '',
            label: 'Style Archive Member',
            bio: '',
            avatar: ''
        },
        dashboard: {
            focus: {
                label: 'Today',
                title: 'Next move',
                fallbackTitle: 'No schedule yet',
                fallbackMeta: 'Plan your next outfit moment',
                fallbackNote: 'Add a schedule event to make this area show your next fitting, trip, or editorial appointment.',
                actionText: 'Open Schedule',
                actionHref: 'schedule.html'
            },
            quickLinks: {
                title: 'Quick access',
                wardrobe: {
                    label: 'Wardrobe',
                    empty: 'No pieces yet',
                    href: 'wardrobe.html'
                },
                favorites: {
                    label: 'Favorites',
                    empty: 'No saves yet',
                    href: 'favorites.html'
                },
                schedule: {
                    label: 'Schedule',
                    empty: 'No events yet',
                    href: 'schedule.html'
                },
                settings: {
                    label: 'Settings',
                    href: 'settings.html'
                }
            },
            recent: {
                title: 'Recent',
                emptyTitle: 'No recent activity',
                emptyMeta: 'Saved looks, wardrobe pieces, and schedule events will appear here.'
            }
        }
    },
    'zh-CN': {
        profile: {
            name: '',
            label: '时尚档案成员',
            bio: '',
            avatar: ''
        },
        dashboard: {
            focus: {
                label: '今日',
                title: '下一步',
                fallbackTitle: '暂无日程',
                fallbackMeta: '先安排下一次穿搭场景',
                fallbackNote: '添加日程后，这里会直接展示下一次试穿、出行或编辑企划安排。',
                actionText: '打开日程',
                actionHref: 'schedule.html'
            },
            quickLinks: {
                title: '快捷入口',
                wardrobe: {
                    label: '衣橱',
                    empty: '暂无单品',
                    href: 'wardrobe.html'
                },
                favorites: {
                    label: '收藏',
                    empty: '暂无收藏',
                    href: 'favorites.html'
                },
                schedule: {
                    label: '日程',
                    empty: '暂无事件',
                    href: 'schedule.html'
                },
                settings: {
                    label: '设置',
                    href: 'settings.html'
                }
            },
            recent: {
                title: '最近动态',
                emptyTitle: '暂无最近动态',
                emptyMeta: '收藏、衣橱单品和日程事件会显示在这里。'
            }
        }
    }
};

export function getMeContent(locale) {
    return ME_COPY[locale === 'zh-CN' ? 'zh-CN' : 'en-US'];
}
