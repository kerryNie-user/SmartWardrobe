const SETTINGS_COPY = {
    'en-US': {
        topbar: {
            leftLabel: 'Back to me',
            rightLabel: 'Current settings'
        },
        profile: {
            eyebrow: 'Personal Information',
            name: '',
            bio: ''
        },
        heading: 'Preferences Console',
        items: {
            publicProfile: 'Public Profile',
            outfitReminders: 'Outfit Reminders',
            language: 'Language',
            displayMode: 'Display Mode',
            wardrobeLayout: 'Wardrobe Layout',
            temperatureUnit: 'Temperature Unit',
            logout: 'Logout'
        },
        options: {
            'en-US': 'EN',
            'zh-CN': 'CN',
            light: 'Light',
            dark: 'Dark',
            grid: 'Grid',
            list: 'List',
            celsius: '°C',
            fahrenheit: '°F'
        }
    },
    'zh-CN': {
        topbar: {
            leftLabel: '返回我的',
            rightLabel: '当前设置'
        },
        profile: {
            eyebrow: '个人信息',
            name: '',
            bio: ''
        },
        heading: '偏好控制台',
        items: {
            publicProfile: '公开个人主页',
            outfitReminders: '穿搭提醒',
            language: '语言',
            displayMode: '显示模式',
            wardrobeLayout: '衣橱布局',
            temperatureUnit: '温度单位',
            logout: '退出登录'
        },
        options: {
            'en-US': '英文',
            'zh-CN': '中文',
            light: '浅色',
            dark: '深色',
            grid: '网格',
            list: '列表',
            celsius: '摄氏',
            fahrenheit: '华氏'
        }
    }
};

const SETTINGS_ITEMS = [
    { key: 'public-profile', copyKey: 'publicProfile', type: 'toggle', value: true },
    { key: 'outfit-reminders', copyKey: 'outfitReminders', type: 'toggle', value: true },
    { key: 'language', copyKey: 'language', type: 'choices', value: 'en-US', options: ['en-US', 'zh-CN'] },
    { key: 'display-mode', copyKey: 'displayMode', type: 'choices', value: 'dark', options: ['light', 'dark'] },
    { key: 'wardrobe-layout', copyKey: 'wardrobeLayout', type: 'choices', value: 'grid', options: ['grid', 'list'] },
    { key: 'temperature-unit', copyKey: 'temperatureUnit', type: 'choices', value: 'celsius', options: ['celsius', 'fahrenheit'] },
    { key: 'logout', copyKey: 'logout', type: 'action' }
];

export const settingsProfile = {
    name: SETTINGS_COPY['en-US'].profile.name,
    bio: SETTINGS_COPY['en-US'].profile.bio,
    avatar: '',
    eyebrow: SETTINGS_COPY['en-US'].profile.eyebrow
};

export function getSettingsContent(locale, state) {
    const normalizedLocale = locale === 'zh-CN' ? 'zh-CN' : 'en-US';
    const copy = SETTINGS_COPY[normalizedLocale];

    const mapItems = (items) => items.map((item) => ({
        ...item,
        label: copy.items[item.copyKey],
        options: item.options
            ? item.options.map((option) => ({
                value: option,
                label: copy.options[option]
            }))
            : undefined,
        value: state[item.key]
    }));

    return {
        topbar: copy.topbar,
        heading: copy.heading,
        profile: {
            ...settingsProfile,
            eyebrow: copy.profile.eyebrow,
            bio: copy.profile.bio
        },
        items: mapItems(SETTINGS_ITEMS)
    };
}
