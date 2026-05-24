import { getStoredAuthSession, syncStoredAuthUser } from './authIdentity.js'
import { getUiCopy } from './locale.js'
import { getCurrentUserScope, readUserScopedValue, writeUserScopedValue } from './userScopedStorage.js'
import { getDefaultProfile, normalizeProfile } from './profileService.js'

const PROFILE_KEY = 'ct_profile'
const LEGACY_PERSONA_NAME_SIGNATURES = new Set([1721287346, 3885309934])
const LEGACY_PERSONA_BIO_SIGNATURES = new Set([2120166923])
const LEGACY_AVATAR = ['/uploads/profile', ['elara', 'vance.jpg'].join('-')].join('/')

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

export function createProfileLocalRepository({ locale = 'en-US', scope = null } = {}) {
    function resolveScope(nextScope) {
        return nextScope || scope || getCurrentUserScope()
    }

    return {
        read(nextLocale = locale, nextScope) {
            const resolvedLocale = nextLocale === 'zh-CN' ? 'zh-CN' : 'en-US'
            const resolvedScope = resolveScope(nextScope)
            const storedProfile = readUserScopedValue(PROFILE_KEY, () => null, resolvedScope)
            const sessionUser = getStoredAuthSession(resolvedScope.storage)?.user
            const fallback = getDefaultProfile(resolvedLocale)

            return {
                name: scrubDefaultProfileName(storedProfile?.name || sessionUser?.name, fallback.name, resolvedLocale),
                bio: scrubLegacyPersona(storedProfile?.bio || sessionUser?.bio, fallback.bio, LEGACY_PERSONA_BIO_SIGNATURES),
                avatar: scrubLegacyAvatar(storedProfile?.avatar || sessionUser?.avatar, fallback.avatar)
            }
        },
        write(profile, nextLocale = locale, nextScope) {
            const resolvedScope = resolveScope(nextScope)
            const nextProfile = normalizeProfile(profile, nextLocale)
            writeUserScopedValue(PROFILE_KEY, nextProfile, resolvedScope)
            syncStoredAuthUser({
                name: nextProfile.name,
                bio: nextProfile.bio,
                avatar: nextProfile.avatar
            }, resolvedScope.storage)
            return nextProfile
        },
        clear(nextScope) {
            const resolvedScope = resolveScope(nextScope)
            return writeUserScopedValue(PROFILE_KEY, null, resolvedScope)
        }
    }
}
