const WARDROBE_COPY = {
    'en-US': {
        tabs: [
            { key: 'all', label: 'All', active: true },
            { key: 'outerwear', label: 'Outerwear', active: false },
            { key: 'evening', label: 'Evening', active: false },
            { key: 'essentials', label: 'Essentials', active: false }
        ],
        hero: {
            eyebrow: 'Wardrobe',
            title: 'Personal Archive',
            note: 'Keep pieces, proportions, and materials organized before they become outfits.',
        },
        items: [],
        form: {
            labels: {
                photo: 'Photo'
            },
            actions: {
                savePhoto: 'Save Photo'
            },
            notes: {
                uploadOnly: 'Upload one clear garment photo. Model-recognition data is returned by the interface and saved with the wardrobe record.'
            },
            fallback: {
                title: 'Pending Recognition Item',
                category: 'Uncategorized',
                filter: 'uncategorized'
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
            eyebrow: '衣橱',
            title: '个人衣橱档案',
            note: '整理单品、版型与材质，让搭配和出行规划更稳定。',
        },
        items: [],
        form: {
            labels: {
                photo: '上传照片'
            },
            actions: {
                savePhoto: '保存照片'
            },
            notes: {
                uploadOnly: '只上传一张清晰单品照片。单品识别信息由模型接口回传，并随衣橱记录保存。'
            },
            fallback: {
                title: '待识别单品',
                category: '未分类',
                filter: 'uncategorized'
            }
        }
    }
};

export function getWardrobeContent(locale) {
    return WARDROBE_COPY[locale === 'zh-CN' ? 'zh-CN' : 'en-US'];
}
