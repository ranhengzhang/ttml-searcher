export default async function handler(req: any, res: any) {
    const { url } = req.query

    if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'Missing url parameter' })
        return
    }

    try {
        const decodedUrl = decodeURIComponent(url)
        const response = await fetch(decodedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        })

        const content = await response.text()

        res.status(200).json({
            status_code: response.status,
            content: content,
        })
    } catch (error: any) {
        res.status(500).json({
            status_code: 0,
            content: `Request error: ${error.message}`,
        })
    }
}
