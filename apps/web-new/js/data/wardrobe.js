const WARDROBE_COPY = {
    'en-US': {
        tabs: [
            { key: 'all', label: 'All', active: true },
            { key: 'outerwear', label: 'Outerwear', active: false },
            { key: 'evening', label: 'Evening', active: false },
            { key: 'essentials', label: 'Essentials', active: false }
        ],
        hero: {
            eyebrow: '',
            title: '',
            note: '',
        },
        items: [],
        form: {
            labels: {
                title: 'Title',
                category: 'Category',
                filter: 'Filter',
                size: 'Size',
                color: 'Color',
                material: 'Material',
                image: 'Image',
                favorite: 'Favorite Piece'
            },
            placeholders: {
                title: 'Travel Bomber',
                category: 'Outerwear',
                size: 'M',
                color: 'Graphite',
                material: 'Nylon',
                image: '/uploads/wardrobe/wool-trench.jpg'
            },
            fallback: {
                category: 'Essentials',
                size: 'M',
                color: 'Black',
                material: 'Wool'
            }
        }
    },
    'zh-CN': {
        tabs: [
            { key: 'all', label: '全部', active: true },
            { key: 'outerwear', label: '外套', active: false },
            { key: 'evening', label: '晚间', active: false },
            { key: 'essentials', label: '基础款', active: false }
        ],
        hero: {
            eyebrow: '',
            title: '',
            note: '',
        },
        items: [],
        form: {
            labels: {
                title: '标题',
                category: '分类',
                filter: '筛选',
                size: '尺码',
                color: '颜色',
                material: '材质',
                image: '图片',
                favorite: '收藏单品'
            },
            placeholders: {
                title: '旅行飞行员夹克',
                category: '外套',
                size: 'M',
                color: '石墨灰',
                material: '尼龙',
                image: '/uploads/wardrobe/wool-trench.jpg'
            },
            fallback: {
                category: '基础款',
                size: 'M',
                color: '黑色',
                material: '羊毛'
            }
        }
    }
};

export function getWardrobeContent(locale) {
    return WARDROBE_COPY[locale === 'zh-CN' ? 'zh-CN' : 'en-US'];
}
