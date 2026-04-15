import { renderTopbar } from '../components/topbar.js'
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js'
import { bindFormNoticeActions, renderFormNotice } from '../components/formNotice.js'
import { renderWardrobeItemForm } from '../components/wardrobeItemForm.js'
import { getWardrobeContent } from '../data/wardrobe.js'
import { applyLocaleDocument, getLocale, getSharedCopy } from '../lib/locale.js'
import { getFormFeedbackCopy, focusFirstInvalidField, setFormSubmitting, validateRequired } from '../lib/formValidation.js'
import { bindPageStores } from '../lib/pageStoreBinding.js'
import { createWardrobeItemPageContract } from '../lib/pageContracts.js'
import { navigateTo } from '../lib/navigation.js'
import { getQueryParam } from '../lib/navigationAdapter.js'
import { readImagePreviewSync } from '../lib/uploadAdapter.js'
import { getWardrobeItemById, getWardrobeSyncState, hydrateWardrobe, retryWardrobeSync, saveWardrobeItem, subscribeWardrobeStore, subscribeWardrobeSyncState } from '../lib/wardrobeStore.js'

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
    const syncFeedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'wardrobe-item')
    const itemId = getItemId()
    let imagePreview = ''
    let formNotice = null
    let isInvalidItemId = false
    let noticeCleanup = () => {}
    let syncCleanup = null
    let submissionActive = false
    const listenerCleanups = []

    const createEmptyItem = () => ({
        category: '',
        title: '',
        size: '',
        color: '',
        material: '',
        image: '',
        filter: 'essentials',
        favorite: false
    })

    const paint = () => {
        const locale = getLocale()
        const wardrobeContent = getWardrobeContent(locale)
        const sharedCopy = getSharedCopy(locale)
        const existingItem = itemId ? getWardrobeItemById(itemId, locale) : null
        const item = existingItem || createEmptyItem()
        isInvalidItemId = Boolean(itemId) && !existingItem
        if (isInvalidItemId) {
            const copy = getFormFeedbackCopy(locale)
            formNotice = {
                tone: 'error',
                title: locale === 'zh-CN' ? '未找到单品' : 'Wardrobe item not found',
                message: locale === 'zh-CN'
                    ? '当前链接的单品不存在，无法继续编辑。'
                    : 'This wardrobe item does not exist and cannot be edited.',
                actions: [
                    { key: 'continue-create', label: copy.actions.continueCreate },
                    { key: 'leave', label: copy.actions.back, variant: 'secondary' }
                ]
            }
        }

        if (!imagePreview) imagePreview = item.image || ''
        const contract = createWardrobeItemPageContract({
            locale,
            itemId,
            imagePreview,
            content: wardrobeContent,
            item,
            pageCopy: getPageCopy(locale, Boolean(itemId)),
            submitLabel: itemId ? sharedCopy.actions.saveChanges : sharedCopy.actions.addItem,
            syncStates: {
                wardrobe: getWardrobeSyncState()
            }
        })

        applyLocaleDocument('wardrobeItem', locale)

        if (topbarRoot) {
            topbarRoot.innerHTML = renderTopbar({
                leftLabel: contract.derivedView.topbar.leftLabel,
                leftIcon: '←',
                leftHref: contract.derivedView.topbar.leftHref,
                rightLabel: contract.derivedView.topbar.rightLabel,
                rightIcon: '◐',
                rightHref: contract.derivedView.topbar.rightHref
            })
        }

        if (!formRoot) return

        formRoot.innerHTML = renderWardrobeItemForm({
            ...contract.derivedView.pageCopy,
            item: contract.derivedView.item,
            tabs: contract.derivedView.tabs,
            form: contract.derivedView.form,
            submitLabel: contract.derivedView.submitLabel
        })

        const noticeRoot = formRoot.querySelector('[data-ct-form-notice]')
        if (noticeRoot) {
            noticeCleanup()
            noticeRoot.innerHTML = renderFormNotice(formNotice)
            noticeCleanup = bindFormNoticeActions(noticeRoot, {
                retry() {
                    const nextLocale = getLocale()
                    const copy = getFormFeedbackCopy(nextLocale)
                    submissionActive = true
                    setFormSubmitting(formRoot.querySelector('[data-ct-wardrobe-item-form]'), true)
                    formNotice = {
                        tone: 'info',
                        title: copy.status.syncing,
                        message: null,
                        actions: [{ key: 'leave', label: copy.actions.leave, variant: 'secondary' }]
                    }
                    noticeRoot.innerHTML = renderFormNotice(formNotice)
                    retryWardrobeSync(nextLocale)
                },
                leave() {
                    submissionActive = false
                    syncCleanup?.()
                    syncCleanup = null
                    navigateTo('wardrobe.html')
                },
                'continue-create'() {
                    submissionActive = false
                    syncCleanup?.()
                    syncCleanup = null
                    navigateTo('wardrobe-item.html')
                }
            })
        }

        const submitButton = formRoot.querySelector('.ct-wardrobe-form__submit')
        if (submitButton) {
            submitButton.disabled = Boolean(isInvalidItemId)
        }
    }

    if (!formRoot) return

    const handleChange = (event) => {
        const fileInput = event.target.closest('[name="imageFile"]')
        if (!fileInput) return

        const locale = getLocale()
        const currentItem = getWardrobeItemById(itemId, locale) || createEmptyItem()
        const file = fileInput.files?.[0]
        if (!file) return

        const result = readImagePreviewSync(file)
        if (!result.ok) {
            const copy = getFormFeedbackCopy(locale)
            formNotice = {
                tone: 'error',
                title: locale === 'zh-CN' ? '图片读取失败' : 'Image preview failed',
                message: locale === 'zh-CN' ? '无法读取这张图片，请更换文件重试。' : 'Unable to read this image. Try another file.',
                actions: [{ key: 'leave', label: copy.actions.leave, variant: 'secondary' }]
            }
            const noticeRoot = formRoot.querySelector('[data-ct-form-notice]')
            if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(formNotice)
            return
        }

        imagePreview = result.src
        const preview = formRoot.querySelector('[data-ct-wardrobe-image-preview]')
        const previewShell = preview?.closest('.ct-wardrobe-item-preview')
        if (preview) {
            preview.setAttribute('src', imagePreview)
            preview.setAttribute('alt', file.name || currentItem.title || getWardrobeContent(locale).form.placeholders.title)
        }
        previewShell?.removeAttribute('hidden')
    }
    formRoot.addEventListener('change', handleChange)
    listenerCleanups.push(() => formRoot.removeEventListener('change', handleChange))

    const handleSubmit = (event) => {
        const form = event.target.closest('[data-ct-wardrobe-item-form]')
        if (!form) return

        event.preventDefault()
        const locale = getLocale()
        const formData = new window.FormData(form)
        const wardrobeContent = getWardrobeContent(locale)
        const copy = getFormFeedbackCopy(locale)

        if (isInvalidItemId) {
            return
        }

        const validation = validateRequired(formData, [
            { field: 'title', label: wardrobeContent.form.labels.title }
        ], locale)

        if (!validation.ok) {
            formNotice = {
                tone: 'error',
                title: copy.status.validating,
                message: validation.errors[0]?.message || copy.status.validating,
                actions: []
            }
            const noticeRoot = form.querySelector('[data-ct-form-notice]')
            if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(formNotice)
            focusFirstInvalidField(form, validation.errors)
            return
        }

        const title = String(formData.get('title') || '').trim()

        saveWardrobeItem({
            id: itemId || undefined,
            title,
            category: String(formData.get('category') || '').trim() || wardrobeContent.form.fallback.category,
            filter: String(formData.get('filter') || '').trim() || 'essentials',
            size: String(formData.get('size') || '').trim() || wardrobeContent.form.fallback.size,
            color: String(formData.get('color') || '').trim() || wardrobeContent.form.fallback.color,
            material: String(formData.get('material') || '').trim() || wardrobeContent.form.fallback.material,
            image: imagePreview || String(formData.get('image') || '').trim() || wardrobeContent.form.placeholders.image,
            favorite: Boolean(formData.get('favorite'))
        }, locale)

        submissionActive = true
        setFormSubmitting(form, true)
        formNotice = {
            tone: 'info',
            title: copy.status.saving,
            message: copy.status.syncing,
            actions: [{ key: 'leave', label: copy.actions.leave, variant: 'secondary' }]
        }
        const noticeRoot = form.querySelector('[data-ct-form-notice]')
        if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(formNotice)

        syncCleanup?.()
        syncCleanup = subscribeWardrobeSyncState((state) => {
            if (!submissionActive) return
            const current = state?.status || 'idle'
            const latestLocale = getLocale()
            const copy = getFormFeedbackCopy(latestLocale)
            const noticeRoot = form.querySelector('[data-ct-form-notice]')

            if (current === 'synced') {
                setFormSubmitting(form, false)
                formNotice = { tone: 'success', title: copy.status.saved, message: null, actions: [] }
                if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(formNotice)
                submissionActive = false
                syncCleanup?.()
                syncCleanup = null
                window.setTimeout(() => navigateTo('wardrobe.html'), 0)
                return
            }

            if (current === 'failed') {
                setFormSubmitting(form, false)
                formNotice = {
                    tone: 'error',
                    title: copy.status.failed,
                    message: null,
                    actions: [
                        { key: 'retry', label: copy.actions.retry },
                        { key: 'leave', label: copy.actions.leave, variant: 'secondary' }
                    ]
                }
                if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(formNotice)
                return
            }

            if (current === 'stale') {
                setFormSubmitting(form, false)
                formNotice = {
                    tone: 'warning',
                    title: copy.status.stale,
                    message: null,
                    actions: [
                        { key: 'retry', label: copy.actions.retry },
                        { key: 'leave', label: copy.actions.leave, variant: 'secondary' }
                    ]
                }
                if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(formNotice)
            }
        })
    }
    formRoot.addEventListener('submit', handleSubmit)
    listenerCleanups.push(() => formRoot.removeEventListener('submit', handleSubmit))

    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeWardrobeStore(listener)
        ],
        hydrators: [
            () => hydrateWardrobe(getLocale())
        ],
        syncFeedback: {
            root: syncFeedbackRoot,
            locale: () => getLocale(),
            bindings: [
                {
                    key: 'wardrobe',
                    label: { 'zh-CN': '衣橱', 'en-US': 'Wardrobe' },
                    getState: () => getWardrobeSyncState(),
                    subscribe: (listener) => subscribeWardrobeSyncState(listener),
                    retry: (locale) => retryWardrobeSync(locale)
                }
            ]
        }
    })

    return {
        ...binding,
        teardown() {
            binding.teardown()
            listenerCleanups.forEach((cleanup) => cleanup())
            noticeCleanup()
            syncCleanup?.()
        }
    }
}
