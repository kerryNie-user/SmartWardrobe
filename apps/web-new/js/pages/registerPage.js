import { renderAuthForm } from '../components/authForm.js'
import { renderFormNotice } from '../components/formNotice.js'
import { registerUser } from '../lib/authStore.js'
import { getPostAuthRedirect } from '../lib/authGuard.js'
import { applyLocaleDocument, getLocale, getSharedCopy } from '../lib/locale.js'
import { getFormFeedbackCopy, focusFirstInvalidField, setFormSubmitting, validateRequired } from '../lib/formValidation.js'
import { navigateTo } from '../lib/navigation.js'
import { getQueryParam } from '../lib/navigationAdapter.js'

function getCopy(locale) {
    if (locale === 'zh-CN') {
        return {
            eyebrow: '新建账号',
            title: '注册新版档案',
            note: '完成注册后即可进入新的个人资料、衣橱与收藏系统。',
            fields: [
                { name: 'name', label: '用户名', type: 'text', placeholder: 'Nova Lane', autocomplete: 'name' },
                { name: 'emailOrMobile', label: '邮箱或手机号', type: 'text', placeholder: 'nova@example.com', autocomplete: 'username' },
                { name: 'password', label: '密码', type: 'password', placeholder: '至少 8 位字符', autocomplete: 'new-password' }
            ],
            switchLabel: '已有账号？返回登录',
            switchHref: 'login.html',
            error: '注册失败，请更换账号信息后重试。'
        }
    }

    return {
        eyebrow: 'Create Account',
        title: 'Register the New Archive',
        note: 'Create an account to unlock the new profile, wardrobe, and saved flows.',
        fields: [
            { name: 'name', label: 'Display Name', type: 'text', placeholder: 'Nova Lane', autocomplete: 'name' },
            { name: 'emailOrMobile', label: 'Email or Mobile', type: 'text', placeholder: 'nova@example.com', autocomplete: 'username' },
            { name: 'password', label: 'Password', type: 'password', placeholder: 'At least 8 characters', autocomplete: 'new-password' }
        ],
        switchLabel: 'Already registered? Sign in',
        switchHref: 'login.html',
        error: 'Unable to register. Try a different account.'
    }
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
