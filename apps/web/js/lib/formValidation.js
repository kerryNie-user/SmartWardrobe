import { formatCopy, getUiCopy } from './locale.js'

function normalizeLocale(locale) {
    return locale === 'zh-CN' ? 'zh-CN' : 'en-US'
}

export function getFormFeedbackCopy(locale = 'en-US') {
    const copy = getUiCopy(normalizeLocale(locale)).formFeedback
    return {
        ...copy,
        validation: {
            ...copy.validation,
            required(label) {
                return formatCopy(copy.validation.required, { label })
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
