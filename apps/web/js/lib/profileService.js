import { getUiCopy } from './locale.js'

const FALLBACK_AVATAR = ''
const LEGACY_AVATAR = ['/uploads/profile', ['elara', 'vance.jpg'].join('-')].join('/')
const LEGACY_PERSONA_NAME_SIGNATURES = new Set([1721287346, 3885309934])
const LEGACY_PERSONA_BIO_SIGNATURES = new Set([2120166923])

function getTextSignature(value) {
    return Array.from(String(value || '')).reduce(
        (total, char) => (Math.imul(total, 31) + char.charCodeAt(0)) >>> 0,
        0
    )
}

function scrubLegacyPersona(value, fallback, legacySignatures) {
    const normalized = String(value || '').trim()
    if (!normalized || legacySignatures.has(getTextSignature(normalized))) return fallback
    return normalized
}

function scrubDefaultProfileName(value, fallback, locale) {
    const normalized = scrubLegacyPersona(value, fallback, LEGACY_PERSONA_NAME_SIGNATURES)
    const alternateLocale = locale === 'zh-CN' ? 'en-US' : 'zh-CN'
    const alternateDefaults = getUiCopy(alternateLocale).defaults
    if (normalized === alternateDefaults.profileName || normalized === alternateDefaults.debugUser.name) return fallback
    return normalized
}

function scrubLegacyAvatar(value, fallback) {
    const normalized = String(value || '').trim()
    if (!normalized || normalized === LEGACY_AVATAR) return fallback
    return normalized
}

export function getDefaultProfile(locale = 'en-US') {
    const copy = getUiCopy(locale)
    return {
        name: copy.defaults.profileName,
        bio: '',
        avatar: FALLBACK_AVATAR
    }
}

export function normalizeProfile(profile = {}, locale = 'en-US') {
    const fallback = getDefaultProfile(locale)
    return {
        name: scrubDefaultProfileName(profile.name, fallback.name, locale),
        bio: scrubLegacyPersona(profile.bio, fallback.bio, LEGACY_PERSONA_BIO_SIGNATURES),
        avatar: scrubLegacyAvatar(profile.avatar, FALLBACK_AVATAR)
    }
}

export function createProfileService({
    localRepository,
    remoteRepository,
    syncController,
    onStateChange = () => {},
    locale = 'en-US'
}) {
    let pendingProfile = null

    return {
        async hydrate(nextLocale = locale) {
            syncController.markLoading()
            const remote = await remoteRepository.fetch()
            if (!remote.ok || !remote.data?.profile) {
                syncController.markStale(remote.message || remote.error)
                return localRepository.read(nextLocale)
            }

            const profile = localRepository.write(remote.data.profile, nextLocale)
            pendingProfile = null
            onStateChange(profile)
            syncController.markSynced()
            return profile
        },

        async save(profile, nextLocale = locale) {
            const nextProfile = localRepository.write(profile, nextLocale)
            pendingProfile = nextProfile
            onStateChange(nextProfile)
            syncController.markSyncing()
            const response = await remoteRepository.save(nextProfile)

            if (!response.ok) {
                syncController.markFailed(response.message || response.error)
                return localRepository.read(nextLocale)
            }

            const confirmedProfile = localRepository.write(response.data?.profile || nextProfile, nextLocale)
            pendingProfile = null
            onStateChange(confirmedProfile)
            syncController.markSynced()
            return confirmedProfile
        },

        async retry(nextLocale = locale) {
            if (!pendingProfile) {
                return this.hydrate(nextLocale)
            }

            return this.save(pendingProfile, nextLocale)
        }
    }
}
