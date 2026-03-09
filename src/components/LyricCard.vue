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
  <el-card>
    <template #header>
      <el-text>{{ props.ttml.rawLyricFile }}</el-text>
      <el-col>
        <el-button type="info" :icon="Refresh" @click="emit('redownlaod', props.ttml.rawLyricFile)" circle/>
        <el-button type="success" :icon="Download" @click="save_ttml" circle/>
        <el-button type="primary" :icon="DocumentCopy" @click="copy_ttml" circle/>
      </el-col>
    </template>
    <el-collapse v-model="active_name" expand-icon-position="left" accordion>
      <el-collapse-item title="plaintext" name="plaintext">
        <el-text v-html="marked(props.ttml?.text)"/>
      </el-collapse-item>
      <el-collapse-item title="ttml" name="ttml">
        <el-text v-html="marked(escapeXmlForVHtml(props.ttml?.ttml))"/>
      </el-collapse-item>
    </el-collapse>
    <template #footer>
      <el-row style="gap: 6px;">
        <el-tag v-for="(meta, index) in getMetadatasFromTTML(props.ttml.ttml)" :key="index" type="primary" size="large">
          <span v-html="marked(escapeXmlForVHtml(`${meta.key}: ${meta.val}`))"/>
        </el-tag>
      </el-row>
    </template>
  </el-card>
</template>

<style scoped>
.el-tag {
  /* height: unset; */
  padding: 6px;
}

.el-card {
  box-shadow: var(--el-box-shadow);
}

:deep(.el-card__header) {
  display: grid;
  grid-template-columns: 1fr auto;
}
</style>