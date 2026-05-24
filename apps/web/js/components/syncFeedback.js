import { formatCopy, getUiCopy } from '../lib/locale.js'

const SYNC_STATUS_PRIORITY = {
    conflict: 6,
    failed: 5,
    stale: 4,
    syncing: 3,
    loading: 2,
    synced: 1,
    idle: 0
}

function resolveLocale(locale) {
    return locale === 'zh-CN' ? 'zh-CN' : 'en-US'
}

function resolveLabel(label, locale) {
    if (!label) return ''
    if (typeof label === 'string') return label
    return label[resolveLocale(locale)] || label['en-US'] || ''
}

function resolveDomainLabel(binding, locale) {
    if (binding.domainKey) {
        return getUiCopy(locale).domains?.[binding.domainKey] || binding.domainKey
    }
    return resolveLabel(binding.label, locale)
}

export function ensureSyncFeedbackRoot(anchor, key = 'page') {
    if (!anchor?.parentNode) return null
    const rootId = `ct-sync-feedback-${key}`
    let root = anchor.parentNode.querySelector(`#${rootId}`)
    if (root) return root

    root = document.createElement('div')
    root.id = rootId
    root.className = 'ct-sync-feedback-root'
    root.setAttribute('data-ct-sync-feedback-root', key)
    anchor.insertAdjacentElement('afterend', root)
    return root
}

export function buildSyncFeedbackSummary(bindings = [], locale = 'en-US') {
    const activeBindings = bindings
        .map((binding) => ({
            ...binding,
            label: resolveDomainLabel(binding, locale),
            status: binding.state?.status || 'idle'
        }))
        .filter((binding) => !['idle', 'synced'].includes(binding.status))

    if (!activeBindings.length) {
        return null
    }

    const status = activeBindings.reduce((highest, binding) => (
        SYNC_STATUS_PRIORITY[binding.status] > SYNC_STATUS_PRIORITY[highest] ? binding.status : highest
    ), activeBindings[0].status)

    const copy = getUiCopy(locale).sync
    const affectedBindings = activeBindings.filter((binding) => binding.status === status)
    const retryableBindings = activeBindings.filter((binding) => (
        ['stale', 'failed', 'conflict'].includes(binding.status) && typeof binding.retry === 'function'
    ))
    const domainList = affectedBindings.map((binding) => binding.label).filter(Boolean).join(', ')

    return {
        status,
        eyebrow: copy.eyebrow,
        title: copy.status[status],
        description: formatCopy(copy.description[status], {
            domains: domainList
        }),
        retryAllLabel: retryableBindings.length ? copy.actions.retryAll : null,
        retryDomains: retryableBindings.map((binding) => ({
            key: binding.key,
            label: formatCopy(copy.actions.retryDomain, {
                domain: binding.label
            })
        }))
    }
}

export function renderSyncFeedback(summary) {
    if (!summary) return ''

    return `
        <div class="ct-sync-feedback" data-sync-status="${summary.status}">
            <span class="ct-eyebrow">${summary.eyebrow}</span>
            <div class="ct-sync-feedback__body">
                <strong class="ct-sync-feedback__title">${summary.title}</strong>
                <p class="ct-sync-feedback__description">${summary.description}</p>
            </div>
            <div class="ct-sync-feedback__actions">
                ${summary.retryAllLabel ? `<button class="ct-sync-feedback__action" type="button" data-ct-sync-retry-all>${summary.retryAllLabel}</button>` : ''}
                ${summary.retryDomains.map((action) => `
                    <button class="ct-sync-feedback__action is-secondary" type="button" data-ct-sync-retry-domain="${action.key}">${action.label}</button>
                `).join('')}
            </div>
        </div>
    `
}
