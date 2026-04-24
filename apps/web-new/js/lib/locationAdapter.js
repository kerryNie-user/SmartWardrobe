function resolveGeolocation(geolocation) {
    if (geolocation) return geolocation
    if (typeof window === 'undefined') return null
    return window.navigator?.geolocation || null
}

function resolveSecureContext(secureContext) {
    if (typeof secureContext === 'boolean') return secureContext
    if (typeof window === 'undefined') return false
    if (typeof window.isSecureContext === 'boolean') return window.isSecureContext

    const hostname = String(window.location?.hostname || '')
    return hostname === 'localhost' || hostname === '127.0.0.1'
}

function mapLocationError(error) {
    if (error?.code === 1) return 'denied'
    if (error?.code === 3) return 'timeout'
    return 'unavailable'
}

function resolveFetch(fetchImpl) {
    if (typeof fetchImpl === 'function') return fetchImpl
    if (typeof window === 'undefined') return null
    return typeof window.fetch === 'function' ? window.fetch.bind(window) : null
}

function extractCityLabel(data) {
    if (!data || typeof data !== 'object') return ''
    return (
        data.city
        || data.locality
        || data.localityName
        || data.principalSubdivision
        || data.countryName
        || ''
    )
}

function extractDistrictLabel(data) {
    if (!data || typeof data !== 'object') return ''
    return (
        data.district
        || data.locality
        || data.localityName
        || data.cityDistrict
        || ''
    )
}

function formatRangeLabel({ cityLabel = '', districtLabel = '', precision = 'approximate' }, locale = 'en-US') {
    const city = normalizeLocaleLabel(cityLabel, locale)
    const district = normalizeLocaleLabel(districtLabel, locale)

    if (precision === 'precise') {
        if (locale === 'zh-CN') {
            if (district) return district.endsWith('附近') ? district : `${district}附近`
            if (city) return city.endsWith('附近') ? city : `${city}附近`
        }

        if (district) return district.endsWith(' area') ? district : `${district} area`
        if (city) return city.endsWith(' area') ? city : `${city} area`
    }

    return city || district
}

function normalizeLocaleLabel(value, locale = 'en-US') {
    const text = String(value || '').trim()
    if (!text || locale !== 'zh-CN') return text

    const replacements = [
        ['區', '区'],
        ['陽', '阳'],
        ['臺', '台'],
        ['門', '门'],
        ['東', '东'],
        ['西', '西'],
        ['南', '南'],
        ['北', '北'],
        ['灣', '湾'],
        ['龍', '龙'],
        ['廣', '广'],
        ['濱', '滨'],
        ['陰', '阴']
    ]

    return replacements.reduce((current, [from, to]) => current.split(from).join(to), text)
}

function extractWeatherLocationLabel(weather) {
    return String(weather?.location?.label || '').trim()
}

async function defaultReverseGeocode({ latitude, longitude, locale = 'en-US', fetchImpl }) {
    const request = resolveFetch(fetchImpl)
    if (!request) {
        return { ok: false, kind: 'reverse-geocode-unavailable' }
    }

    const language = locale === 'zh-CN' ? 'zh' : 'en'
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&localityLanguage=${language}`

    try {
        const response = await request(url)
        if (!response?.ok) {
            return { ok: false, kind: 'reverse-geocode-failed' }
        }
        const data = await response.json().catch(() => null)
        const cityLabel = extractCityLabel(data)
        if (!cityLabel) {
            return { ok: false, kind: 'reverse-geocode-empty' }
        }
        const districtLabel = extractDistrictLabel(data)
        return {
            ok: true,
            cityLabel,
            districtLabel
        }
    } catch {
        return { ok: false, kind: 'reverse-geocode-network' }
    }
}

async function defaultIpLocate({ fetchImpl }) {
    const request = resolveFetch(fetchImpl)
    if (!request) {
        return { ok: false, kind: 'ip-geolocation-unavailable' }
    }

    try {
        const response = await request('https://ipwho.is/')
        if (!response?.ok) {
            return { ok: false, kind: 'ip-geolocation-failed' }
        }
        const data = await response.json().catch(() => null)
        const cityLabel = extractCityLabel(data)
        if (!cityLabel) {
            return { ok: false, kind: 'ip-geolocation-empty' }
        }
        return {
            ok: true,
            cityLabel,
            coords: {
                latitude: data?.latitude,
                longitude: data?.longitude
            }
        }
    } catch {
        return { ok: false, kind: 'ip-geolocation-network' }
    }
}

function resolveCapabilityKind(geolocation, secureContext) {
    if (!geolocation?.getCurrentPosition) return 'unsupported'
    if (!secureContext) return 'insecure-context'
    return 'geolocation'
}

function extractWeatherCondition(summary, locale = 'en-US') {
    const value = String(summary || '').trim()
    if (!value) {
        return locale === 'zh-CN' ? '多云' : 'Cloudy'
    }

    const separator = value.includes('，') ? '，' : ','
    const parts = value.split(separator)
    if (parts.length > 1 && parts[1].trim()) {
        return parts.slice(1).join(separator).trim()
    }

    return locale === 'zh-CN' ? '多云' : 'Cloudy'
}

export function createLocationAdapter({
    geolocation,
    secureContext,
    reverseGeocode = defaultReverseGeocode,
    ipLocate = defaultIpLocate,
    fetchImpl
} = {}) {
    return {
        getLocationCapability() {
            const resolvedGeolocation = resolveGeolocation(geolocation)
            const resolvedSecureContext = resolveSecureContext(secureContext)
            const kind = resolveCapabilityKind(resolvedGeolocation, resolvedSecureContext)
            return {
                supported: kind === 'geolocation',
                kind
            }
        },
        async getCurrentLocation(locale = 'en-US') {
            const resolvedGeolocation = resolveGeolocation(geolocation)
            const resolvedSecureContext = resolveSecureContext(secureContext)
            const capabilityKind = resolveCapabilityKind(resolvedGeolocation, resolvedSecureContext)

            if (capabilityKind !== 'geolocation') {
                const fallbackLocation = await ipLocate({
                    locale,
                    fetchImpl
                }).catch(() => ({ ok: false, kind: 'ip-geolocation-failed' }))

                if (fallbackLocation?.ok) {
                    return {
                        ok: true,
                        kind: 'ip-geolocation',
                        permission: 'unavailable',
                        coords: fallbackLocation.coords || null,
                        place: {
                            cityLabel: fallbackLocation.cityLabel,
                            rangeLabel: fallbackLocation.rangeLabel || fallbackLocation.cityLabel,
                            precision: 'approximate'
                        }
                    }
                }

                return {
                    ok: false,
                    kind: capabilityKind,
                    permission: capabilityKind === 'insecure-context' ? 'unavailable' : 'unsupported'
                }
            }

            return new Promise((resolve) => {
                resolvedGeolocation.getCurrentPosition(
                    async (position) => {
                        const coords = {
                            latitude: position.coords?.latitude,
                            longitude: position.coords?.longitude,
                            accuracy: position.coords?.accuracy
                        }
                        const place = await reverseGeocode({
                            latitude: coords.latitude,
                            longitude: coords.longitude,
                            locale,
                            fetchImpl
                        }).catch(() => ({ ok: false, kind: 'reverse-geocode-failed' }))

                        resolve({
                            ok: true,
                            kind: 'geolocation',
                            permission: 'granted',
                            coords,
                            place: place?.ok ? {
                                cityLabel: place.cityLabel,
                                rangeLabel: formatRangeLabel({
                                    cityLabel: place.cityLabel,
                                    districtLabel: place.districtLabel,
                                    precision: 'precise'
                                }, locale),
                                precision: 'precise'
                            } : null
                        })
                    },
                    (error) => {
                        resolve({
                            ok: false,
                            kind: mapLocationError(error),
                            permission: error?.code === 1 ? 'denied' : 'unavailable',
                            error: error?.message || ''
                        })
                    }
                )
            })
        }
    }
}

export function formatCurrentAreaLabel(locale = 'en-US') {
    return locale === 'zh-CN' ? '当前位置，多云' : 'Current Area, Cloudy'
}

export function applyLocationToWeather(weather, locationResult, locale = 'en-US') {
    const condition = weather?.condition || extractWeatherCondition(weather?.summary, locale)
    const fallbackLocationLabel = extractWeatherLocationLabel(weather)

    if (!locationResult?.ok) {
        return {
            ...weather,
            condition,
            location: {
                label: fallbackLocationLabel,
                precision: weather?.location?.precision || 'fallback'
            },
            summary: fallbackLocationLabel
                ? `${fallbackLocationLabel}${locale === 'zh-CN' ? '，' : ', '}${condition}`
                : formatCurrentAreaLabel(locale)
        }
    }

    const locationLabel = String(locationResult.place?.rangeLabel || locationResult.place?.cityLabel || fallbackLocationLabel).trim()
    const separator = locale === 'zh-CN' ? '，' : ', '

    return {
        ...weather,
        condition,
        location: {
            label: locationLabel || fallbackLocationLabel,
            precision: locationResult.place?.precision || weather?.location?.precision || 'fallback'
        },
        summary: locationLabel ? `${locationLabel}${separator}${condition}` : formatCurrentAreaLabel(locale)
    }
}

const defaultLocationAdapter = createLocationAdapter()

export function getLocationCapability() {
    return defaultLocationAdapter.getLocationCapability()
}

export function getCurrentLocation(locale) {
    return defaultLocationAdapter.getCurrentLocation(locale)
}
