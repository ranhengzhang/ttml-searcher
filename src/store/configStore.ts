import {defineStore} from "pinia";

export const useConfigStore = defineStore('config', {
    persist: {
        key: 'configStore',
        storage: localStorage
    },
    state: () => ({
        download: {
            default_path: "",
        },
        proxy: {
            protocol: "",
            ip:
                "",
            port:
                -1
        }
    })
})