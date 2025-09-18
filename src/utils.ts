/**
 * 遍历链接数组，尝试下载内容直到成功，并返回内容字符串
 * @param urls 一个包含链接的字符串数组
 * @returns 成功下载的内容字符串
 * @throws 当所有链接都下载失败时抛出错误
 */
export async function downloadContentFromUrls(urls: string[]): Promise<string> {
    for (const url of urls) {
        try {
            const response = await fetch(url, {method: "GET"});
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.text(); // 成功时直接返回内容
        } catch (error) {
            console.error(`Failed to download from ${url}. Reason: ${error instanceof Error ? error.message : String(error)}`);
            // 继续尝试下一个 URL
        }
    }
    throw new Error('All download attempts failed.');
}

/**
 * 遍历链接数组，尝试下载内容直到成功，并返回内容字符串
 * @param urls 一个包含链接的字符串数组
 * @param searchValue 需要替换的字符串
 * @param replaceValue 替换后的字符串
 * @returns 成功下载的内容字符串
 * @throws 当所有链接都下载失败时抛出错误
 */
export async function downloadContentFromUrlTemplates(urls: string[], searchValue:string, replaceValue:string): Promise<string> {
    for (const url of urls) {
        try {
            // console.log(`Attempting to download from: ${url.replace(searchValue, replaceValue)}`);
            const response = await fetch(url.replace(searchValue, replaceValue), {method: "GET"})

            if (!response.ok) {
                // 如果响应状态码不是 2xx，主动抛出错误
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            // 将响应体转换为文本并返回
            const content = await response.text();
            // console.log(`Successfully downloaded content from ${url}`);
            return content;
        } catch (error) {
            console.error(`Failed to download from ${url}. Reason: ${error instanceof Error ? error.message : String(error)}`);
            // 继续循环，尝试下一个链接
        }
    }

    // 如果循环结束仍然没有成功，抛出错误
    throw new Error('All download attempts failed.');
}

/**
 * 解析XML字符串，并返回<body>中的内容
 * @param xmlString 包含XML内容的字符串
 * @returns <body>的innerHTML内容，如果解析失败或未找到<body>则返回null
 */
export function getBodyContentFromXml(xmlString: string): string | null {
    try {
        // 1. 创建DOMParser实例
        const parser = new DOMParser();

        // 2. 解析XML字符串
        const xmlDoc = parser.parseFromString(xmlString, 'text/html');

        // 检查解析过程中是否出现错误
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            console.error('XML parsing error:', parseError.textContent);
            return null;
        }

        // 3. 查找<body>元素
        const bodyElement = xmlDoc.querySelector('body');

        // 4. 提取内容
        if (bodyElement) {
            // 使用 innerHTML 获取<body>中的所有HTML内容
            return bodyElement.innerText;
        } else {
            console.error('<body> element not found in the XML.');
            return null;
        }
    } catch (error) {
        console.error('An error occurred during XML parsing:', error);
        return null;
    }
}

export function getMetadatasFromTTML(ttml: string) {
    const reg = /<amll:meta key="([^"]+)" value="([^"]+)"/g
    const metadatas:{key:string,val:string}[] = []
    for (const match of ttml.matchAll(reg)) {
        metadatas.push({key:match[1],val:match[2]})
    }
    return metadatas
}

/**
 * 转义 XML 字符串，使其能够在 v-html 中以纯文本形式显示，同时保留 XML 标签。
 * @param {string} xmlString - 待转义的 XML 字符串。
 * @returns {string} - 转义后的字符串。
 */
export const escapeXmlForVHtml = (xmlString: string): string => {
    // noinspection SuspiciousTypeOfGuard
    if (typeof xmlString !== 'string') {
        return '';
    }

    // 使用正则表达式替换特殊字符
    return xmlString.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};