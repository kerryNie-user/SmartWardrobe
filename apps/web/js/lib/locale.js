const LOCALE_KEY = 'app_locale';
const THEME_KEY = 'app_theme';

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
            instantAiScan: 'Instant AI Scan',
            instantAiScanCopy: 'Extract attributes automatically from photos.',
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
            instantAiScan: '即时 AI 扫描',
            instantAiScanCopy: '从照片中自动提取属性信息。',
            searchLabel: '搜索'
        }
    }
};

export function getLocale() {
    return window.localStorage?.getItem(LOCALE_KEY) === 'zh-CN' ? 'zh-CN' : 'en-US';
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

export function applyLocaleDocument(pageKey, locale = getLocale()) {
    const normalizedLocale = locale === 'zh-CN' ? 'zh-CN' : 'en-US';
    const pageMeta = PAGE_META[normalizedLocale][pageKey];
    document.documentElement.lang = pageMeta.lang;
    document.title = pageMeta.title;
    applyThemeDocument();
}
