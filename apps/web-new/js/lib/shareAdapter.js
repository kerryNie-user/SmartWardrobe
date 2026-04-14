function resolveClipboard(clipboard) {
    return clipboard || window.navigator?.clipboard
}

export function createShareAdapter({ clipboard, baseHref } = {}) {
    return {
        buildCanonicalHref(routeName, params = {}) {
            const routeUrl = new URL(routeName, baseHref || window.location.href)
            Object.entries(params).forEach(([key, value]) => {
                if (value === undefined || value === null || value === '') return
                routeUrl.searchParams.set(key, String(value))
            })
            return routeUrl.href
        },
        async shareLink({ href, title = '', text = '' }) {
            const resolvedClipboard = resolveClipboard(clipboard)
            if (!resolvedClipboard?.writeText) {
                return {
                    ok: false,
                    kind: 'unsupported',
                    href,
                    title,
                    text
                }
            }

            await resolvedClipboard.writeText(href)
            return {
                ok: true,
                kind: 'clipboard',
                href,
                title,
                text
            }
        }
    }
}

const defaultShareAdapter = createShareAdapter()

export function buildCanonicalHref(routeName, params = {}) {
    return defaultShareAdapter.buildCanonicalHref(routeName, params)
}

export function shareLink(payload) {
    return defaultShareAdapter.shareLink(payload)
}
