<script setup lang="ts">
import {ref} from "vue";
import {marked} from "marked";
import {DocumentCopy, Download, Refresh} from "@element-plus/icons-vue";
import {writeText, save, writeTextFile, downloadDir, join} from "../utils/tauriCompat.ts";
import {db} from "../database";
import {ElMessage} from "element-plus";
import {escapeXmlForVHtml, getMetadatasFromTTML} from "../utils/ttmlT.ts";
import {useConfigStore} from "../store/configStore.ts";

const configStore = useConfigStore()

const props = defineProps({
  ttml: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(["redownlaod"])

const active_name = ref("")

const save_ttml = async () => {
  const path = await save({
    defaultPath: await join(configStore.download.default_path || await downloadDir(), props.ttml.rawLyricFile),
    filters: [
      {
        name: "ttml lyric file",
        extensions: ['ttml'],
      },
    ],
  })
  if (path)
    db.ttmls.get(props.ttml.rawLyricFile).then(async (v)=>writeTextFile(path, (v?.ttml) ?? "").then(()=>ElMessage.success("保存成功")))
}

const copy_ttml = () => {
  db.ttmls.get(props.ttml.rawLyricFile).then(async (v)=>writeText((v?.ttml) ?? "").then(()=>ElMessage.success("复制成功")))
}

marked.use({
  tokenizer: {
    url(_src) {
      // disable gfm autolinks
      return undefined
    },
  },
});
</script>

<template>
  <el-card class="lyric-card">
    <template #header>
      <div class="card-header">
        <el-text class="card-title" :title="props.ttml.rawLyricFile">{{ props.ttml.rawLyricFile }}</el-text>
        <div class="card-actions">
          <el-button type="info" :icon="Refresh" @click="emit('redownlaod', props.ttml.rawLyricFile)" circle size="small"/>
          <el-button type="success" :icon="Download" @click="save_ttml" circle size="small"/>
          <el-button type="primary" :icon="DocumentCopy" @click="copy_ttml" circle size="small"/>
        </div>
      </div>
    </template>
    <el-collapse v-model="active_name" expand-icon-position="left" accordion>
      <el-collapse-item title="plaintext" name="plaintext">
        <el-text v-html="marked(props.ttml?.text)" class="lyric-text"/>
      </el-collapse-item>
      <el-collapse-item title="ttml" name="ttml">
        <el-text v-html="marked(escapeXmlForVHtml(props.ttml?.ttml))" class="lyric-text"/>
      </el-collapse-item>
    </el-collapse>
    <template #footer>
      <el-row class="meta-tags">
        <el-tag v-for="(meta, index) in getMetadatasFromTTML(props.ttml.ttml)" :key="index" type="primary" size="small" class="meta-tag">
          <span v-html="marked(escapeXmlForVHtml(`${meta.key}: ${meta.val}`))"/>
        </el-tag>
      </el-row>
    </template>
  </el-card>
</template>

<style scoped>
.lyric-card {
  box-shadow: var(--el-box-shadow);
  margin-bottom: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.card-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.card-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.lyric-text {
  font-size: 14px;
  line-height: 1.6;
  word-break: break-all;
}

.meta-tags {
  gap: 6px;
  flex-wrap: wrap;
}

.meta-tag {
  padding: 4px 8px;
  font-size: 12px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .lyric-card {
    margin-bottom: 8px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .card-title {
    width: 100%;
    font-size: 12px;
  }

  .card-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .lyric-text {
    font-size: 13px;
  }

  .meta-tag {
    font-size: 11px;
    padding: 2px 6px;
  }
}

@media screen and (max-width: 480px) {
  .card-title {
    font-size: 11px;
  }

  .card-actions .el-button {
    width: 28px;
    height: 28px;
  }
}
</style>
