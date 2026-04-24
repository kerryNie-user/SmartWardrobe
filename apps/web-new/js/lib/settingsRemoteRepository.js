import { requestLiteBackend } from './liteBackendClient.js'

export function createSettingsRemoteRepository({ request = requestLiteBackend } = {}) {
    return {
        fetch() {
            return request('/api/settings')
        },
        save(payload) {
            return request('/api/settings', {
                method: 'POST',
                payload
            })
        }
    }
}
