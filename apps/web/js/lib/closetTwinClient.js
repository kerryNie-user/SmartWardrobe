import { requestBackend } from './backendClient.js'

export function getClosetTwinStatus() {
    return requestBackend('/api/closettwin/status')
}

export function startClosetTwinRuntime() {
    return requestBackend('/api/closettwin/start', { method: 'POST' })
}

export function stopClosetTwinRuntime() {
    return requestBackend('/api/closettwin/stop', { method: 'POST' })
}

export function callClosetTwinModel1(functionName, payload = {}) {
    return requestBackend('/api/closettwin/model1/call', {
        method: 'POST',
        payload: {
            function: functionName,
            payload
        }
    })
}

export function callClosetTwinModel2(functionName, payload = {}) {
    return requestBackend('/api/closettwin/model2/call', {
        method: 'POST',
        payload: {
            function: functionName,
            payload
        }
    })
}

export function recommendClosetTwinDaily(payload = {}) {
    return requestBackend('/api/closettwin/recommendations/daily', {
        method: 'POST',
        payload
    })
}
