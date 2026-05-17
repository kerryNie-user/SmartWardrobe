import { requestBackend } from '../backendClient.js'

export function createFavoritesRemoteRepository({ request = requestBackend } = {}) {
    return {
        fetch() {
            return request('/api/favorites')
        },
        add(type, item) {
            return request('/api/favorites', {
                method: 'POST',
                payload: {
                    type,
                    item
                }
            })
        },
        remove(type, id) {
            return request(`/api/favorites/${type}/${id}`, {
                method: 'DELETE'
            })
        }
    }
}
