import {defineStore} from "pinia";
export const useRepoStore = defineStore('repo', {
    persist: {
        key: 'repoStore',
        storage: localStorage
    },
    state: () => ({
        store: [
            {
                title: "ttml-db",
                index_file_paths: [
                    "https://amll.mirror.dimeta.top/api/db/metadata/raw-lyrics-index.jsonl",
                    "https://raw.githubusercontent.com/Steve-xmh/amll-ttml-db/refs/heads/main/metadata/raw-lyrics-index.jsonl"
                ],
                lyric_file_paths: [
                    "https://amll.mirror.dimeta.top/api/db/raw-lyrics/[ttml]",
                    "https://amlldb.bikonoo.com/raw-lyrics/[ttml]",
                    "https://raw.githubusercontent.com/Steve-xmh/amll-ttml-db/refs/heads/main/raw-lyrics/[ttml]"
                ]
            }
        ] as {
            title: string,
            index_file_paths: string[],
            lyric_file_paths: string[]
        }[]
    })
})