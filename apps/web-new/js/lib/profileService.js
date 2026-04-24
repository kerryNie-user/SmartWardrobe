const FALLBACK_AVATAR = './images/profile/elara-vance.jpg'

const DEFAULT_PROFILE = {
    'en-US': {
        name: 'Elara Vance',
        bio: 'Curating a digital archive of architectural silhouettes, neutral tailoring, and quietly radical texture studies.',
        avatar: FALLBACK_AVATAR
    },
    'zh-CN': {
        name: 'Elara Vance',
        bio: '持续整理建筑感轮廓、中性色剪裁与克制材质实验的数字风格档案。',
        avatar: FALLBACK_AVATAR
    }
}

export function getDefaultProfile(locale = 'en-US') {
    return DEFAULT_PROFILE[locale === 'zh-CN' ? 'zh-CN' : 'en-US']
}

export function normalizeProfile(profile = {}, locale = 'en-US') {
    const fallback = getDefaultProfile(locale)
    return {
        name: profile.name?.trim() || fallback.name,
        bio: profile.bio?.trim() || fallback.bio,
        avatar: profile.avatar?.trim() || FALLBACK_AVATAR
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
                syncController.markStale(remote.error)
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
                syncController.markFailed(response.error)
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
