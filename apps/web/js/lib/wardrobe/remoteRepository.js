import { requestBackend } from '../backendClient.js'

export function createWardrobeRemoteRepository({ request = requestBackend } = {}) {
    return {
        fetch() {
            return request('/api/wardrobe')
        },
        create(item) {
            return request('/api/wardrobe', {
                method: 'POST',
                payload: {
                    item
                }
            })
        },
        update(item) {
            return request(`/api/wardrobe/${item.id}`, {
                method: 'PUT',
                payload: {
                    item
                }
            })
        },
        remove(id) {
            return request(`/api/wardrobe/${id}`, {
                method: 'DELETE'
            })
        }
    }
}
