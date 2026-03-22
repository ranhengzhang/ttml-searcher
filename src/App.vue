<script lang="ts" setup>
import {h, onMounted, onUnmounted, ref, Ref, watch} from "vue";
import {TTML} from "./types/ttml.ts";
import {liveQuery, Subscription} from "dexie";
import {db} from "./database";
import {useRepoStore} from "./store/repoStore.ts";
import {FolderOpened, Plus, Refresh, Setting} from "@element-plus/icons-vue";
import {ElMessage, ElNotification, ElProgress} from "element-plus";
import {downloadContentFromUrls, downloadContentFromUrlTemplates} from "./utils/downloadT.ts";
import LyricCard from "./components/LyricCard.vue";
import RepoCard from "./components/RepoCard.vue";
import {getLyricContentFromXml} from "./utils/ttmlT.ts";
import {useConfigStore} from "./store/configStore.ts";
import {open, downloadDir} from "./utils/webCompat.ts";
import {logDanger, logWarning} from "./utils/consoleT.ts";

const repo_store = useRepoStore()
const config_store = useConfigStore()

const ttmls: Ref<TTML[]> = ref([])
let ttmls_subscription: Subscription | null = null

const recent_index = ref(1)

const search_config = ref({
  pro_mod: false,
  keyword: "",
  metas: {
    musicName: [] as string[],
    artists: [] as string[],
    album: [] as string[],
    ncmMusicId: [] as string[],
    qqMusicId: [] as string[],
    spotifyId: [] as string[],
    appleMusicId: [] as string[],
    isrc: [] as string[],
    ttmlAuthorGithub: [] as string[],
    ttmlAuthorGithubLogin: [] as string[],
  }
})

const filted_ttmls: Ref<TTML[]> = ref([])
const list_ttmls: Ref<TTML[]> = ref([])
let search_timer: number | null = null

watch(() => [search_config, ttmls], () => {
  filted_ttmls.value = []
  if (search_timer)
    clearTimeout(search_timer)
  search_timer = setTimeout(() => {
    if (search_config.value.pro_mod) {
      filted_ttmls.value = ttmls.value
          .filter(ttml =>
              Object.entries(search_config.value.metas)
                  .every(meta => meta[1].length === 0 ? true : meta[1].every(meta_value => (JSON.parse(JSON.stringify(ttml))?.[meta[0]] ?? []).indexOf(meta_value) !== -1))
          )
    } else {
      const keywords = search_config.value.keyword.split(/\s/)
      filted_ttmls.value = ttmls.value
          .filter(ttml =>
              // 这里保持不变，筛选包含所有关键词的项目
              keywords.every(keyword => JSON.stringify(ttml).indexOf(keyword) !== -1)
          )
          .map(ttml => {
            // 浅拷贝对象
            let new_ttml = Object.assign({}, ttml)

            keywords.forEach(keyword => {
              if (keyword) {
                // --- 修改重点 ---
                // 1. 读取 new_ttml (当前状态) 而不是 ttml (原始状态)
                // 2. 建议使用 split+join 或 replaceAll 来替换所有出现的关键词，而不仅仅是第一个

                // 处理 ttml 字段
                new_ttml.ttml = new_ttml.ttml.split(keyword).join(`**${keyword}**`)

                // 处理 text 字段
                new_ttml.text = new_ttml.text.split(keyword).join(`**${keyword}**`)

                // 如果你的环境支持 ES2021，也可以写成:
                // new_ttml.text = new_ttml.text.replaceAll(keyword, `**${keyword}**`)
              }
            })
            return new_ttml
          })
    }
  }, 500)
}, {
  deep: true,
  immediate: true
})


watch(() => [recent_index, filted_ttmls], () => {
  list_ttmls.value = filted_ttmls.value.slice((recent_index.value - 1) * 20, recent_index.value * 20)
}, {deep: true, immediate: true})

const setting_config = ref({
  show_setting: false,
  open: () => {
    setting_config.value.show_setting = true
  }
})

const refresh = async () => {
  ElMessage.info("开始更新歌词文件")

  for (const repo of repo_store.stores) {
    const notification = ElNotification({
      title: `正在下载 ${repo.title} 的索引文件`,
      message: '请稍等',
      duration: 0,
      showClose: false
    })
    await downloadContentFromUrls(repo.index_file_paths)
        .then(async (content: string) => {
          notification.close()

          const allLines = content.trim().split(/\r?\n/);
          const lines: string[] = [];

          for (const line of allLines) {
            const ttml = JSON.parse(line);
            const rawLyricFile = ttml["rawLyricFile"];

            // 检查 IndexedDB 中是否存在
            const existing = await db.ttmls.get(rawLyricFile);
            if (!existing) {
              lines.push(line);
            }
          }

          // 我们将使用一个 ref 来跟踪已完成的下载任务数量

          console.log(lines.length)

          const recent = ref(0);
          const failed: string[] = [];

          const notification1 = ElNotification({
            title: '正在下载歌词文件',
            message: () =>
                h(ElProgress, {
                  percentage: (recent.value / lines.length) * 100,
                  striped: true,
                  format: () => `${recent.value} / ${lines.length}`,
                  stripedFlow: true
                }),
            duration: 0,
            showClose: false
          })

          // 创建一个 Promise 数组，每个 Promise 对应一个下载和数据库操作
          const downloadPromises = lines.map(async (line) => {

            const ttml = JSON.parse(line);

            // 为 metadata 属性的键值对创建新属性
            for (const meta of ttml["metadata"]) {
              // console.log(JSON.stringify(meta))
              ttml[meta[0]] = meta[1];
            }

            return downloadContentFromUrlTemplates(repo.lyric_file_paths, "[ttml]", ttml["rawLyricFile"])
                .then((file: string) => {
                  ttml["ttml"] = file;
                  ttml["text"] = getLyricContentFromXml(file);
                  if (ttml["text"] === null)
                    logWarning("歌词文件解析失败", ttml)
                  db.ttmls.put(ttml);
                  recent.value++
                })
                .catch(() => {
                  downloadContentFromUrlTemplates(repo.lyric_file_paths, "[ttml]", ttml["rawLyricFile"])
                      .then((file: string) => {
                        ttml["ttml"] = file;
                        ttml["text"] = getLyricContentFromXml(file);
                        if (ttml["text"] === null)
                          logWarning("歌词文件解析失败", ttml)
                        db.ttmls.put(ttml);
                      })
                      .catch((e) => {
                        failed.push(ttml["rawLyricFile"])
                        logDanger(e)
                      })
                      .finally(() => {
                        recent.value++
                      })
                })
          })

          // 使用 Promise.all 等待所有 Promise 完成，无论成功或失败
          await Promise.allSettled(downloadPromises).then(() => {
            ElMessage.success(`${repo.title} 更新完成`)

            // 在所有任务完成后，检查是否有失败的文件
            if (failed.length) {
              ElMessage.error(`${failed.length} 个文件下载失败`);
              logDanger(failed)
            }

            notification1.close();
            ElMessage.info("下载结束")
          })
        })
        .catch((reason: any) => ElMessage.error(reason.message))
  }
  ElMessage.info("所有库更新结束")
}

const reanalize = async () => {
  const recent = ref(0)
  const notification = ElNotification({
    title: '重新解析歌词文件',
    message: () =>
        h(ElProgress, {
          percentage: (recent.value / ttmls.value.length) * 100,
          striped: true,
          format: () => `${recent.value} / ${ttmls.value.length}`,
          stripedFlow: true
        }),
    duration: 0,
    showClose: false
  })
  ttmls_subscription?.unsubscribe()
  for (const ttml of ttmls.value) {
    const new_ttml = JSON.parse(JSON.stringify(ttml))
    new_ttml.text = getLyricContentFromXml(new_ttml.ttml)
    if (new_ttml.text === null)
      logWarning("歌词文件解析失败", ttml)
    await db.ttmls.put(new_ttml)
    recent.value++
  }
  notification.close()
  ElMessage.info("重新解析结束")
  ttmls_subscription = liveQuery(() => db.ttmls.toArray())
      .subscribe({
        next: (result) => {
          ttmls.value = result.sort((a, b) => a.rawLyricFile < b.rawLyricFile ? 1 : -1)
        }
      })
}

const select_download_path = async () => {
  const path = await open({
    defaultPath: await downloadDir(),
    directory: true
  })
  if (path) {
    config_store.download.default_path = path
  }
}

onMounted(() => {
  ttmls_subscription = liveQuery(() => db.ttmls.toArray())
      .subscribe({
        next: (result) => {
          ttmls.value = result.sort((a, b) => a.rawLyricFile < b.rawLyricFile ? 1 : -1)
        }
      })
})

onUnmounted(() => {
  ttmls_subscription?.unsubscribe()
})

const redownload = async (fileName:string) => {
  ElMessage.info(`开始下载 ${fileName}`)
  await downloadContentFromUrlTemplates(repo_store.stores.map(_store=>_store.lyric_file_paths).flat(), "[ttml]", fileName)
      .then((file: string) => {
        const content = getLyricContentFromXml(file)
        if (content === null) {
          logWarning("歌词文件解析失败", fileName)
          return
        }
        db.ttmls.update(fileName, {ttml: file, text: content})
        ElMessage.success(`${fileName} 下载成功`)
      })
}
</script>

<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <el-row class="controllers">
        <span class="left">
          <el-switch v-model="search_config.pro_mod" active-text="精准" inactive-text="模糊"
                     inline-prompt size="default"
                     style="--el-switch-on-color: var(--el-color-success); --el-switch-off-color: var(--el-color-primary);"/>
        </span>
        <span class="right mobile-actions">
          <el-button :icon="Refresh" plain type="primary" @click="refresh" class="mobile-btn">
            <span class="btn-text">刷新</span>
          </el-button>
          <el-button :icon="Refresh" plain type="success" @click="reanalize" class="mobile-btn">
            <span class="btn-text">解析</span>
          </el-button>
          <el-button :icon="Setting" circle type="primary" @click="setting_config.open" class="mobile-btn"/>
        </span>
      </el-row>
    </el-header>
    <el-main class="app-main">
      <el-row class="search-row">
        <template v-if="search_config.pro_mod">
          <el-form inline label-width="auto" class="mobile-form">
            <el-form-item v-for="meta_key in Object.keys(search_config.metas)" :key="meta_key" :label="meta_key" class="mobile-form-item">
              <el-input-tag v-model="(search_config as any).metas[meta_key]" clearable tag-effect="dark" tag-type="primary" class="mobile-input-tag"/>
            </el-form-item>
          </el-form>
        </template>
        <template v-else>
          <el-input v-model="search_config.keyword" clearable placeholder="请输入内容" class="mobile-search-input"/>
        </template>
      </el-row>
      <el-empty v-if="list_ttmls.length == 0"/>
      <div class="lyric-list">
        <lyric-card v-for="ttml in list_ttmls" :key="ttml.rawLyricFile" :ttml="ttml" @redownlaod="redownload"/>
      </div>
    </el-main>
    <el-footer class="app-footer">
      <el-pagination v-model:current-page="recent_index" :page-count="Math.ceil(filted_ttmls.length/20)" background
                     hide-on-single-page
                     layout="prev, pager, next" size="small" class="mobile-pagination"/>
    </el-footer>
  </el-container>
  <el-drawer v-model="setting_config.show_setting" :show-close="false" :size="isMobile ? '90%' : '700'" class="settings-drawer">
    <template #header>
      <el-text size="large" tag="b">设置</el-text>
      <el-button :icon="Refresh" type="primary" @click="()=>{repo_store.$reset(); config_store.$reset()}">重置
      </el-button>
    </template>
    <el-row class="settings-row mobile-settings-row">
      <el-input v-model="config_store.download.default_path" clearable placeholder="默认保存目录" class="mobile-settings-input"/>
      <el-button :icon="FolderOpened" type="primary" @click="select_download_path"/>
    </el-row>
    <el-row class="settings-row proxy-row">
      <el-select v-model="config_store.proxy.protocol" placeholder="协议" class="mobile-select">
        <el-option label="socks5" :value="'socks5'"/>
        <el-option label="socks4" :value="'socks4'"/>
        <el-option label="https" :value="'https'"/>
        <el-option label="http" :value="'http'"/>
      </el-select>
      <el-input v-model="config_store.proxy.ip" class="mobile-proxy-input"/>
      <el-input-number v-model="config_store.proxy.port" class="mobile-port-input"/>
    </el-row>
    <repo-card v-for="(_, index) in repo_store.stores" :key="index" v-model="repo_store.stores[index]"
               @close="repo_store.stores.splice(index, 1)"/>
    <el-button :icon="Plus" style="width: 100%; margin-top: 16px;" type="primary"
               @click="repo_store.stores.push({title: 'new repo', index_file_paths: [], lyric_file_paths: []})"/>
  </el-drawer>
</template>

<script lang="ts">
const isMobile = window.innerWidth <= 768
window.addEventListener('resize', () => {
  (window as any).isMobile = window.innerWidth <= 768
})
</script>

<style scoped>
.app-container {
  min-height: 100vh;
}

.app-header {
  display: flex;
  padding: 12px 20px;
  height: auto !important;
}

.app-main {
  padding: 12px;
}

.app-footer {
  padding: 12px;
  height: auto !important;
}

.el-row:not(:last-child) {
  margin-bottom: 10px;
}

.el-main > div:not(:last-child) {
  margin-bottom: 20px;
}

.el-pagination {
  justify-content: center;
}

.controllers {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  flex-wrap: wrap;
  gap: 8px;
}

.left {
  flex-shrink: 0;
}

.right {
  text-align: right;
  margin-left: auto;
}

.controllers .right + .right {
  margin-left: 10px;
}

.search-row {
  margin-bottom: 16px;
}

.lyric-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-bottom: 16px;
}

.proxy-row {
  grid-template-columns: 1fr 3fr auto;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .app-header {
    padding: 8px 12px;
  }

  .app-main {
    padding: 8px;
  }

  .controllers {
    flex-direction: row;
    align-items: center;
  }

  .mobile-actions {
    display: flex;
    gap: 4px;
    margin-left: auto;
  }

  .mobile-btn {
    padding: 6px 8px;
  }

  .btn-text {
    display: none;
  }

  .mobile-btn .btn-text {
    display: inline;
    margin-left: 4px;
  }

  @media screen and (max-width: 480px) {
    .btn-text {
      display: none !important;
    }
    
    .mobile-btn {
      padding: 6px !important;
    }
  }

  .mobile-search-input {
    width: 100%;
  }

  .mobile-form {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .mobile-form-item {
    margin-bottom: 8px;
    margin-right: 0;
  }

  .mobile-form-item :deep(.el-form-item__label) {
    width: 100px !important;
    font-size: 12px;
  }

  .mobile-input-tag {
    width: 100%;
  }

  .mobile-pagination {
    --el-pagination-button-width: 28px;
    --el-pagination-button-height: 28px;
  }

  .mobile-pagination :deep(.el-pager li) {
    min-width: 28px;
    height: 28px;
    line-height: 28px;
    font-size: 12px;
  }

  .mobile-settings-row {
    grid-template-columns: 1fr auto;
  }

  .proxy-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .mobile-select,
  .mobile-proxy-input,
  .mobile-port-input {
    width: 100%;
  }

  .mobile-port-input :deep(.el-input__wrapper) {
    width: 100%;
  }
}

/* 平板适配 */
@media screen and (min-width: 769px) and (max-width: 1024px) {
  .app-main {
    padding: 16px;
  }

  .lyric-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

/* 桌面端 */
@media screen and (min-width: 1025px) {
  .lyric-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}
</style>
