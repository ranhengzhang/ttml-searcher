import {useConfigStore} from "../store/configStore.ts";
import {logWarning} from "./consoleT.ts";

interface FetchResponse {
    status_code: number;
    content: string;
}

function getProxiedUrl(url: string): string {
    return `/api/proxy?url=${encodeURIComponent(url)}`
}

async function fetchUrl(url: string): Promise<FetchResponse> {
    try {
        const proxiedUrl = getProxiedUrl(url)
        const response = await fetch(proxiedUrl)
        const data = await response.json()
        return data as FetchResponse
    } catch (e) {
        return {
            status_code: 0,
            content: `Request error: ${e}`
        }
    }
}

export async function downloadContentFromUrls(urls: { href: string; proxy: boolean }[]): Promise<string> {
    const config_store = useConfigStore()
    for (const url of urls) {
        if (url.proxy && config_store.proxy.protocol.length && config_store.proxy.ip.length && config_store.proxy.port >= 0) {
            console.warn('Proxy is not supported in web environment, direct connection will be used')
        }

        const response = await fetchUrl(url.href)

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
        if (url.proxy && config_store.proxy.protocol.length && config_store.proxy.ip.length && config_store.proxy.port >= 0) {
            console.warn('Proxy is not supported in web environment, direct connection will be used')
        }

        const response = await fetchUrl(url.href.replace(searchValue, replaceValue))

        if (response.status_code !== 200) {
            logWarning(`HTTP error! Status: ${response.status_code}`)
            continue
        }
        return response.content;
    }

    throw new Error('All download attempts failed.');
}
