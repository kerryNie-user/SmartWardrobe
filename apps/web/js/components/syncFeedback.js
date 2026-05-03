const SYNC_STATUS_PRIORITY = {
    conflict: 6,
    failed: 5,
    stale: 4,
    syncing: 3,
    loading: 2,
    synced: 1,
    idle: 0
}

const SYNC_COPY = {
    'zh-CN': {
        eyebrow: 'Lite Backend',
        status: {
            loading: '正在加载远端数据',
            syncing: '正在同步本地改动',
            synced: '已与远端同步',
            stale: '远端不可用，当前显示本地缓存',
            failed: '写回失败，需要重试',
            conflict: '远端版本冲突，已回退确认态'
        },
        description: {
            loading: '同步范围：{domains}',
            syncing: '正在写回：{domains}',
            synced: '最近同步：{domains}',
            stale: '可继续浏览本地数据，并重试：{domains}',
            failed: '请重试以下领域：{domains}',
            conflict: '请刷新或重试以下领域：{domains}'
        },
        actions: {
            retryAll: '重试全部',
            retryDomain: '重试 {domain}'
        }
    },
    'en-US': {
        eyebrow: 'Lite Backend',
        status: {
            loading: 'Loading remote data',
            syncing: 'Syncing local changes',
            synced: 'Synced with remote',
            stale: 'Remote unavailable, showing local cache',
            failed: 'Writeback failed and needs retry',
            conflict: 'Remote conflict detected and reverted'
        },
        description: {
            loading: 'Domains: {domains}',
            syncing: 'Writing back: {domains}',
            synced: 'Recently synced: {domains}',
            stale: 'Using local cache and can retry: {domains}',
            failed: 'Retry these domains: {domains}',
            conflict: 'Refresh or retry these domains: {domains}'
        },
        actions: {
            retryAll: 'Retry All',
            retryDomain: 'Retry {domain}'
        }
    }
}

function resolveLocale(locale) {
    return locale === 'zh-CN' ? 'zh-CN' : 'en-US'
}

function resolveLabel(label, locale) {
    if (!label) return ''
    if (typeof label === 'string') return label
    return label[resolveLocale(locale)] || label['en-US'] || ''
}

function fillTemplate(template, values) {
    return Object.entries(values).reduce((result, [key, value]) => result.replace(`{${key}}`, value), template)
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
            label: resolveLabel(binding.label, locale),
            status: binding.state?.status || 'idle'
        }))
        .filter((binding) => !['idle', 'synced'].includes(binding.status))

    if (!activeBindings.length) {
        return null
    }

    const status = activeBindings.reduce((highest, binding) => (
        SYNC_STATUS_PRIORITY[binding.status] > SYNC_STATUS_PRIORITY[highest] ? binding.status : highest
    ), activeBindings[0].status)

    const localeKey = resolveLocale(locale)
    const copy = SYNC_COPY[localeKey]
    const affectedBindings = activeBindings.filter((binding) => binding.status === status)
    const retryableBindings = activeBindings.filter((binding) => (
        ['stale', 'failed', 'conflict'].includes(binding.status) && typeof binding.retry === 'function'
    ))
    const domainList = affectedBindings.map((binding) => binding.label).filter(Boolean).join(', ')

    return {
        status,
        eyebrow: copy.eyebrow,
        title: copy.status[status],
        description: fillTemplate(copy.description[status], {
            domains: domainList
        }),
        retryAllLabel: retryableBindings.length ? copy.actions.retryAll : null,
        retryDomains: retryableBindings.map((binding) => ({
            key: binding.key,
            label: fillTemplate(copy.actions.retryDomain, {
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
