export function getFavoritesPageContent(locale) {
    if (locale === 'zh-CN') {
        return {
            topbar: {
                leftLabel: '返回我的',
                rightLabel: '打开个人资料'
            },
            summary: {
                eyebrow: '收藏总览',
                title: '我的收藏',
                note: '集中保存穿搭与帖子，方便回看和二次搭配。'
            },
            tabs: [
                { key: 'looks', label: '穿搭', active: true },
                { key: 'posts', label: '帖子', active: false }
            ],
            metrics: {
                total: '总收藏',
                current: '当前分类'
            },
            empty: {
                looks: {
                    eyebrow: '暂无收藏',
                    copy: '先去首页收藏推荐或精选穿搭，这里会自动汇总。'
                },
                posts: {
                    eyebrow: '暂无已存帖子',
                    copy: '去 Discovery 收藏社区帖子后，这里会出现你的阅读档案。'
                }
            }
        }
    }

    return {
        topbar: {
            leftLabel: 'Back to me',
            rightLabel: 'Open profile'
        },
        summary: {
            eyebrow: 'Saved Archive',
            title: 'Favorites Archive',
            note: 'Collect recommended looks and community posts into one personal editorial shelf.'
        },
        tabs: [
            { key: 'looks', label: 'Looks', active: true },
            { key: 'posts', label: 'Posts', active: false }
        ],
        metrics: {
            total: 'Total Saved',
            current: 'Current Tab'
        },
        empty: {
            looks: {
                eyebrow: 'No Saved Looks',
                copy: 'Save recommended or featured looks from Home and they will appear here.'
            },
            posts: {
                eyebrow: 'No Saved Posts',
                copy: 'Save community posts from Discovery and they will appear here.'
            }
        }
    }
}
