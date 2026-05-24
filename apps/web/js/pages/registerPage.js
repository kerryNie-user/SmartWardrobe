import { renderAuthForm } from '../components/authForm.js'
import { renderFormNotice } from '../components/formNotice.js'
import { registerUser } from '../lib/authStore.js'
import { getPostAuthRedirect } from '../lib/authGuard.js'
import { applyLocaleDocument, getLocale, getSharedCopy, getUiCopy } from '../lib/locale.js'
import { getFormFeedbackCopy, focusFirstInvalidField, setFormSubmitting, validateRequired } from '../lib/formValidation.js'
import { navigateTo } from '../lib/navigation.js'
import { getQueryParam } from '../lib/navigationAdapter.js'

function getCopy(locale) {
    return getUiCopy(locale).auth.register
}

export function renderRegisterPage() {
    const root = document.querySelector('[data-ct-auth-shell]')
    const locale = getLocale()
    const sharedCopy = getSharedCopy(locale)
    const redirect = getQueryParam('redirect')
    const copy = getCopy(locale)

    applyLocaleDocument('register', locale)

    if (!root) return

    root.innerHTML = renderAuthForm({
        ...copy,
        switchHref: redirect ? `login.html?redirect=${encodeURIComponent(redirect)}` : copy.switchHref,
        submitLabel: sharedCopy.actions.register,
        status: ''
    })

    const handleSubmit = async (event) => {
        const form = event.target.closest('[data-ct-auth-form]')
        if (!form) return
        event.preventDefault()

        const locale = getLocale()
        const copy = getCopy(locale)
        const formCopy = getFormFeedbackCopy(locale)
        const formData = new window.FormData(form)
        const noticeRoot = form.querySelector('[data-ct-form-notice]')

        const validation = validateRequired(formData, [
            { field: 'name', label: copy.fields[0]?.label || 'Name' },
            { field: 'emailOrMobile', label: copy.fields[1]?.label || 'Email' }
        ], locale)

        if (!validation.ok) {
            if (noticeRoot) {
                noticeRoot.innerHTML = renderFormNotice({
                    tone: 'error',
                    title: formCopy.status.validating,
                    message: validation.errors[0]?.message || formCopy.status.validating,
                    actions: []
                })
            }
            focusFirstInvalidField(form, validation.errors)
            return
        }

        setFormSubmitting(form, true)
        if (noticeRoot) {
            noticeRoot.innerHTML = renderFormNotice({
                tone: 'info',
                title: formCopy.status.saving,
                message: null,
                actions: []
            })
        }

        try {
            await registerUser({
                name: String(formData.get('name') || '').trim(),
                emailOrMobile: String(formData.get('emailOrMobile') || '').trim(),
                password: String(formData.get('password') || '').trim()
            })
            navigateTo(getPostAuthRedirect())
        } catch {
            setFormSubmitting(form, false)
            if (noticeRoot) {
                noticeRoot.innerHTML = renderFormNotice({
                    tone: 'error',
                    title: formCopy.status.failed,
                    message: copy.error,
                    actions: []
                })
            }
        }
    }

    root.addEventListener('submit', handleSubmit)
}
