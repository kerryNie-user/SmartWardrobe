import { renderTopbar } from '../components/topbar.js'
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js'
import { bindFormNoticeActions, renderFormNotice } from '../components/formNotice.js'
import { renderWardrobeItemForm } from '../components/wardrobeItemForm.js'
import { getWardrobeContent } from '../data/wardrobe.js'
import { applyLocaleDocument, getLocale, getSharedCopy, getUiCopy } from '../lib/locale.js'
import { getFormFeedbackCopy, focusFirstInvalidField, setFormSubmitting } from '../lib/formValidation.js'
import { bindPageStores } from '../lib/pageStoreBinding.js'
import { createWardrobeItemPageContract } from '../lib/pageContracts.js'
import { navigateTo } from '../lib/navigation.js'
import { getQueryParam } from '../lib/navigationAdapter.js'
import { readImagePreview } from '../lib/uploadAdapter.js'
import { scanWardrobePhoto } from '../lib/wardrobeItemScanner.js'
import { buildScannedWardrobeSavePayload } from '../lib/wardrobeSelectors.js'
import { getWardrobeItemById, getWardrobeSyncState, hydrateWardrobe, retryWardrobeSync, saveWardrobeItem, subscribeWardrobeStore, subscribeWardrobeSyncState } from '../lib/wardrobeStore.js'

function getItemId() {
    return getQueryParam('id')
}

function getPageCopy(locale, isEdit) {
    const copy = getUiCopy(locale).wardrobe.itemPage
    return {
        eyebrow: isEdit ? copy.editEyebrow : copy.addEyebrow,
        title: isEdit ? copy.editTitle : copy.addTitle,
        note: isEdit ? copy.editNote : copy.addNote
    }
}

export function renderWardrobeItemPage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]')
    const formRoot = document.querySelector('[data-ct-wardrobe-item-shell]')
    const syncFeedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'wardrobe-item')
    const itemId = getItemId()
    let imagePreview = ''
    let photoFile = null
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
        filter: '',
        favorite: false,
        aiJson: null
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
            const missingCopy = getUiCopy(locale).wardrobe.missing
            formNotice = {
                tone: 'error',
                title: missingCopy.title,
                message: missingCopy.message,
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
            submitLabel: itemId ? sharedCopy.actions.saveChanges : wardrobeContent.form.actions.savePhoto,
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
            form: contract.derivedView.form,
            imagePreview: contract.state.imagePreview,
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

    const handleChange = async (event) => {
        const fileInput = event.target.closest('[name="imageFile"]')
        if (!fileInput) return

        const locale = getLocale()
        const currentItem = getWardrobeItemById(itemId, locale) || createEmptyItem()
        const file = fileInput.files?.[0]
        photoFile = null
        if (!file) return

        const result = await readImagePreview(file)
        if (!result.ok) {
            const copy = getFormFeedbackCopy(locale)
            const imageCopy = getUiCopy(locale).image
            formNotice = {
                tone: 'error',
                title: imageCopy.previewFailedTitle,
                message: imageCopy.previewFailedMessage,
                actions: [{ key: 'leave', label: copy.actions.leave, variant: 'secondary' }]
            }
            const noticeRoot = formRoot.querySelector('[data-ct-form-notice]')
            if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(formNotice)
            return
        }

        photoFile = file
        imagePreview = result.src
        const previewShell = formRoot.querySelector('.ct-wardrobe-item-preview')
        if (!previewShell) return

        let preview = formRoot.querySelector('[data-ct-wardrobe-image-preview]')
        if (!preview) {
            preview = document.createElement('img')
            preview.className = 'ct-wardrobe-item-preview__image'
            preview.setAttribute('data-ct-wardrobe-image-preview', '')
            previewShell.appendChild(preview)
        }

        preview.setAttribute('src', imagePreview)
        preview.setAttribute('alt', file.name || currentItem.title || getWardrobeContent(locale).form.fallback.title)
        previewShell.removeAttribute('hidden')
    }
    formRoot.addEventListener('change', handleChange)
    listenerCleanups.push(() => formRoot.removeEventListener('change', handleChange))

    const handleSubmit = async (event) => {
        const form = event.target.closest('[data-ct-wardrobe-item-form]')
        if (!form) return

        event.preventDefault()
        const locale = getLocale()
        const wardrobeContent = getWardrobeContent(locale)
        const copy = getFormFeedbackCopy(locale)
        const currentItem = getWardrobeItemById(itemId, locale) || createEmptyItem()
        const resolvedImage = imagePreview || currentItem.image

        if (isInvalidItemId) {
            return
        }

        if (!resolvedImage) {
            formNotice = {
                tone: 'error',
                title: copy.status.validating,
                message: copy.validation.required(wardrobeContent.form.labels.photo),
                actions: []
            }
            const noticeRoot = form.querySelector('[data-ct-form-notice]')
            if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(formNotice)
            focusFirstInvalidField(form, [{ field: 'imageFile' }])
            return
        }

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

        const scanResult = photoFile
            ? await scanWardrobePhoto(photoFile)
            : currentItem.aiJson
                ? {
                    ok: true,
                    status: currentItem.aiJson.status || 'ready',
                    source: currentItem.aiJson.source || 'wardrobe-item-scanner',
                    item: {},
                    raw: currentItem.aiJson.raw || null,
                    metadata: currentItem.aiJson.metadata || {
                        reason: 'existing-photo-retained'
                    }
                }
                : {
                    ok: false,
                    status: 'unavailable',
                    source: 'wardrobe-item-scanner',
                    item: {},
                    raw: null,
                    metadata: {
                        reason: 'existing-photo-retained'
                    }
                }

        saveWardrobeItem(buildScannedWardrobeSavePayload({
            itemId: itemId || '',
            scanResult,
            imagePreview: resolvedImage,
            existingItem: currentItem,
            fallback: wardrobeContent.form.fallback
        }), locale)

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
                    domainKey: 'wardrobe',
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
