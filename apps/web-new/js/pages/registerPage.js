import { renderAuthForm } from '../components/authForm.js'
import { registerUser } from '../lib/authStore.js'
import { getPostAuthRedirect } from '../lib/authGuard.js'
import { applyLocaleDocument, getLocale, getSharedCopy } from '../lib/locale.js'
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

    const paint = (status = '') => {
        root.innerHTML = renderAuthForm({
            ...copy,
            switchHref: redirect ? `login.html?redirect=${encodeURIComponent(redirect)}` : copy.switchHref,
            submitLabel: sharedCopy.actions.register,
            status
        })
    }

    paint()

    root.querySelector('[data-ct-auth-form]').addEventListener('submit', async (event) => {
        event.preventDefault()
        const formData = new window.FormData(event.currentTarget)

        try {
            await registerUser({
                name: String(formData.get('name') || '').trim(),
                emailOrMobile: String(formData.get('emailOrMobile') || '').trim(),
                password: String(formData.get('password') || '').trim()
            })
            navigateTo(getPostAuthRedirect())
        } catch {
            paint(copy.error)
        }
    })
}
