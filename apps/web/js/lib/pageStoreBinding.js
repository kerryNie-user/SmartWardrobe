import { buildSyncFeedbackSummary, renderSyncFeedback } from '../components/syncFeedback.js'

function runHydrators(hydrators = []) {
    hydrators.forEach((hydrate) => {
        void hydrate?.()
    })
}

export function bindPageStores({ paint, subscriptions = [], hydrators = [], syncFeedback = null }) {
    let destroyed = false
    const syncStates = new Map()

    const renderSyncState = () => {
        if (!syncFeedback?.root) return
        const locale = syncFeedback.locale?.() || 'en-US'
        const bindings = (syncFeedback.bindings || []).map((binding) => ({
            ...binding,
            state: syncStates.get(binding.key) || binding.getState?.() || { status: 'idle' }
        }))
        syncFeedback.root.innerHTML = renderSyncFeedback(buildSyncFeedbackSummary(bindings, locale))
    }

    const paintNow = () => {
        if (destroyed) return
        paint()
        renderSyncState()
    }

    const requestPaint = () => {
        paintNow()
    }

    const unsubscribes = subscriptions
        .map((subscribe) => subscribe?.(requestPaint))
        .filter((unsubscribe) => typeof unsubscribe === 'function')

    const syncUnsubscribes = (syncFeedback?.bindings || [])
        .map((binding) => {
            syncStates.set(binding.key, binding.getState?.() || { status: 'idle' })
            return binding.subscribe?.((state) => {
                syncStates.set(binding.key, state)
                renderSyncState()
            })
        })
        .filter((unsubscribe) => typeof unsubscribe === 'function')

    const handleSyncClick = (event) => {
        if (!syncFeedback?.root) return
        const retryAll = event.target.closest('[data-ct-sync-retry-all]')
        if (retryAll) {
            (syncFeedback.bindings || []).forEach((binding) => {
                if (typeof binding.retry === 'function') {
                    void binding.retry(syncFeedback.locale?.() || 'en-US')
                }
            })
            return
        }

        const retryDomain = event.target.closest('[data-ct-sync-retry-domain]')
        if (!retryDomain) return

        const key = retryDomain.getAttribute('data-ct-sync-retry-domain')
        const binding = (syncFeedback.bindings || []).find((entry) => entry.key === key)
        if (typeof binding?.retry === 'function') {
            void binding.retry(syncFeedback.locale?.() || 'en-US')
        }
    }

    if (syncFeedback?.root) {
        syncFeedback.root.addEventListener('click', handleSyncClick)
    }

    paintNow()
    runHydrators(hydrators)

    return {
        requestPaint,
        paintNow,
        teardown() {
            if (destroyed) return
            destroyed = true
            unsubscribes.forEach((unsubscribe) => unsubscribe())
            syncUnsubscribes.forEach((unsubscribe) => unsubscribe())
            if (syncFeedback?.root) {
                syncFeedback.root.removeEventListener('click', handleSyncClick)
            }
        }
    }
}
