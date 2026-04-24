import { requestLiteBackend } from './liteBackendClient.js'

export function createProfileRemoteRepository({ request = requestLiteBackend } = {}) {
    return {
        fetch() {
            return request('/api/profile')
        },
        save(payload) {
            return request('/api/profile', {
                method: 'POST',
                payload
            })
        }
    }
}
