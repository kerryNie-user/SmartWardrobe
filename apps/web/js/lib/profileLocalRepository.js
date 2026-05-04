import { getStoredAuthSession, syncStoredAuthUser } from './authIdentity.js'
import { getCurrentUserScope, readUserScopedValue, writeUserScopedValue } from './userScopedStorage.js'
import { getDefaultProfile, normalizeProfile } from './profileService.js'

const PROFILE_KEY = 'ct_profile'

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
                name: storedProfile?.name || sessionUser?.name || fallback.name,
                bio: storedProfile?.bio || sessionUser?.bio || fallback.bio,
                avatar: storedProfile?.avatar || sessionUser?.avatar || fallback.avatar
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
