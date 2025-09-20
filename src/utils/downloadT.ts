import {invoke} from "@tauri-apps/api/core";
import {useConfigStore} from "../store/configStore.ts";
import {logWarning} from "./consoleT.ts";

interface FetchResponse {
    status_code: number;
    content: string;
}

/**
 * 遍历链接数组，尝试下载内容直到成功，并返回内容字符串
 * @param urls 一个包含链接的字符串数组
 * @returns 成功下载的内容字符串
 * @throws 当所有链接都下载失败时抛出错误
 */
export async function downloadContentFromUrls(urls: { href: string; proxy: boolean }[]): Promise<string> {
    const config_store = useConfigStore()
    for (const url of urls) {
        const response = await ((url.proxy && config_store.proxy.protocol.length && config_store.proxy.ip.length && config_store.proxy.port >= 0) ? invoke<FetchResponse>('fetch_url', { url: url.href, ...config_store.proxy }) : invoke<FetchResponse>('fetch_url', { url: url.href }))

        if (response.status_code !== 200) {
            logWarning(`HTTP error! Status: ${response.status_code}`)
            continue
        }
        return response.content; // 成功时直接返回内容
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
export async function downloadContentFromUrlTemplates(urls: { href: string; proxy: boolean }[], searchValue:string, replaceValue:string): Promise<string> {
    const config_store = useConfigStore()
    for (const url of urls) {
        // console.log(`Attempting to download from: ${url.replace(searchValue, replaceValue)}`);
        const response = await ((url.proxy && config_store.proxy.protocol.length && config_store.proxy.ip.length && config_store.proxy.port >= 0) ? invoke<FetchResponse>('fetch_url', { url: url.href.replace(searchValue, replaceValue), ...config_store.proxy }) : invoke<FetchResponse>('fetch_url', { url: url.href.replace(searchValue, replaceValue) }))

        if (response.status_code !== 200) {
            logWarning(`HTTP error! Status: ${response.status_code}`)
            continue
        }
        return response.content; // 成功时直接返回内容
    }

    // 如果循环结束仍然没有成功，抛出错误
    throw new Error('All download attempts failed.');
}

