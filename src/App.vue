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
import {open} from "@tauri-apps/plugin-dialog";
import {downloadDir} from "@tauri-apps/api/path";
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
                  keywords
                      .every(keyword => JSON.stringify(ttml).indexOf(keyword) !== -1))
              .map(ttml => {
                let new_ttml = Object.assign({}, ttml)
                keywords.forEach(keyword => {
                  if (keyword) {
                    new_ttml.ttml = ttml.ttml.replace(keyword, `**${keyword}**`)
                    new_ttml.text = ttml.text.replace(keyword, `**${keyword}**`)
                  }
                })
                return new_ttml
              })
        }
      }, 500)
    },
    {deep: true, immediate: true})

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

  await db.ttmls.clear();
  for (const repo of repo_store.stores) {
    const notification = ElNotification({
      title: `正在下载 ${repo.title} 的索引文件`,
      message: '请稍等',
      duration: 0,
      showClose: false
    })
    await downloadContentFromUrls(repo.index_file_paths)
        .then(async (content: string) => {
          const lines = content.trim().split(/\r?\n/);

          // 我们将使用一个 ref 来跟踪已完成的下载任务数量
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

          notification.close()
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
</script>

<template>
  <el-container>
    <el-header>
      <el-row class="controllers">
        <span class="left">
          <el-switch v-model="search_config.pro_mod" active-text="精准搜索" inactive-text="模糊搜索"
                     inline-prompt size="large"
                     style="--el-switch-on-color: var(--el-color-success); --el-switch-off-color: var(--el-color-primary);"/>
        </span>
        <span class="right">
          <el-button :icon="Refresh" plain type="primary" @click="refresh">刷新</el-button>
          <el-button :icon="Refresh" plain type="success" @click="reanalize">重新解析</el-button>
        </span>
        <span class="right">
          <el-button :icon="Setting" circle type="primary" @click="setting_config.open"/>
        </span>
      </el-row>
    </el-header>
    <el-main>
      <el-row>
        <template v-if="search_config.pro_mod">
          <el-form inline label-width="auto">
            <el-form-item v-for="meta_key in Object.keys(search_config.metas)" :key="meta_key" :label="meta_key">
              <el-input-tag v-model="(search_config as any).metas[meta_key]" clearable tag-effect="dark" tag-type="primary"/>
            </el-form-item>
          </el-form>
        </template>
        <template v-else>
          <el-input v-model="search_config.keyword" clearable placeholder="请输入内容"/>
        </template>
      </el-row>
      <el-empty v-if="list_ttmls.length == 0"/>
      <lyric-card v-for="ttml in list_ttmls" :key="ttml.rawLyricFile" :ttml="ttml"/>
    </el-main>
    <el-footer>
      <el-pagination v-model:current-page="recent_index" :page-count="Math.ceil(filted_ttmls.length/20)" background
                     hide-on-single-page
                     layout="prev, pager, next" size="large"/>
    </el-footer>
  </el-container>
  <el-drawer v-model="setting_config.show_setting" :show-close="false" size="700">
    <template #header>
      <el-text size="large" tag="b">设置</el-text>
      <el-button :icon="Refresh" type="primary" @click="()=>{repo_store.$reset(); config_store.$reset()}">重置
      </el-button>
    </template>
    <el-row style="display: grid; grid-template-columns: 1fr auto; gap: 8px;">
      <el-input v-model="config_store.download.default_path" clearable placeholder="默认保存目录"/>
      <el-button :icon="FolderOpened" type="primary" @click="select_download_path"/>
    </el-row>
    <el-row style="display: grid; grid-template-columns: 1fr 4fr auto; gap: 8px;">
      <el-select v-model="config_store.proxy.protocol" placeholder="协议">
        <el-option label="socks5" :value="'socks5'"/>
        <el-option label="socks4" :value="'socks4'"/>
        <el-option label="https" :value="'https'"/>
        <el-option label="http" :value="'http'"/>
      </el-select>
      <el-input v-model="config_store.proxy.ip"/>
      <el-input-number v-model="config_store.proxy.port"/>
    </el-row>
    <repo-card v-for="(_, index) in repo_store.stores" :key="index" v-model="repo_store.stores[index]"
               @close="repo_store.stores.splice(index, 1)"/>
    <el-button :icon="Plus" style="width: 100%;" type="primary"
               @click="repo_store.stores.push({title: 'new repo', index_file_paths: [], lyric_file_paths: []})"/>
  </el-drawer>
</template>

<style scoped>
.el-row:not(:last-child) {
  margin-bottom: 10px;
}

.el-main > div:not(:last-child) {
  margin-bottom: 20px;
}

.el-header {
  display: flex;

}

.el-pagination {
  justify-content: center;
}

.controllers {
  /* 启用 Flexbox 布局 */
  display: flex;
  /* 子元素在主轴（水平方向）上对齐，左侧靠左，右侧靠右 */
  justify-content: space-between;
  /* 可选：如果子元素高度不同，让它们顶部对齐 */
  align-items: center; /* 使用 center 更适合按钮和开关的垂直居中 */
  width: 100%; /* 确保 el-row 占据可用宽度 */
}

.left {
  /* 让左侧部分（Switch）占据一部分空间，并允许其收缩 */
  flex-shrink: 0; /* 防止左侧内容（如 switch）被压缩 */
  /* 如果需要左侧固定宽度，可以设置 width: 150px; (示例) */
}

.right {
  /* 让右侧部分（Buttons）占据剩余空间，并允许其收缩 */
  text-align: right; /* 将右侧按钮靠右对齐 */
  margin-left: auto; /* 另一种将右侧内容推到最右边的方法 */
}

/* 如果右侧有多个 .right 元素，并且你想让它们紧挨着 */
.controllers .right + .right {
  margin-left: 10px; /* 在右侧元素之间添加一些间距 */
}
</style>
<style>
</style>