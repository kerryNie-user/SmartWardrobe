import { renderAuthForm } from '../components/authForm.js'
import { renderFormNotice } from '../components/formNotice.js'
import { loginUser } from '../lib/authStore.js'
import { getPostAuthRedirect } from '../lib/authGuard.js'
import { applyLocaleDocument, getLocale, getSharedCopy } from '../lib/locale.js'
import { getFormFeedbackCopy, focusFirstInvalidField, setFormSubmitting, validateRequired } from '../lib/formValidation.js'
import { navigateTo } from '../lib/navigation.js'
import { getQueryParam } from '../lib/navigationAdapter.js'

function getCopy(locale) {
    if (locale === 'zh-CN') {
        return {
            eyebrow: '账号访问',
            title: '登录你的档案',
            note: '登录后继续访问衣橱、日程、收藏与个人资料。',
            fields: [
                { name: 'emailOrMobile', label: '邮箱或手机号', type: 'text', placeholder: 'kerry@example.com', autocomplete: 'username' },
                { name: 'password', label: '密码', type: 'password', placeholder: '输入你的密码', autocomplete: 'current-password' }
            ],
            switchLabel: '还没有账号？前往注册',
            switchHref: 'register.html',
            error: '登录失败，请检查账号信息。'
        }
    }

    return {
        eyebrow: 'Account Access',
        title: 'Sign In to Your Archive',
        note: 'Sign in to continue into wardrobe, schedule, favorites, and profile.',
        fields: [
            { name: 'emailOrMobile', label: 'Email or Mobile', type: 'text', placeholder: 'kerry@example.com', autocomplete: 'username' },
            { name: 'password', label: 'Password', type: 'password', placeholder: 'Enter your password', autocomplete: 'current-password' }
        ],
        switchLabel: 'Need an account? Create one',
        switchHref: 'register.html',
        error: 'Unable to sign in. Please check your credentials.'
    }
}

export function renderLoginPage() {
    const root = document.querySelector('[data-ct-auth-shell]')
    const locale = getLocale()
    const sharedCopy = getSharedCopy(locale)
    const redirect = getQueryParam('redirect')
    const copy = getCopy(locale)

    applyLocaleDocument('login', locale)

    if (!root) return

    root.innerHTML = renderAuthForm({
        ...copy,
        switchHref: redirect ? `register.html?redirect=${encodeURIComponent(redirect)}` : copy.switchHref,
        submitLabel: sharedCopy.actions.login,
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
            { field: 'emailOrMobile', label: copy.fields[0]?.label || 'Email' }
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
            await loginUser({
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
