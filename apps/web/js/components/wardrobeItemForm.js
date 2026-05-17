import { getLocale, getSharedCopy } from '../lib/locale.js'

export function renderWardrobeItemForm(config) {
    const sharedCopy = getSharedCopy(getLocale())

    return `
        <section class="ct-wardrobe-item-shell">
            <div class="ct-wardrobe-item-shell__intro">
                <span class="ct-eyebrow">${config.eyebrow}</span>
                <h1 class="ct-wardrobe-item-shell__title">${config.title}</h1>
                <p class="ct-wardrobe-item-shell__note">${config.note}</p>
            </div>
            <form class="ct-wardrobe-form" data-ct-wardrobe-item-form>
                <div class="ct-wardrobe-form__grid">
                    <div class="ct-wardrobe-form__field is-full">
                        <label for="ct-wardrobe-item-upload">${getLocale() === 'zh-CN' ? '上传图片' : 'Upload Image'}</label>
                        <input id="ct-wardrobe-item-upload" name="imageFile" type="file" accept="image/*">
                        <div class="ct-wardrobe-item-preview"${config.item.image ? '' : ' hidden'}>
                            ${config.item.image ? `<img class="ct-wardrobe-item-preview__image" data-ct-wardrobe-image-preview src="${config.item.image}" alt="${config.item.title || config.form.placeholders.title}">` : ''}
                        </div>
                    </div>
                    <div class="ct-wardrobe-form__field is-full">
                        <label for="ct-wardrobe-item-title">${config.form.labels.title}</label>
                        <input id="ct-wardrobe-item-title" name="title" type="text" value="${config.item.title || ''}" placeholder="${config.form.placeholders.title}">
                    </div>
                    <div class="ct-wardrobe-form__field">
                        <label for="ct-wardrobe-item-category">${config.form.labels.category}</label>
                        <input id="ct-wardrobe-item-category" name="category" type="text" value="${config.item.category || ''}" placeholder="${config.form.placeholders.category}">
                    </div>
                    <div class="ct-wardrobe-form__field">
                        <label for="ct-wardrobe-item-filter">${config.form.labels.filter}</label>
                        <select id="ct-wardrobe-item-filter" name="filter">
                            ${config.tabs.filter((tab) => tab.key !== 'all').map((tab) => `<option value="${tab.key}"${tab.key === config.item.filter ? ' selected' : ''}>${tab.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="ct-wardrobe-form__field">
                        <label for="ct-wardrobe-item-size">${config.form.labels.size}</label>
                        <input id="ct-wardrobe-item-size" name="size" type="text" value="${config.item.size || ''}" placeholder="${config.form.placeholders.size}">
                    </div>
                    <div class="ct-wardrobe-form__field">
                        <label for="ct-wardrobe-item-color">${config.form.labels.color}</label>
                        <input id="ct-wardrobe-item-color" name="color" type="text" value="${config.item.color || ''}" placeholder="${config.form.placeholders.color}">
                    </div>
                    <div class="ct-wardrobe-form__field is-full">
                        <label for="ct-wardrobe-item-material">${config.form.labels.material}</label>
                        <input id="ct-wardrobe-item-material" name="material" type="text" value="${config.item.material || ''}" placeholder="${config.form.placeholders.material}">
                    </div>
                    <div class="ct-wardrobe-form__field is-full">
                        <label for="ct-wardrobe-item-image">${config.form.labels.image}</label>
                        <input id="ct-wardrobe-item-image" name="image" type="text" value="${config.item.image || ''}" placeholder="${config.form.placeholders.image}">
                    </div>
                </div>
                <label class="ct-wardrobe-form__check">
                    <input name="favorite" type="checkbox"${config.item.favorite ? ' checked' : ''}>
                    ${config.form.labels.favorite}
                </label>
                <div data-ct-form-notice></div>
                <div class="ct-wardrobe-form__actions">
                    <a class="ct-wardrobe-form__cancel-link" href="wardrobe.html">${sharedCopy.actions.cancel}</a>
                    <button class="ct-wardrobe-form__submit" type="submit">${config.submitLabel}</button>
                </div>
            </form>
        </section>
    `
}
