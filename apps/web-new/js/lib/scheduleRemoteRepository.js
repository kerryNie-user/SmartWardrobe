import { requestLiteBackend } from './liteBackendClient.js'

export function createScheduleRemoteRepository({ request = requestLiteBackend } = {}) {
    return {
        fetch() {
            return request('/api/schedules')
        },
        create(payload) {
            return request('/api/schedules', {
                method: 'POST',
                payload
            })
        },
        update(eventId, payload) {
            return request(`/api/schedules/${eventId}`, {
                method: 'PUT',
                payload
            })
        },
        remove(eventId) {
            return request(`/api/schedules/${eventId}`, {
                method: 'DELETE'
            })
        }
    }
}
