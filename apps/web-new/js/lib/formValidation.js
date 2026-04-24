function normalizeLocale(locale) {
    return locale === 'zh-CN' ? 'zh-CN' : 'en-US'
}

export function getFormFeedbackCopy(locale = 'en-US') {
    const normalizedLocale = normalizeLocale(locale)

    if (normalizedLocale === 'zh-CN') {
        return {
            actions: {
                retry: '重试',
                leave: '仍要离开',
                back: '返回',
                continueCreate: '以新建继续'
            },
            status: {
                validating: '请检查表单输入',
                saving: '正在保存',
                syncing: '正在同步到远端',
                saved: '已保存',
                failed: '保存失败',
                conflict: '发生冲突',
                stale: '远端不可用'
            },
            validation: {
                required(label) {
                    return `请填写${label}`
                }
            }
        }
    }

    return {
        actions: {
            retry: 'Retry',
            leave: 'Leave Anyway',
            back: 'Back',
            continueCreate: 'Continue as New'
        },
        status: {
            validating: 'Please review your inputs',
            saving: 'Saving',
            syncing: 'Syncing to remote',
            saved: 'Saved',
            failed: 'Save failed',
            conflict: 'Conflict detected',
            stale: 'Remote unavailable'
        },
        validation: {
            required(label) {
                return `${label} is required`
            }
        }
    }
}

export function validateRequired(formData, rules = [], locale = 'en-US') {
    const copy = getFormFeedbackCopy(locale)
    const errors = []

    rules.forEach((rule) => {
        const value = String(formData.get(rule.field) || '').trim()
        if (value) return
        errors.push({
            field: rule.field,
            message: rule.message || copy.validation.required(rule.label || rule.field)
        })
    })

    return {
        ok: errors.length === 0,
        errors
    }
}

export function focusFirstInvalidField(form, errors = []) {
    if (!form || !errors.length) return
    const field = errors[0]?.field
    if (!field) return
    const target = form.querySelector(`[name="${String(field).replace(/"/g, '\\"')}"]`)
    if (target && typeof target.focus === 'function') {
        target.focus()
    }
}

export function setFormSubmitting(form, submitting) {
    if (!form) return
    form.setAttribute('aria-busy', submitting ? 'true' : 'false')
    const submit = form.querySelector('button[type="submit"], input[type="submit"]')
    if (submit) {
        submit.disabled = Boolean(submitting)
    }
}
