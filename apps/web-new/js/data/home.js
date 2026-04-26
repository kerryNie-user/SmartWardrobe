import { getHomeContent as fetchHomeContent } from '../lib/liteBackendClient.js'

let HOME_COPY = {
    'en-US': {
        weather: {
            condition: 'Cloudy',
            temperature: {
                current: '68°F',
                low: '48°F',
                high: '70°F'
            },
            location: {
                label: 'New York',
                precision: 'fallback'
            },
            summary: 'New York, Cloudy'
        },
        schedule: {
            label: 'Upcoming Schedule',
            actionText: 'See All',
            actionHref: 'schedule.html',
            title: 'Product Review',
            time: '10:00 AM',
            location: 'SoHo Studio'
        },
        tabs: [
            { key: 'recommend', label: 'Recommend', active: true },
            { key: 'featured', label: 'Featured', active: false }
        ],
        recommendLooks: [
            {
                id: 'urban-commute',
                tag: 'Daily Ritual',
                title: 'Urban Commute',
                description: 'Structured layering for transitional weather and a long city route.',
                image: '/uploads/shared/copenhagen-minimalist.jpg',
                openLabel: 'Open Urban Commute',
                detailSerial: 'Recommendation ID: CT-9001',
                detailTags: ['City Layering', 'Commute Core'],
                breakdown: [
                    { title: 'Sharp Trench', meta: 'Cotton Twill • Sand', note: 'Weather shield' },
                    { title: 'Soft Knit Shell', meta: 'Merino • Stone', note: 'Base warmth' },
                    { title: 'Structured Tote', meta: 'Grain Leather • Ink', note: 'Daily carry' }
                ]
            },
            {
                id: 'midnight-formalism',
                tag: 'Evening Form',
                title: 'Midnight Formalism',
                description: 'A disciplined monochrome line with soft tailoring and confident restraint.',
                image: '/uploads/shared/editorial-look-01.jpg',
                openLabel: 'Open Midnight Formalism',
                detailSerial: 'Recommendation ID: CT-9021',
                detailTags: ['Minimalist', 'Autumn 24'],
                breakdown: [
                    { title: 'Structural Blazer', meta: 'Virgin Wool • Midnight Black', note: 'In closet since 2023' },
                    { title: 'Relaxed Trousers', meta: 'Technical Crepe • Slate Gray', note: 'Custom tailored' },
                    { title: 'Chelsea Boot', meta: 'Polished Calfskin • Onyx', note: 'Essential staple' }
                ]
            },
            {
                id: 'weekend-minimal',
                tag: 'Off Duty',
                title: 'Weekend Minimal',
                description: 'Gallery-day essentials built from tactile neutrals and relaxed structure.',
                image: '/uploads/shared/editorial-look-02.jpg',
                openLabel: 'Open Weekend Minimal',
                detailSerial: 'Recommendation ID: CT-9044',
                detailTags: ['Weekend Edit', 'Gallery Day'],
                breakdown: [
                    { title: 'Boxy Shirt', meta: 'Washed Cotton • Chalk', note: 'Relaxed proportion' },
                    { title: 'Straight Denim', meta: 'Rigid Denim • Bone', note: 'Quiet structure' },
                    { title: 'Flat Loafer', meta: 'Brushed Leather • Taupe', note: 'Soft finish' }
                ]
            }
        ],
        featuredLooks: [
            {
                id: 'runway-analysis',
                tag: 'Editorial Focus',
                title: 'Runway Analysis',
                description: 'A sharper fashion lens on deconstructed tailoring, tonal layering, and sculpted movement.',
                image: '/uploads/home/runway-analysis.jpg',
                openLabel: 'Open Runway Analysis',
                detailSerial: 'Recommendation ID: CT-9102',
                detailTags: ['Editorial', 'Runway Study'],
                breakdown: [
                    { title: 'Raw-Edge Jacket', meta: 'Bonded Wool • Graphite', note: 'Editorial anchor' },
                    { title: 'Fluid Skirt Pant', meta: 'Matte Satin • Coal', note: 'Motion contrast' },
                    { title: 'Square Heel Pump', meta: 'Patent Leather • Black', note: 'Sharper finish' }
                ]
            },
            {
                id: 'atelier-notes',
                tag: 'Material Study',
                title: 'Atelier Notes',
                description: 'Texture-forward curation built around wool, brushed cotton, and controlled matte shine.',
                image: '/uploads/home/atelier-notes.jpg',
                openLabel: 'Open Atelier Notes',
                detailSerial: 'Recommendation ID: CT-9138',
                detailTags: ['Materiality', 'Studio Notes'],
                breakdown: [
                    { title: 'Wool Overshirt', meta: 'Brushed Wool • Moss', note: 'Texture lead' },
                    { title: 'Column Trouser', meta: 'Cotton Blend • Flint', note: 'Studio staple' },
                    { title: 'Leather Belt', meta: 'Vegetable Tan • Espresso', note: 'Controlled contrast' }
                ]
            }
        ]
    },
    'zh-CN': {
        weather: {
            condition: '多云',
            temperature: {
                current: '20°C',
                low: '9°C',
                high: '21°C'
            },
            location: {
                label: '纽约',
                precision: 'fallback'
            },
            summary: '纽约，多云'
        },
        schedule: {
            label: '即将到来的日程',
            actionText: '查看全部',
            actionHref: 'schedule.html',
            title: '产品评审',
            time: '10:00',
            location: 'SoHo 工作室'
        },
        tabs: [
            { key: 'recommend', label: '推荐', active: true },
            { key: 'featured', label: '精选', active: false }
        ],
        recommendLooks: [
            {
                id: 'urban-commute',
                tag: '日常仪式',
                title: '都市通勤',
                description: '为换季天气与长距离城市移动准备的结构化叠穿方案。',
                image: '/uploads/shared/copenhagen-minimalist.jpg',
                openLabel: '打开 都市通勤',
                detailSerial: '推荐编号：CT-9001',
                detailTags: ['城市叠穿', '通勤核心'],
                breakdown: [
                    { title: '利落风衣', meta: '斜纹棉 • 沙色', note: '天气防护层' },
                    { title: '柔软针织内搭', meta: '美丽诺羊毛 • 石色', note: '基础保暖层' },
                    { title: '结构手提包', meta: '粒面皮革 • 墨色', note: '日常携带' }
                ]
            },
            {
                id: 'midnight-formalism',
                tag: '夜间仪式',
                title: '午夜正装感',
                description: '以柔和剪裁和克制气场塑造出的纯黑秩序感。',
                image: '/uploads/shared/editorial-look-01.jpg',
                openLabel: '打开 午夜正装感',
                detailSerial: '推荐编号：CT-9021',
                detailTags: ['极简', '24秋季'],
                breakdown: [
                    { title: '结构西装外套', meta: '初剪羊毛 • 午夜黑', note: '2023 入柜' },
                    { title: '松弛长裤', meta: '科技绉布 • 石板灰', note: '定制打版' },
                    { title: '切尔西短靴', meta: '抛光小牛皮 • 缟玛瑙', note: '核心常备' }
                ]
            },
            {
                id: 'weekend-minimal',
                tag: '休闲时刻',
                title: '周末极简',
                description: '以触感中性色和松弛结构组织出的画廊日常造型。',
                image: '/uploads/shared/editorial-look-02.jpg',
                openLabel: '打开 周末极简',
                detailSerial: '推荐编号：CT-9044',
                detailTags: ['周末选集', '画廊日'],
                breakdown: [
                    { title: '盒型衬衫', meta: '水洗棉 • 粉笔白', note: '松弛比例' },
                    { title: '直筒牛仔裤', meta: '硬挺丹宁 • 骨白', note: '安静结构' },
                    { title: '平底乐福鞋', meta: '磨砂皮革 • 浅褐', note: '柔和收尾' }
                ]
            }
        ],
        featuredLooks: [
            {
                id: 'runway-analysis',
                tag: '秀场观察',
                title: '秀场解析',
                description: '聚焦解构西装、同色层次与雕塑式流动感的时装视角。',
                image: '/uploads/home/runway-analysis.jpg',
                openLabel: '打开 秀场解析',
                detailSerial: '推荐编号：CT-9102',
                detailTags: ['编辑视角', '秀场研究'],
                breakdown: [
                    { title: '毛边外套', meta: '复合羊毛 • 石墨黑', note: '编辑锚点' },
                    { title: '流动裙裤', meta: '哑光缎面 • 炭灰', note: '动态对比' },
                    { title: '方跟高跟鞋', meta: '漆皮 • 黑色', note: '锐利收尾' }
                ]
            },
            {
                id: 'atelier-notes',
                tag: '材质研究',
                title: '工坊笔记',
                description: '围绕羊毛、磨毛棉与克制哑光光泽搭建的材质策展。',
                image: '/uploads/home/atelier-notes.jpg',
                openLabel: '打开 工坊笔记',
                detailSerial: '推荐编号：CT-9138',
                detailTags: ['材质性', '工坊记录'],
                breakdown: [
                    { title: '羊毛罩衫', meta: '磨毛羊毛 • 苔绿色', note: '触感主角' },
                    { title: '柱形长裤', meta: '混纺棉 • 燧石灰', note: '工坊常备' },
                    { title: '皮革腰带', meta: '植鞣皮 • 深咖', note: '克制反差' }
                ]
            }
        ]
    }
};

export function getHomeContent(locale) {
    return HOME_COPY[locale === 'zh-CN' ? 'zh-CN' : 'en-US'];
}


const listeners = new Set()

export function subscribeHomeContent(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

function notify() {
    listeners.forEach((listener) => listener())
}

export async function hydrateHomeContent(locale) {
    try {
        const response = await fetchHomeContent(locale)
        if (response.ok && response.data?.content) {
            const loc = response.data.locale || locale
            HOME_COPY[loc === 'zh-CN' ? 'zh-CN' : 'en-US'] = response.data.content
            notify()
        }
    } catch (err) {
        console.warn('Failed to hydrate home content', err)
    }
}
