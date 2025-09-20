import {defineStore} from "pinia";

export const useRepoStore = defineStore('repo', {
    persist: {
        key: 'repoStore',
        storage: localStorage
    },
    state: () => ({
        stores: [
            {
                title: "ttml-db",
                index_file_paths: [
                    {
                        href: "https://raw.githubusercontent.com/Steve-xmh/amll-ttml-db/refs/heads/main/metadata/raw-lyrics-index.jsonl",
                        proxy: true
                    }, {
                        href: "https://amll.mirror.dimeta.top/api/db/metadata/raw-lyrics-index.jsonl",
                        proxy: false
                    }
                ],
                lyric_file_paths: [
                    {
                        href: "https://raw.githubusercontent.com/Steve-xmh/amll-ttml-db/refs/heads/main/raw-lyrics/[ttml]",
                        proxy: true
                    }, {
                        href: "https://amll.mirror.dimeta.top/api/db/raw-lyrics/[ttml]",
                        proxy: false},
                    {
                        href: "https://amlldb.bikonoo.com/raw-lyrics/[ttml]",
                        proxy: false}
                ]
            }
        ] as {
            title: string,
            index_file_paths: {
                href: string,
                proxy: boolean
            }[],
            lyric_file_paths: {
                href: string,
                proxy: boolean
            }[]
        }[]
    })
})