import {Dexie, Table} from "dexie";
import {TTML} from "../types/ttml.ts";

export class TTMLDatabase extends Dexie {
    ttmls!: Table<TTML>;

    constructor() {
        super('TTMLDatabase');

        // 定义数据库模式和索引
        this.version(1).stores({
            ttmls: '&rawLyricFile',
        });
    }
}

export const db = new TTMLDatabase();