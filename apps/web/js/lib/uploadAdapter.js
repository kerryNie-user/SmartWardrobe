function resolveFileReader(FileReaderClass) {
    return FileReaderClass || window.FileReader
}

export function createUploadAdapter({ FileReaderClass } = {}) {
    return {
        readImagePreview(file) {
            if (!file || !String(file.type || '').startsWith('image/')) {
                return Promise.resolve({
                    ok: false,
                    kind: 'invalid-file'
                })
            }

            const Reader = resolveFileReader(FileReaderClass)
            if (!Reader) {
                return Promise.resolve({
                    ok: false,
                    kind: 'unsupported'
                })
            }

            return new Promise((resolve) => {
                const reader = new Reader()
                reader.onload = (event) => {
                    resolve({
                        ok: true,
                        kind: 'data-url',
                        src: String(event.target?.result || ''),
                        fileName: file.name || ''
                    })
                }
                reader.onerror = () => {
                    resolve({
                        ok: false,
                        kind: 'read-failed'
                    })
                }
                reader.readAsDataURL(file)
            })
        },
        readImagePreviewSync(file) {
            if (!file || !String(file.type || '').startsWith('image/')) {
                return {
                    ok: false,
                    kind: 'invalid-file'
                }
            }

            const Reader = resolveFileReader(FileReaderClass)
            if (!Reader) {
                return {
                    ok: false,
                    kind: 'unsupported'
                }
            }

            let result = {
                ok: false,
                kind: 'read-failed'
            }
            const reader = new Reader()
            reader.onload = (event) => {
                result = {
                    ok: true,
                    kind: 'data-url',
                    src: String(event.target?.result || ''),
                    fileName: file.name || ''
                }
            }
            reader.onerror = () => {
                result = {
                    ok: false,
                    kind: 'read-failed'
                }
            }
            reader.readAsDataURL(file)
            return result
        }
    }
}

const defaultUploadAdapter = createUploadAdapter()

export function readImagePreview(file) {
    return defaultUploadAdapter.readImagePreview(file)
}

export function readImagePreviewSync(file) {
    return defaultUploadAdapter.readImagePreviewSync(file)
}
