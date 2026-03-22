export async function writeText(text: string): Promise<void> {
    await navigator.clipboard.writeText(text)
}

export async function save(options?: { defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }): Promise<string | null> {
    const filename = options?.defaultPath || 'download.txt'
    return filename
}

export async function writeTextFile(path: string, contents: string): Promise<void> {
    const blob = new Blob([contents], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = path.split('/').pop() || path.split('\\').pop() || 'download.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export async function downloadDir(): Promise<string> {
    return 'Downloads'
}

export async function join(...paths: string[]): Promise<string> {
    return paths.join('/')
}

export async function open(options?: {
    multiple?: boolean
    directory?: boolean
    defaultPath?: string
    filters?: Array<{ name: string; extensions: string[] }>
}): Promise<string | null> {
    if (options?.directory) {
        return options.defaultPath || null
    }

    return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = options?.multiple || false

        if (options?.filters && options.filters.length > 0) {
            const extensions = options.filters.flatMap(f => f.extensions.map(ext => `.${ext}`))
            input.accept = extensions.join(',')
        }

        input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files
            if (!files || files.length === 0) {
                resolve(null)
                return
            }

            if (options?.multiple) {
                resolve(Array.from(files).map(f => f.name).join(','))
            } else {
                resolve(files[0].name)
            }
        }

        input.click()
    })
}
