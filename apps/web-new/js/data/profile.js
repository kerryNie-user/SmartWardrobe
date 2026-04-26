export function getProfilePageContent(locale) {
    if (locale === 'zh-CN') {
        return {
            topbar: {
                leftLabel: '返回我的',
                rightLabel: '编辑资料'
            },
            hero: {
                eyebrow: '个人资料',
                title: '个人档案',
                note: '更新头像、用户名和简介，让 Me 与 Settings 始终保持同步。'
            },
            summary: {
                heading: '档案总览',
                action: '编辑资料',
                metrics: {
                    favorites: '总收藏',
                    wardrobe: '衣橱库存'
                },
                preview: {
                    heading: '近期收藏',
                    empty: '先收藏穿搭或帖子，这里会显示你的个人选集预览。'
                }
            },
            form: {
                heading: '编辑资料',
                labels: {
                    avatar: '头像链接',
                    name: '用户名',
                    bio: '简介'
                },
                placeholders: {
                    avatar: '/uploads/profile/elara-vance.jpg',
                    name: 'Elara Vance',
                    bio: '写一点你的轮廓偏好、城市气质与材质关注点。'
                },
                fallback: {
                    name: 'Elara Vance',
                    bio: '持续整理建筑感轮廓、中性色剪裁与克制材质实验的数字风格档案。'
                },
                actions: {
                    restore: '恢复默认',
                    save: '保存资料'
                },
                status: {
                    saved: '资料已保存，本页与我的主页会同步更新。'
                }
            }
        };
    }

    return {
        topbar: {
            leftLabel: 'Back to me',
            rightLabel: 'Edit profile'
        },
        hero: {
            eyebrow: 'Profile Edit',
            title: 'Personal Record',
            note: 'Update your avatar, display name, and bio so Me and Settings stay in sync.'
        },
        summary: {
            heading: 'Profile Overview',
            action: 'Edit Profile',
            metrics: {
                favorites: 'Total Saved',
                wardrobe: 'Wardrobe Count'
            },
            preview: {
                heading: 'Recent Saves',
                empty: 'Save looks or posts first and your personal editorial shelf will appear here.'
            }
        },
        form: {
            heading: 'Edit Profile',
            labels: {
                avatar: 'Avatar URL',
                name: 'Display Name',
                bio: 'Bio'
            },
            placeholders: {
                avatar: '/uploads/profile/elara-vance.jpg',
                name: 'Elara Vance',
                bio: 'Write a few lines about your silhouette bias, city mood, and material focus.'
            },
            fallback: {
                name: 'Elara Vance',
                bio: 'Curating a digital archive of architectural silhouettes, neutral tailoring, and quietly radical texture studies.'
            },
            actions: {
                restore: 'Restore Default',
                save: 'Save Profile'
            },
            status: {
                saved: 'Profile saved and synced with Me and Settings.'
            }
        }
    };
}
