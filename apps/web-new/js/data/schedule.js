const SCHEDULE_COPY = {
    'en-US': {
        tabs: [
            { key: 'upcoming', label: 'Upcoming', active: true },
            { key: 'travel', label: 'Travel', active: false },
            { key: 'archive', label: 'Archive', active: false }
        ],
        form: {
            eyebrow: 'Add Schedule',
            heading: 'Create A New Event',
            intro: 'Drop a new fitting, travel block, or archive session into the current editorial calendar.',
            labels: {
                tab: 'Tab',
                day: 'Day',
                dateLabel: 'Date Label',
                time: 'Time',
                title: 'Title',
                location: 'Location',
                tags: 'Tags',
                image: 'Image',
                reminder: 'Reminder'
            },
            placeholders: {
                day: '31',
                dateLabel: 'Oct / Thu',
                time: '09:30 AM — 11:00 AM',
                title: 'Studio Breakfast',
                location: 'Le Marais',
                tags: 'Wool Coat, Notebook',
                image: './images/shared/travel-look.jpg'
            },
            actions: {
                save: 'Save Event',
                update: 'Update Event'
            },
            fallback: {
                time: '09:00 AM — 10:00 AM',
                location: 'Location Pending',
                tags: ['Editorial Note'],
                day: '01',
                dateLabel: 'Date Pending'
            }
        },
        views: {
            upcoming: {
                overview: {
                    eyebrow: 'Schedule Outlook',
                    title: 'This Week',
                    value: '04',
                    meta: 'Events',
                    note: 'A tighter city rhythm with studio reviews, archive pulls, and one evening dinner.'
                },
                groups: [
                    {
                        day: '24',
                        label: 'Oct / Thu',
                        events: [
                            {
                                id: 'product-review',
                                time: '10:00 AM — 01:00 PM',
                                title: 'Product Review',
                                location: 'SoHo Studio A, New York',
                                image: './images/shared/editorial-look-02.jpg',
                                tags: ['Monolith Suit', 'Derby Shoes']
                            }
                        ]
                    },
                    {
                        day: '26',
                        label: 'Oct / Sat',
                        events: [
                            {
                                id: 'archive-dinner',
                                time: '08:00 PM — Late',
                                title: 'Archive Dinner',
                                location: 'The Tribalist, Brooklyn',
                                image: './images/shared/editorial-look-01.jpg',
                                tags: ['Archive Blazer', 'Silk Wrap']
                            }
                        ]
                    }
                ]
            },
            travel: {
                overview: {
                    eyebrow: 'Travel Signal',
                    title: 'Flight Window',
                    value: '02',
                    meta: 'City Moves',
                    note: 'Upcoming departures and cross-city fittings that need compact, modular outfit planning.'
                },
                groups: [
                    {
                        day: '30',
                        label: 'Oct / Wed',
                        events: [
                            {
                                id: 'paris-fashion-week-departure',
                                time: '11:45 PM — Overnight',
                                title: 'Paris Fashion Week Departure',
                                location: 'JFK Terminal 4',
                                image: './images/shared/travel-look.jpg',
                                tags: ['Travel Coat', 'Carry-On Edit']
                            }
                        ]
                    }
                ]
            },
            archive: {
                overview: {
                    eyebrow: 'Archive Review',
                    title: 'Recent Logs',
                    value: '03',
                    meta: 'Completed',
                    note: 'Closed sessions remain visible as styling references and archive memory for future fittings.'
                },
                groups: [
                    {
                        day: '18',
                        label: 'Oct / Fri',
                        events: [
                            {
                                id: 'fabric-sourcing-walkthrough',
                                time: '03:00 PM — 05:00 PM',
                                title: 'Fabric Sourcing Walkthrough',
                                location: 'Canal Textile District',
                                image: './images/shared/leather-craft-fabric.jpg',
                                tags: ['Wool Blend', 'Material Notes']
                            }
                        ]
                    }
                ]
            }
        }
    },
    'zh-CN': {
        tabs: [
            { key: 'upcoming', label: '即将到来', active: true },
            { key: 'travel', label: '出行', active: false },
            { key: 'archive', label: '归档', active: false }
        ],
        views: {
            upcoming: {
                overview: {
                    eyebrow: '日程概览',
                    title: '本周安排',
                    value: '04',
                    meta: '项活动',
                    note: '本周节奏更紧凑，包含工作室评审、档案调取和一场晚间晚餐。'
                },
                groups: [
                    {
                        day: '24',
                        label: '10月 / 周四',
                        events: [
                            {
                                id: 'product-review',
                                time: '10:00 — 13:00',
                                title: '产品评审',
                                location: '纽约 SoHo Studio A',
                                image: './images/shared/editorial-look-02.jpg',
                                tags: ['Monolith 西装', '德比鞋']
                            }
                        ]
                    },
                    {
                        day: '26',
                        label: '10月 / 周六',
                        events: [
                            {
                                id: 'archive-dinner',
                                time: '20:00 — 深夜',
                                title: '档案晚餐',
                                location: '布鲁克林 The Tribalist',
                                image: './images/shared/editorial-look-01.jpg',
                                tags: ['档案西装外套', '丝质围裹']
                            }
                        ]
                    }
                ]
            },
            travel: {
                overview: {
                    eyebrow: '出行信号',
                    title: '航班窗口',
                    value: '02',
                    meta: '次移动',
                    note: '即将到来的出发与跨城试装需要更紧凑、更模块化的出行穿搭规划。'
                },
                groups: [
                    {
                        day: '30',
                        label: '10月 / 周三',
                        events: [
                            {
                                id: 'paris-fashion-week-departure',
                                time: '23:45 — 通宵',
                                title: '巴黎时装周出发',
                                location: 'JFK T4',
                                image: './images/shared/travel-look.jpg',
                                tags: ['出行大衣', '随身胶囊']
                            }
                        ]
                    }
                ]
            },
            archive: {
                overview: {
                    eyebrow: '档案回顾',
                    title: '近期记录',
                    value: '03',
                    meta: '已完成',
                    note: '已结束的会面仍会保留，作为后续试装和造型研究的参考。'
                },
                groups: [
                    {
                        day: '18',
                        label: '10月 / 周五',
                        events: [
                            {
                                id: 'fabric-sourcing-walkthrough',
                                time: '15:00 — 17:00',
                                title: '面料调研走访',
                                location: 'Canal 面料区',
                                image: './images/shared/leather-craft-fabric.jpg',
                                tags: ['羊毛混纺', '材质笔记']
                            }
                        ]
                    }
                ]
            }
        },
        form: {
            eyebrow: '添加日程',
            heading: '创建新的事件',
            intro: '把新的试装、出行安排或档案任务加入当前编辑日历。',
            labels: {
                tab: '分类',
                day: '日期',
                dateLabel: '日期标签',
                time: '时间',
                title: '标题',
                location: '地点',
                tags: '标签',
                image: '图片',
                reminder: '提醒'
            },
            placeholders: {
                day: '31',
                dateLabel: '10月 / 周四',
                time: '09:30 — 11:00',
                title: '工作室早餐',
                location: '玛黑区',
                tags: '羊毛大衣, 笔记本',
                image: './images/shared/travel-look.jpg'
            },
            actions: {
                cancel: '取消',
                save: '保存日程',
                update: '更新日程'
            },
            fallback: {
                time: '09:00 — 10:00',
                location: '地点待定',
                tags: ['编辑备注'],
                day: '01',
                dateLabel: '日期待定'
            }
        }
    }
};

export function getScheduleContent(locale) {
    return SCHEDULE_COPY[locale === 'zh-CN' ? 'zh-CN' : 'en-US'];
}
