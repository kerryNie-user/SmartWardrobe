import { getLocale, getSharedCopy } from '../lib/locale.js'

export function renderWardrobeItemForm(config) {
    const locale = getLocale()
    const sharedCopy = getSharedCopy(locale)
    const previewImage = config.imagePreview || config.item.image || ''
    const previewAlt = config.item.title || config.form.fallback.title || config.form.labels.photo

    return `
        <section class="ct-wardrobe-item-shell">
            <div class="ct-wardrobe-item-shell__intro">
                <span class="ct-eyebrow">${config.eyebrow}</span>
                <h1 class="ct-wardrobe-item-shell__title">${config.title}</h1>
                <p class="ct-wardrobe-item-shell__note">${config.note}</p>
            </div>
            <form class="ct-wardrobe-form" data-ct-wardrobe-item-form>
                <div class="ct-wardrobe-form__field ct-wardrobe-form__photo-only">
                    <label for="ct-wardrobe-item-upload">${config.form.labels.photo}</label>
                    <input id="ct-wardrobe-item-upload" name="imageFile" type="file" accept="image/*" aria-label="${config.form.labels.photo}"${previewImage ? '' : ' required'}>
                    <p class="ct-wardrobe-form__hint">${config.form.notes.uploadOnly}</p>
                    <div class="ct-wardrobe-item-preview"${previewImage ? '' : ' hidden'}>
                        ${previewImage ? `<img class="ct-wardrobe-item-preview__image" data-ct-wardrobe-image-preview src="${previewImage}" alt="${previewAlt}">` : ''}
                    </div>
                </div>
                <div data-ct-form-notice></div>
                <div class="ct-wardrobe-form__actions">
                    <a class="ct-wardrobe-form__cancel-link" href="wardrobe.html">${sharedCopy.actions.cancel}</a>
                    <button class="ct-wardrobe-form__submit" type="submit">${config.submitLabel || config.form.actions.savePhoto}</button>
                </div>
            </form>
        </section>
    `
}
