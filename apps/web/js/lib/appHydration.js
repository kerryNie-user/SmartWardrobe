import { getLocale } from './locale.js'
import { hydrateProfile } from './profileStore.js'
import { hydrateSettings } from './settingsStore.js'

let bootstrapped = false
let focusBound = false

export function hydrateProtectedApp() {
    const locale = getLocale()

    if (!bootstrapped) {
        bootstrapped = true
        void hydrateProfile(locale)
        void hydrateSettings()
    }

    if (!focusBound && typeof window !== 'undefined') {
        focusBound = true
        window.addEventListener('focus', () => {
            void hydrateProfile(getLocale())
            void hydrateSettings()
        })
    }
}
