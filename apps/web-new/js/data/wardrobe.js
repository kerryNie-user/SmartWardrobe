const WARDROBE_COPY = {
    'en-US': {
        tabs: [
            { key: 'all', label: 'All', active: true },
            { key: 'outerwear', label: 'Outerwear', active: false },
            { key: 'evening', label: 'Evening', active: false },
            { key: 'essentials', label: 'Essentials', active: false }
        ],
        hero: {
            eyebrow: 'Archived Collection',
            title: 'Personal Inventory',
            note: 'A quieter archive of structured tailoring, evening lines, and neutral essentials shaped for everyday curation.'
        },
        items: [
            {
                id: 'wool-trench',
                category: 'Outerwear',
                title: 'Wool Trench',
                size: 'M',
                color: 'Oatmeal',
                material: 'Wool Blend',
                image: '/uploads/wardrobe/wool-trench.jpg',
                filter: 'outerwear',
                favorite: true
            },
            {
                id: 'silk-slip',
                category: 'Evening',
                title: 'Silk Slip',
                size: 'S',
                color: 'Onyx',
                material: '100% Silk',
                image: '/uploads/shared/editorial-look-01.jpg',
                filter: 'evening',
                favorite: false
            },
            {
                id: 'studio-shirt',
                category: 'Essentials',
                title: 'Studio Shirt',
                size: 'M',
                color: 'Bone',
                material: 'Cotton Poplin',
                image: '/uploads/wardrobe/studio-shirt.jpg',
                filter: 'essentials',
                favorite: false
            }
        ],
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
            eyebrow: '归档收藏',
            title: '个人库存',
            note: '这是一份更安静的档案，围绕结构剪裁、晚间线条和中性基础款持续累积。'
        },
        items: [
            {
                id: 'wool-trench',
                category: '外套',
                title: '羊毛风衣',
                size: 'M',
                color: '燕麦色',
                material: '羊毛混纺',
                image: '/uploads/wardrobe/wool-trench.jpg',
                filter: 'outerwear',
                favorite: true
            },
            {
                id: 'silk-slip',
                category: '晚间',
                title: '丝质吊带裙',
                size: 'S',
                color: '缟玛瑙黑',
                material: '100% 真丝',
                image: '/uploads/shared/editorial-look-01.jpg',
                filter: 'evening',
                favorite: false
            },
            {
                id: 'studio-shirt',
                category: '基础款',
                title: '工作室衬衫',
                size: 'M',
                color: '骨白',
                material: '棉府绸',
                image: '/uploads/wardrobe/studio-shirt.jpg',
                filter: 'essentials',
                favorite: false
            }
        ],
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
