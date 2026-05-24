const LOCALE_KEY = 'app_locale';
const THEME_KEY = 'app_theme';
const DEFAULT_LOCALE = 'en-US';

function getDocumentLocaleFallback() {
    if (typeof document !== 'undefined' && document.documentElement?.lang === 'zh-CN') {
        return 'zh-CN';
    }

    return DEFAULT_LOCALE;
}

const PAGE_META = {
    'en-US': {
        home: { lang: 'en', title: 'CLOSETTWIN' },
        discovery: { lang: 'en', title: 'CLOSETTWIN — Discovery' },
        me: { lang: 'en', title: 'CLOSETTWIN — Me' },
        favorites: { lang: 'en', title: 'CLOSETTWIN — Favorites' },
        login: { lang: 'en', title: 'CLOSETTWIN — Login' },
        register: { lang: 'en', title: 'CLOSETTWIN — Register' },
        wardrobeItem: { lang: 'en', title: 'CLOSETTWIN — Wardrobe Item' },
        wardrobeDetail: { lang: 'en', title: 'CLOSETTWIN — Wardrobe Detail' },
        postDetail: { lang: 'en', title: 'CLOSETTWIN — Post' },
        outfitDetail: { lang: 'en', title: 'CLOSETTWIN — Outfit' },
        schedule: { lang: 'en', title: 'CLOSETTWIN — Schedule' },
        scheduleEvent: { lang: 'en', title: 'CLOSETTWIN — Schedule Event' },
        settings: { lang: 'en', title: 'CLOSETTWIN — Settings' },
        wardrobe: { lang: 'en', title: 'CLOSETTWIN — Wardrobe' },
        profile: { lang: 'en', title: 'CLOSETTWIN — Profile' },
        profileEdit: { lang: 'en', title: 'CLOSETTWIN — Edit Profile' }
    },
    'zh-CN': {
        home: { lang: 'zh-CN', title: 'CLOSETTWIN' },
        discovery: { lang: 'zh-CN', title: 'CLOSETTWIN — 发现' },
        me: { lang: 'zh-CN', title: 'CLOSETTWIN — 我的' },
        favorites: { lang: 'zh-CN', title: 'CLOSETTWIN — 收藏' },
        login: { lang: 'zh-CN', title: 'CLOSETTWIN — 登录' },
        register: { lang: 'zh-CN', title: 'CLOSETTWIN — 注册' },
        wardrobeItem: { lang: 'zh-CN', title: 'CLOSETTWIN — 衣橱单品' },
        wardrobeDetail: { lang: 'zh-CN', title: 'CLOSETTWIN — 衣橱详情' },
        postDetail: { lang: 'zh-CN', title: 'CLOSETTWIN — 帖子' },
        outfitDetail: { lang: 'zh-CN', title: 'CLOSETTWIN — 穿搭' },
        schedule: { lang: 'zh-CN', title: 'CLOSETTWIN — 日程' },
        scheduleEvent: { lang: 'zh-CN', title: 'CLOSETTWIN — 日程事件' },
        settings: { lang: 'zh-CN', title: 'CLOSETTWIN — 设置' },
        wardrobe: { lang: 'zh-CN', title: 'CLOSETTWIN — 衣橱' },
        profile: { lang: 'zh-CN', title: 'CLOSETTWIN — 个人资料' },
        profileEdit: { lang: 'zh-CN', title: 'CLOSETTWIN — 编辑资料' }
    }
};

const SHARED_COPY = {
    'en-US': {
        topbar: {
            openMenu: 'Open menu',
            openProfile: 'Open profile'
        },
        nav: {
            home: 'Home',
            discovery: 'Discovery',
            me: 'Me'
        },
        tabs: {
            home: 'Home Content Tabs',
            discovery: 'Discovery Content Tabs',
            me: 'Me Content Tabs',
            favorites: 'Favorites Content Tabs',
            schedule: 'Schedule Content Tabs',
            settings: 'Settings Content Tabs',
            wardrobe: 'Wardrobe Content Tabs'
        },
        actions: {
            closeDetail: 'Close detail',
            saveLook: 'Save look',
            savePost: 'Save post',
            share: 'Share',
            addEvent: 'Add Event',
            addItem: 'Add Item',
            cancel: 'Cancel',
            saveEvent: 'Save Event',
            saveItem: 'Save Item',
            delete: 'Delete',
            removeFavorite: 'Remove favorite',
            editProfile: 'Edit Profile',
            saveProfile: 'Save Profile',
            follow: 'Follow',
            viewComments: 'View comments',
            postComment: 'Post',
            addToSchedule: 'Add to Schedule',
            seeAlternatives: 'See Alternative Pairings',
            openDetailPage: 'Open detail page',
            login: 'Login',
            register: 'Register',
            logout: 'Logout',
            saveChanges: 'Save Changes'
        },
        misc: {
            weatherReport: 'Weather Report',
            noMatch: 'No Match',
            noEvents: 'No Events',
            noPieces: 'No Pieces',
            searchLabel: 'Search'
        }
    },
    'zh-CN': {
        topbar: {
            openMenu: '打开菜单',
            openProfile: '打开个人资料'
        },
        nav: {
            home: '首页',
            discovery: '发现',
            me: '我的'
        },
        tabs: {
            home: '首页内容切换',
            discovery: '发现内容切换',
            me: '我的内容切换',
            favorites: '收藏内容切换',
            schedule: '日程内容切换',
            settings: '设置内容切换',
            wardrobe: '衣橱内容切换'
        },
        actions: {
            closeDetail: '关闭详情',
            saveLook: '收藏造型',
            savePost: '收藏帖子',
            share: '分享',
            addEvent: '添加日程',
            addItem: '添加单品',
            cancel: '取消',
            saveEvent: '保存日程',
            saveItem: '保存单品',
            delete: '删除',
            removeFavorite: '移除收藏',
            editProfile: '编辑资料',
            saveProfile: '保存资料',
            follow: '关注',
            viewComments: '查看评论',
            postComment: '发布',
            addToSchedule: '加入日程',
            seeAlternatives: '查看替代搭配',
            openDetailPage: '打开详情页',
            login: '登录',
            register: '注册',
            logout: '退出登录',
            saveChanges: '保存修改'
        },
        misc: {
            weatherReport: '天气简报',
            noMatch: '暂无匹配',
            noEvents: '暂无日程',
            noPieces: '暂无单品',
            searchLabel: '搜索'
        }
    }
};

const UI_COPY = {
    'en-US': {
        brand: 'CLOSETTWIN',
        defaults: {
            debugUser: {
                name: 'ClosetTwin Member',
                emailOrMobile: 'member@closettwin.local',
                avatar: '',
                bio: ''
            },
            authEmail: 'account@example.com',
            profileName: 'ClosetTwin Member'
        },
        domains: {
            profile: 'Profile',
            favorites: 'Favorites',
            wardrobe: 'Wardrobe',
            settings: 'Settings',
            schedule: 'Schedule',
            discoveryView: 'Discovery View',
            discoverySocial: 'Discovery Social',
            discoveryComments: 'Post Comments',
            homeContent: 'Home Content'
        },
        topbar: {
            backToHome: 'Back to home',
            backToMe: 'Back to me',
            backToDiscovery: 'Back to discovery',
            backToWardrobe: 'Back to wardrobe',
            backToSchedule: 'Back to schedule',
            backToProfile: 'Back to profile',
            openProfile: 'Open profile',
            inventoryFocus: 'Inventory Focus',
            openSettings: 'Open Settings'
        },
        auth: {
            login: {
                eyebrow: 'Account Access',
                title: 'Sign In to Your Archive',
                note: 'Sign in to continue into wardrobe, schedule, favorites, and profile.',
                fields: [
                    { name: 'emailOrMobile', label: 'Email or Mobile', type: 'text', placeholder: 'account@example.com', autocomplete: 'username' },
                    { name: 'password', label: 'Password', type: 'password', placeholder: 'Enter your password', autocomplete: 'current-password' }
                ],
                switchLabel: 'Need an account? Create one',
                switchHref: 'register.html',
                error: 'Unable to sign in. Please check your credentials.'
            },
            register: {
                eyebrow: 'Create Account',
                title: 'Register the New Archive',
                note: 'Create an account to unlock the new profile, wardrobe, and saved flows.',
                fields: [
                    { name: 'name', label: 'Display Name', type: 'text', placeholder: 'Your name', autocomplete: 'name' },
                    { name: 'emailOrMobile', label: 'Email or Mobile', type: 'text', placeholder: 'account@example.com', autocomplete: 'username' },
                    { name: 'password', label: 'Password', type: 'password', placeholder: 'At least 8 characters', autocomplete: 'new-password' }
                ],
                switchLabel: 'Already registered? Sign in',
                switchHref: 'login.html',
                error: 'Unable to register. Try a different account.'
            }
        },
        states: {
            loadFailedTitle: 'Load Failed',
            loadFailedDescription: 'Failed to load. Please try again.',
            favoritesLoadFailed: 'Failed to load favorites.',
            wardrobeLoadFailed: 'Failed to load wardrobe.',
            scheduleLoadFailed: 'Failed to load schedule.',
            discoveryLoadFailed: 'Failed to load discovery content.',
            settingsLoadFailed: 'Failed to load settings.',
            profileLoadFailed: 'Failed to load profile.',
            favoritesPreviewLoadFailed: 'Failed to load favorites preview.',
            discoveryNoMatchDescription: 'Try another city, fabric note, author, or silhouette keyword.',
            wardrobeEmptyDescription: 'Add an item to keep building this archive.',
            scheduleEmptyDescription: 'Add a new event to start shaping this schedule view.'
        },
        sync: {
            eyebrow: 'Lite Backend',
            status: {
                loading: 'Loading remote data',
                syncing: 'Syncing local changes',
                synced: 'Synced with remote',
                stale: 'Remote unavailable, showing local cache',
                failed: 'Writeback failed and needs retry',
                conflict: 'Remote conflict detected and reverted'
            },
            description: {
                loading: 'Domains: {domains}',
                syncing: 'Writing back: {domains}',
                synced: 'Recently synced: {domains}',
                stale: 'Using local cache and can retry: {domains}',
                failed: 'Retry these domains: {domains}',
                conflict: 'Refresh or retry these domains: {domains}'
            },
            actions: {
                retryAll: 'Retry All',
                retryDomain: 'Retry {domain}'
            }
        },
        formFeedback: {
            actions: {
                retry: 'Retry',
                leave: 'Leave Anyway',
                back: 'Back',
                continueCreate: 'Continue as New'
            },
            status: {
                validating: 'Please review your inputs',
                saving: 'Saving',
                syncing: 'Syncing to remote',
                saved: 'Saved',
                failed: 'Save failed',
                conflict: 'Conflict detected',
                stale: 'Remote unavailable'
            },
            validation: {
                required: '{label} is required'
            }
        },
        image: {
            unavailable: 'Image unavailable',
            uploadLabel: 'Upload Image',
            previewFailedTitle: 'Image preview failed',
            previewFailedMessage: 'Unable to read this image. Try another file.'
        },
        wardrobe: {
            edit: 'Edit',
            editItem: 'Edit Item',
            favoriteAdd: 'Favorite {title}',
            favoriteRemove: 'Remove {title} from favorites',
            fields: {
                size: 'Size',
                color: 'Color',
                material: 'Material'
            },
            searchPlaceholder: 'Search item, category, tags',
            missing: {
                title: 'Wardrobe item not found',
                message: 'This wardrobe item does not exist and cannot be edited.'
            },
            detailMissing: {
                eyebrow: 'Missing Item',
                title: 'This wardrobe item is unavailable',
                description: 'Return to wardrobe and choose another item.'
            },
            itemPage: {
                addEyebrow: 'Add Item',
                editEyebrow: 'Edit Item',
                addTitle: 'Upload a Wardrobe Photo',
                editTitle: 'Replace Wardrobe Photo',
                addNote: 'Upload the photo only. Recognition data returns through the model interface and is saved with the item.',
                editNote: 'Replace the photo only. Recognition data refreshes through the model interface.'
            }
        },
        schedule: {
            tabs: {
                upcoming: 'Upcoming',
                travel: 'Travel',
                archive: 'Archive'
            },
            reminder: 'Reminder',
            edit: 'Edit',
            draftLocation: 'ClosetTwin Styling Suite',
            upcomingTitle: 'Next 3 Days',
            upcomingWindowNote: 'Only schedule entries due within the next three days appear here.',
            upcomingEmptyDescription: 'No schedule entries are due within the next three days.',
            deleteConfirmEyebrow: 'Confirm Delete',
            deleteConfirmTitle: 'Delete this schedule entry?',
            deleteConfirmDescription: 'You are about to delete “{title}”. This cannot be undone.',
            history: {
                eyebrow: 'Background Archive',
                title: 'History',
                description: 'Completed entries and records outside the three-day window are archived here automatically. You can review or delete them.',
                emptyEyebrow: 'No History',
                emptyDescription: 'Archived schedule records will appear here after they leave the active window.'
            },
            missing: {
                title: 'Schedule event not found',
                message: 'This schedule event does not exist and cannot be edited.'
            },
            empty: {
                title: 'No Schedule Yet',
                description: 'Start adding your first itinerary.',
                action: 'Add Event'
            },
            eventPage: {
                addEyebrow: 'Add Event',
                editEyebrow: 'Edit Event',
                addTitle: 'Create a new schedule entry',
                editTitle: 'Update this schedule entry',
                intro: 'A schedule entry with date, time, location, tags, and an optional reminder.',
                updateAction: 'Update Event'
            }
        },
        outfit: {
            breakdown: 'The Breakdown',
            alternatives: 'Alternative Pairings'
        },
        post: {
            commentPlaceholder: 'Write your comment',
            submitComment: 'Post Comment',
            shareLabel: '↗ Share',
            likePost: 'Like post',
            linkCopied: 'Link copied',
            commentLabel: 'Comment',
            commentAuthor: 'You',
            commentJustNow: 'Just now',
            missing: {
                eyebrow: 'Post Missing',
                title: 'This post is unavailable',
                description: 'Return to discovery and choose another post.'
            }
        },
        me: {
            focusSyncedNote: 'Synced from Schedule. Open the full module for details.',
            settingsLabels: {
                light: 'Light',
                dark: 'Dark',
                list: 'List',
                grid: 'Grid'
            },
            focusStats: {
                upcoming: 'Upcoming',
                travel: 'Travel',
                planned: 'Planned',
                events: 'Events'
            },
            quickLinks: {
                favoriteDetail: '{looks} looks / {posts} posts'
            },
            recent: {
                favoriteType: 'Favorite',
                favoriteTitle: 'Saved item',
                favoriteMeta: 'From Favorites',
                scheduleType: 'Schedule',
                wardrobeType: 'Wardrobe'
            }
        },
        weather: {
            cloudy: 'Cloudy',
            currentAreaSummary: 'Current Area, {condition}',
            summarySeparator: ', '
        },
        location: {
            preciseSuffix: ' area'
        }
    },
    'zh-CN': {
        brand: 'CLOSETTWIN',
        defaults: {
            debugUser: {
                name: 'ClosetTwin 用户',
                emailOrMobile: 'member@closettwin.local',
                avatar: '',
                bio: ''
            },
            authEmail: 'account@example.com',
            profileName: 'ClosetTwin 用户'
        },
        domains: {
            profile: '资料',
            favorites: '收藏',
            wardrobe: '衣橱',
            settings: '设置',
            schedule: '日程',
            discoveryView: '发现视图',
            discoverySocial: '发现社交',
            discoveryComments: '帖子评论',
            homeContent: '首页内容'
        },
        topbar: {
            backToHome: '返回首页',
            backToMe: '返回我的',
            backToDiscovery: '返回发现',
            backToWardrobe: '返回衣橱',
            backToSchedule: '返回日程',
            backToProfile: '返回资料',
            openProfile: '打开个人资料',
            inventoryFocus: '库存焦点',
            openSettings: '打开设置'
        },
        auth: {
            login: {
                eyebrow: '账号访问',
                title: '登录你的档案',
                note: '登录后继续访问衣橱、日程、收藏与个人资料。',
                fields: [
                    { name: 'emailOrMobile', label: '邮箱或手机号', type: 'text', placeholder: 'account@example.com', autocomplete: 'username' },
                    { name: 'password', label: '密码', type: 'password', placeholder: '输入你的密码', autocomplete: 'current-password' }
                ],
                switchLabel: '还没有账号？前往注册',
                switchHref: 'register.html',
                error: '登录失败，请检查账号信息。'
            },
            register: {
                eyebrow: '新建账号',
                title: '注册新版档案',
                note: '完成注册后即可进入新的个人资料、衣橱与收藏系统。',
                fields: [
                    { name: 'name', label: '用户名', type: 'text', placeholder: '你的名字', autocomplete: 'name' },
                    { name: 'emailOrMobile', label: '邮箱或手机号', type: 'text', placeholder: 'account@example.com', autocomplete: 'username' },
                    { name: 'password', label: '密码', type: 'password', placeholder: '至少 8 位字符', autocomplete: 'new-password' }
                ],
                switchLabel: '已有账号？返回登录',
                switchHref: 'login.html',
                error: '注册失败，请更换账号信息后重试。'
            }
        },
        states: {
            loadFailedTitle: '加载失败',
            loadFailedDescription: '加载失败，请稍后重试。',
            favoritesLoadFailed: '收藏加载失败。',
            wardrobeLoadFailed: '衣橱加载失败。',
            scheduleLoadFailed: '日程加载失败。',
            discoveryLoadFailed: '发现内容加载失败。',
            settingsLoadFailed: '设置加载失败。',
            profileLoadFailed: '资料加载失败。',
            favoritesPreviewLoadFailed: '收藏预览加载失败。',
            discoveryNoMatchDescription: '试试其他城市、面料、作者或轮廓关键词。',
            wardrobeEmptyDescription: '添加一件单品，继续扩充这份衣橱档案。',
            scheduleEmptyDescription: '添加一条新日程，开始完善这个时间视图。'
        },
        sync: {
            eyebrow: 'Lite Backend',
            status: {
                loading: '正在加载远端数据',
                syncing: '正在同步本地改动',
                synced: '已与远端同步',
                stale: '远端不可用，当前显示本地缓存',
                failed: '写回失败，需要重试',
                conflict: '远端版本冲突，已回退确认态'
            },
            description: {
                loading: '同步范围：{domains}',
                syncing: '正在写回：{domains}',
                synced: '最近同步：{domains}',
                stale: '可继续浏览本地数据，并重试：{domains}',
                failed: '请重试以下领域：{domains}',
                conflict: '请刷新或重试以下领域：{domains}'
            },
            actions: {
                retryAll: '重试全部',
                retryDomain: '重试 {domain}'
            }
        },
        formFeedback: {
            actions: {
                retry: '重试',
                leave: '仍要离开',
                back: '返回',
                continueCreate: '以新建继续'
            },
            status: {
                validating: '请检查表单输入',
                saving: '正在保存',
                syncing: '正在同步到远端',
                saved: '已保存',
                failed: '保存失败',
                conflict: '发生冲突',
                stale: '远端不可用'
            },
            validation: {
                required: '请填写{label}'
            }
        },
        image: {
            unavailable: '图片暂不可用',
            uploadLabel: '上传图片',
            previewFailedTitle: '图片读取失败',
            previewFailedMessage: '无法读取这张图片，请更换文件重试。'
        },
        wardrobe: {
            edit: '编辑',
            editItem: '编辑单品',
            favoriteAdd: '收藏 {title}',
            favoriteRemove: '取消收藏 {title}',
            fields: {
                size: '尺码',
                color: '颜色',
                material: '材质'
            },
            searchPlaceholder: '搜索单品、分类、识别标签',
            missing: {
                title: '未找到单品',
                message: '当前链接的单品不存在，无法继续编辑。'
            },
            detailMissing: {
                eyebrow: '单品不存在',
                title: '这件单品暂时不可用',
                description: '请返回衣橱重新选择单品。'
            },
            itemPage: {
                addEyebrow: '新增单品',
                editEyebrow: '编辑单品',
                addTitle: '上传衣橱单品照片',
                editTitle: '替换衣橱单品照片',
                addNote: '只上传照片。识别结果由模型接口回传，并随单品一起保存。',
                editNote: '只替换照片。识别结果由模型接口刷新。'
            }
        },
        schedule: {
            tabs: {
                upcoming: '即将到来',
                travel: '出行',
                archive: '归档'
            },
            reminder: '提醒',
            edit: '编辑',
            draftLocation: 'CLOSETTWIN 造型档案',
            upcomingTitle: '未来三天',
            upcomingWindowNote: '这里只显示未来三天内的日程，其余记录会由后台自动整理。',
            upcomingEmptyDescription: '未来三天内暂无日程。',
            deleteConfirmEyebrow: '删除确认',
            deleteConfirmTitle: '确定删除这条日程吗？',
            deleteConfirmDescription: '你将删除「{title}」，该操作无法撤销。',
            history: {
                eyebrow: '后台归档',
                title: '历史记录',
                description: '已结束或不在未来三天窗口内的日程会自动整理到这里，可查看也可删除。',
                emptyEyebrow: '暂无历史',
                emptyDescription: '日程离开当前窗口后会出现在这里。'
            },
            missing: {
                title: '未找到日程',
                message: '当前链接的日程不存在，无法继续编辑。'
            },
            empty: {
                title: '暂无日程',
                description: '开始添加你的第一个行程安排。',
                action: '添加日程'
            },
            eventPage: {
                addEyebrow: '新增日程',
                editEyebrow: '编辑日程',
                addTitle: '创建一条新提醒事项',
                editTitle: '更新这条提醒事项',
                intro: '保留日期、时间、地点、标签与提醒开关，作为纯日程系统使用。',
                updateAction: '更新日程'
            }
        },
        outfit: {
            breakdown: '搭配拆解',
            alternatives: '替代搭配'
        },
        post: {
            commentPlaceholder: '写下你的评论',
            submitComment: '发布评论',
            shareLabel: '↗ 分享',
            likePost: '点赞帖子',
            linkCopied: '链接已复制',
            commentLabel: '评论',
            commentAuthor: '你',
            commentJustNow: '刚刚',
            missing: {
                eyebrow: '帖子未找到',
                title: '当前帖子不存在',
                description: '请返回发现页重新选择帖子。'
            }
        },
        me: {
            focusSyncedNote: '已同步到日程，可直接进入完整日程查看细节。',
            settingsLabels: {
                light: '浅色',
                dark: '深色',
                list: '列表',
                grid: '网格'
            },
            focusStats: {
                upcoming: '即将到来',
                travel: '出行',
                planned: '待安排',
                events: '事件'
            },
            quickLinks: {
                favoriteDetail: '{looks} 造型 / {posts} 博客'
            },
            recent: {
                favoriteType: '收藏',
                favoriteTitle: '已收藏内容',
                favoriteMeta: '来自收藏夹',
                scheduleType: '日程',
                wardrobeType: '衣橱'
            }
        },
        weather: {
            cloudy: '多云',
            currentAreaSummary: '当前位置，{condition}',
            summarySeparator: '，'
        },
        location: {
            preciseSuffix: '附近'
        }
    }
};

export function getLocale() {
    try {
        const storedLocale = typeof window !== 'undefined' ? window.localStorage?.getItem(LOCALE_KEY) : null;
        if (storedLocale === 'zh-CN' || storedLocale === 'en-US') {
            if (storedLocale === 'en-US' && typeof window !== 'undefined' && window.localStorage?.getItem('ct_settings') == null) {
                return getDocumentLocaleFallback();
            }
            return storedLocale;
        }
    } catch {
        return getDocumentLocaleFallback();
    }

    return getDocumentLocaleFallback();
}

export function setLocale(locale) {
    const normalizedLocale = locale === 'zh-CN' ? 'zh-CN' : 'en-US';
    window.localStorage?.setItem(LOCALE_KEY, normalizedLocale);
    return normalizedLocale;
}

export function getTheme() {
    return window.localStorage?.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
}

export function applyThemeDocument(theme = getTheme()) {
    const normalizedTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-ct-theme', normalizedTheme);
    return normalizedTheme;
}

export function getSharedCopy(locale = getLocale()) {
    return SHARED_COPY[locale === 'zh-CN' ? 'zh-CN' : 'en-US'];
}

export function getUiCopy(locale = getLocale()) {
    return UI_COPY[locale === 'zh-CN' ? 'zh-CN' : 'en-US'];
}

export function formatCopy(template, values = {}) {
    return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => values[key] ?? '');
}

export function applyLocaleDocument(pageKey, locale = getLocale()) {
    const normalizedLocale = locale === 'zh-CN' ? 'zh-CN' : 'en-US';
    const pageMeta = PAGE_META[normalizedLocale][pageKey];
    document.documentElement.lang = pageMeta.lang;
    document.title = pageMeta.title;
    applyThemeDocument();
}
