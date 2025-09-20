import {logDanger} from "./consoleT.ts";

/**
 * 解析XML字符串，返回<body>中的内容，并附加<head>中的translations或transliterations
 * 在合法XML的<p>标签或带有ttm:role属性的<span>标签前添加换行
 * @param xmlString 包含XML内容的字符串
 * @returns 包含<body>内容和<head>中translations/transliterations的字符串，如果解析失败则返回null
 */
export function getLyricContentFromXml(xmlString: string): string | null {
    try {
        // 创建DOMParser实例
        const parser = new DOMParser();

        // 解析XML字符串
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

        // 检查解析过程中是否出现错误
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            logDanger('XML parsing error:', parseError.textContent);
            return null;
        }

        // 初始化结果数组
        const result: string[] = [];

        // 获取<head>中的translations和transliterations
        const headElement = xmlDoc.querySelector('head');
        if (headElement) {
            const translations = headElement.querySelector('translations');
            const transliterations = headElement.querySelector('transliterations');

            if (translations) {
                result.push(translations.innerHTML);
            }
            if (transliterations) {
                result.push(transliterations.innerHTML);
            }
        }

        // 获取<body>元素
        const bodyElement = xmlDoc.querySelector('body');
        if (!bodyElement) {
            logDanger('<body> element not found in the XML.');
            return null;
        }

        // 处理<body>内容，添加换行
        const processNode = (node: Node): string => {
            let content = '';

            if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                const tagName = element.tagName.toLowerCase();

                // 为<p>或带有ttm:role的<span>添加换行
                if (tagName === 'p' || (tagName === 'span' && element.hasAttribute('ttm:role'))) {
                    content += '\n\n';
                }

                // 递归处理子节点
                for (const child of element.childNodes) {
                    content += processNode(child);
                }
            } else if (node.nodeType === Node.TEXT_NODE) {
                content += node.textContent || '';
            }

            return content;
        };

        // 处理body中的所有子节点
        for (const child of bodyElement.childNodes) {
            result.push(processNode(child));
        }

        // 合并所有内容并清理多余的空白
        const finalContent = result.join('').trim();

        return finalContent.length > 0 ? finalContent : null;
    } catch (error) {
        logDanger('An error occurred during XML parsing:', error);
        return null;
    }
}

export function getMetadatasFromTTML(ttml: string) {
    const reg = /<amll:meta key="([^"]+)" value="([^"]+)"/g
    const metadatas: { key: string, val: string }[] = []
    for (const match of ttml.matchAll(reg)) {
        metadatas.push({key: match[1], val: match[2]})
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