import {invoke} from "./tauriCompat.ts";
import {useConfigStore} from "../store/configStore.ts";
import {logWarning} from "./consoleT.ts";

interface FetchResponse {
    status_code: number;
    content: string;
}

export async function downloadContentFromUrls(urls: { href: string; proxy: boolean }[]): Promise<string> {
    const config_store = useConfigStore()
    for (const url of urls) {
        const response = await ((url.proxy && config_store.proxy.protocol.length && config_store.proxy.ip.length && config_store.proxy.port >= 0) ? invoke<FetchResponse>('fetch_url', { url: url.href, ...config_store.proxy }) : invoke<FetchResponse>('fetch_url', { url: url.href }))

        if (response.status_code !== 200) {
            logWarning(`HTTP error! Status: ${response.status_code}`)
            continue
        }
        return response.content;
    }
    throw new Error('All download attempts failed.');
}

export async function downloadContentFromUrlTemplates(urls: { href: string; proxy: boolean }[], searchValue:string, replaceValue:string): Promise<string> {
    const config_store = useConfigStore()
    for (const url of urls) {
        const response = await ((url.proxy && config_store.proxy.protocol.length && config_store.proxy.ip.length && config_store.proxy.port >= 0) ? invoke<FetchResponse>('fetch_url', { url: url.href.replace(searchValue, replaceValue), ...config_store.proxy }) : invoke<FetchResponse>('fetch_url', { url: url.href.replace(searchValue, replaceValue) }))

        if (response.status_code !== 200) {
            logWarning(`HTTP error! Status: ${response.status_code}`)
            continue
        }
        return response.content;
    }

    throw new Error('All download attempts failed.');
}
