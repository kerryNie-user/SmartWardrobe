import { renderTopbar } from '../components/topbar.js'
import { renderWardrobeItemForm } from '../components/wardrobeItemForm.js'
import { getWardrobeContent } from '../data/wardrobe.js'
import { applyLocaleDocument, getLocale, getSharedCopy } from '../lib/locale.js'
import { navigateTo } from '../lib/navigation.js'
import { getQueryParam } from '../lib/navigationAdapter.js'
import { readImagePreviewSync } from '../lib/uploadAdapter.js'
import { getWardrobeItemById, hydrateWardrobe, saveWardrobeItem } from '../lib/wardrobeStore.js'

function getItemId() {
    return getQueryParam('id')
}

function getPageCopy(locale, isEdit) {
    if (locale === 'zh-CN') {
        return {
            eyebrow: isEdit ? '编辑单品' : '新增单品',
            title: isEdit ? '更新衣橱条目' : '创建新的衣橱条目',
            note: isEdit ? '调整分类、材质与图片，让衣橱档案保持最新。' : '填写核心信息后，这件单品会加入你的新版个人衣橱。'
        }
    }

    return {
        eyebrow: isEdit ? 'Edit Item' : 'Add Item',
        title: isEdit ? 'Update Wardrobe Entry' : 'Create a New Wardrobe Entry',
        note: isEdit ? 'Adjust the category, material, and image so the archive stays current.' : 'Complete the essentials and this item will join your new wardrobe archive.'
    }
}

export function renderWardrobeItemPage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]')
    const formRoot = document.querySelector('[data-ct-wardrobe-item-shell]')
    const locale = getLocale()
    const itemId = getItemId()
    let imagePreview = ''

    const bindForm = () => {
        const form = formRoot.querySelector('[data-ct-wardrobe-item-form]')
        const fileInput = formRoot.querySelector('[name="imageFile"]')
        const preview = formRoot.querySelector('[data-ct-wardrobe-image-preview]')
        const previewShell = preview?.closest('.ct-wardrobe-item-preview')
        const currentItem = getWardrobeItemById(itemId, locale) || {
            category: '',
            title: '',
            size: '',
            color: '',
            material: '',
            image: '',
            filter: 'essentials',
            favorite: false
        }

        imagePreview = currentItem.image || imagePreview

        fileInput?.addEventListener('change', () => {
            const file = fileInput.files?.[0]
            if (!file) return

            const result = readImagePreviewSync(file)
            if (!result.ok) return

            imagePreview = result.src
            if (preview) {
                preview.setAttribute('src', imagePreview)
                preview.setAttribute('alt', file.name || currentItem.title || getWardrobeContent(locale).form.placeholders.title)
            }
            previewShell?.removeAttribute('hidden')
        })

        form?.addEventListener('submit', (event) => {
            event.preventDefault()
            const formData = new window.FormData(event.currentTarget)
            const wardrobeContent = getWardrobeContent(locale)

            saveWardrobeItem({
                id: itemId || undefined,
                title: String(formData.get('title') || '').trim() || wardrobeContent.form.placeholders.title,
                category: String(formData.get('category') || '').trim() || wardrobeContent.form.fallback.category,
                filter: String(formData.get('filter') || '').trim() || 'essentials',
                size: String(formData.get('size') || '').trim() || wardrobeContent.form.fallback.size,
                color: String(formData.get('color') || '').trim() || wardrobeContent.form.fallback.color,
                material: String(formData.get('material') || '').trim() || wardrobeContent.form.fallback.material,
                image: imagePreview || String(formData.get('image') || '').trim() || wardrobeContent.form.placeholders.image,
                favorite: Boolean(formData.get('favorite'))
            }, locale)

            navigateTo('wardrobe.html')
        })
    }

    const paint = () => {
        const wardrobeContent = getWardrobeContent(locale)
        const sharedCopy = getSharedCopy(locale)
        const item = getWardrobeItemById(itemId, locale) || {
            category: '',
            title: '',
            size: '',
            color: '',
            material: '',
            image: '',
            filter: 'essentials',
            favorite: false
        }

        if (!imagePreview) imagePreview = item.image || ''

        applyLocaleDocument('wardrobeItem', locale)

        if (topbarRoot) {
            topbarRoot.innerHTML = renderTopbar({
                leftLabel: locale === 'zh-CN' ? '返回衣橱' : 'Back to wardrobe',
                leftIcon: '←',
                leftHref: 'wardrobe.html',
                rightLabel: locale === 'zh-CN' ? '打开个人资料' : 'Open profile',
                rightIcon: '◐',
                rightHref: 'profile.html'
            })
        }

        if (!formRoot) return

        formRoot.innerHTML = renderWardrobeItemForm({
            ...getPageCopy(locale, Boolean(itemId)),
            item,
            tabs: wardrobeContent.tabs,
            form: wardrobeContent.form,
            submitLabel: itemId ? sharedCopy.actions.saveChanges : sharedCopy.actions.addItem
        })
        bindForm()
    }

    if (!formRoot) return

    paint()
    void hydrateWardrobe(locale).then(() => {
        paint()
    })
}
