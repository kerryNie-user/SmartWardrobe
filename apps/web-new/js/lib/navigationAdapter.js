function resolveLocation(locationObject) {
    return locationObject || window.location
}

export function createNavigationAdapter({ locationObject } = {}) {
    return {
        getCurrentHref() {
            return resolveLocation(locationObject).href
        },
        getCurrentPath() {
            return resolveLocation(locationObject).pathname?.split('/').pop() || 'index.html'
        },
        getCurrentPathWithSearch() {
            const currentLocation = resolveLocation(locationObject)
            const pathname = currentLocation.pathname?.split('/').pop() || 'index.html'
            const search = currentLocation.search || ''
            return `${pathname}${search}`
        },
        getQueryParam(name) {
            return new URL(resolveLocation(locationObject).href).searchParams.get(name)
        },
        buildHref(routeName, params = {}) {
            const search = new URLSearchParams()
            Object.entries(params).forEach(([key, value]) => {
                if (value === undefined || value === null || value === '') return
                search.set(key, String(value))
            })
            const query = search.toString()
            return query ? `${routeName}?${query}` : routeName
        },
        navigateToHref(href) {
            document.documentElement?.setAttribute('data-ct-redirect', href)

            try {
                resolveLocation(locationObject).assign(href)
            } catch {
                return href
            }

            return href
        }
    }
}

const defaultNavigationAdapter = createNavigationAdapter()

export function getCurrentHref() {
    return defaultNavigationAdapter.getCurrentHref()
}

export function getCurrentPath() {
    return defaultNavigationAdapter.getCurrentPath()
}

export function getCurrentPathWithSearch() {
    return defaultNavigationAdapter.getCurrentPathWithSearch()
}

export function getQueryParam(name) {
    return defaultNavigationAdapter.getQueryParam(name)
}

export function buildHref(routeName, params = {}) {
    return defaultNavigationAdapter.buildHref(routeName, params)
}

export function navigateToHref(href) {
    return defaultNavigationAdapter.navigateToHref(href)
}
