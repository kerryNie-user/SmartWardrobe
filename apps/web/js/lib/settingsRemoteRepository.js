import { requestBackend } from './backendClient.js'

export function createSettingsRemoteRepository({ request = requestBackend } = {}) {
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
