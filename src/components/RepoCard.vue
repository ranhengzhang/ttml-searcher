<script setup lang="ts">
import {ref, defineModel, ModelRef} from "vue";
import {Close} from "@element-plus/icons-vue";

const repo:ModelRef<{
  title: string,
  index_file_paths: {
    href: string,
    proxy: boolean
  }[],
  lyric_file_paths: {
    href: string,
    proxy: boolean
  }[]
}> = defineModel({required: true})

const emit = defineEmits(['close'])

const new_data = ref({
  edit_title: false,
  index_file_path: {
    val: "",
    fun: (v:string)=>{
      if (v) {
        repo.value.index_file_paths.push({href: v, proxy: false})
        new_data.value.index_file_path.val = ""
      }
    }
  },
  lyric_file_path: {
    val: "",
    fun: (v:string)=>{
      if (v && v.indexOf("[ttml]") != -1) {
        repo.value.lyric_file_paths.push({href: v, proxy: false})
        new_data.value.lyric_file_path.val = ""
      }
    }
  }
})
</script>

<template>
<el-card class="repo-card">
  <template #header>
    <div class="card-header">
      <el-input v-if="new_data.edit_title" v-model="repo.title" size="default" @change="repo.title && (new_data.edit_title = false)" @blur="repo.title && (new_data.edit_title = false)" clearable class="title-input"/>
      <template v-else>
        <el-text size="default" tag="b" v-text="repo.title" @dblclick="new_data.edit_title = true" class="card-title"/>
        <el-button type="danger" :icon="Close" @click="emit('close')" size="small" circle/>
      </template>
    </div>
  </template>
  <div class="section">
    <el-text size="default" tag="b" class="section-title">索引文件</el-text>
    <div class="list-container">
      <div class="list-item" v-for="(index_file_path, index) in repo.index_file_paths" :key="index">
        <el-button type="danger" :icon="Close" @click="repo.index_file_paths.splice(index, 1)" size="small" circle/>
        <el-text class="item-text" :title="index_file_path.href">{{ index_file_path.href }}</el-text>
        <el-switch v-model="index_file_path.proxy" active-text="代理" inactive-text="直连" inline-prompt size="small"/>
      </div>
    </div>
    <el-input v-model="new_data.index_file_path.val" @change="new_data.index_file_path.fun" placeholder="添加索引文件链接" clearable size="small" class="add-input"/>
  </div>
  <el-divider class="mobile-divider"/>
  <div class="section">
    <el-text size="default" tag="b" class="section-title">歌词文件</el-text>
    <div class="list-container">
      <div class="list-item" v-for="(lyric_file_path, index) in repo.lyric_file_paths" :key="index">
        <el-button type="danger" :icon="Close" @click="repo.lyric_file_paths.splice(index, 1)" size="small" circle/>
        <el-text class="item-text" :title="lyric_file_path.href">{{ lyric_file_path.href }}</el-text>
        <el-switch v-model="lyric_file_path.proxy" active-text="代理" inactive-text="直连" inline-prompt size="small"/>
      </div>
    </div>
    <el-input v-model="new_data.lyric_file_path.val" @change="new_data.lyric_file_path.fun" placeholder="添加歌词文件链接模板" clearable size="small" class="add-input"/>
    <el-text type="info" size="small" class="hint-text">请用 <code>[ttml]</code> 作为文件名占位符</el-text>
  </div>
</el-card>
</template>

<style scoped>
.repo-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.title-input {
  flex: 1;
}

.card-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.section {
  margin-bottom: 16px;
}

.section-title {
  display: block;
  border-bottom: 1px dashed var(--el-border-color);
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.item-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.add-input {
  margin-top: 8px;
}

.hint-text {
  display: block;
  margin-top: 4px;
}

.hint-text code {
  background: var(--el-fill-color);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .repo-card {
    margin-bottom: 12px;
  }

  .card-header {
    gap: 8px;
  }

  .card-title {
    font-size: 14px;
  }

  .section {
    margin-bottom: 12px;
  }

  .section-title {
    font-size: 14px;
    padding-bottom: 6px;
  }

  .list-item {
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    gap: 6px;
    padding: 6px 0;
  }

  .list-item .el-button {
    grid-row: 1 / 3;
    align-self: center;
  }

  .list-item .item-text {
    grid-column: 2;
    grid-row: 1;
    font-size: 12px;
  }

  .list-item .el-switch {
    grid-column: 2;
    grid-row: 2;
    justify-self: start;
  }

  .item-text {
    font-size: 12px;
  }

  .mobile-divider {
    margin: 12px 0;
  }

  .hint-text {
    font-size: 11px;
  }
}

@media screen and (max-width: 480px) {
  .card-title {
    font-size: 13px;
  }

  .section-title {
    font-size: 13px;
  }

  .list-item {
    gap: 4px;
  }

  .item-text {
    font-size: 11px;
  }
}
</style>
