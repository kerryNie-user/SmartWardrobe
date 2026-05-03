export function renderWardrobeDetailPanel(item, locale) {
    return `
        <section class="ct-wardrobe-detail">
            <div class="ct-wardrobe-detail__media">
                <img class="ct-wardrobe-detail__image" src="${item.image}" alt="${item.title}">
            </div>
            <div class="ct-wardrobe-detail__content">
                <span class="ct-eyebrow">${item.category}</span>
                <h1 class="ct-wardrobe-detail__title">${item.title}</h1>
                <dl class="ct-wardrobe-detail__meta">
                    <div><dt>${locale === 'zh-CN' ? '尺码' : 'Size'}</dt><dd>${item.size}</dd></div>
                    <div><dt>${locale === 'zh-CN' ? '颜色' : 'Color'}</dt><dd>${item.color}</dd></div>
                    <div><dt>${locale === 'zh-CN' ? '材质' : 'Material'}</dt><dd>${item.material}</dd></div>
                </dl>
                <div class="ct-wardrobe-detail__actions">
                    <span class="ct-wardrobe-card__badge">${item.favorite ? '★' : '◇'}</span>
                    <a class="ct-wardrobe-form__cancel-link" data-ct-edit-wardrobe-detail href="wardrobe-item.html?id=${item.id}">${locale === 'zh-CN' ? '编辑单品' : 'Edit Item'}</a>
                </div>
            </div>
        </section>
    `
}
