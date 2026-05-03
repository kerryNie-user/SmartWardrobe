import { requestBackend } from './backendClient.js'

export function createProfileRemoteRepository({ request = requestBackend } = {}) {
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
