<script setup lang="ts">
import {ref, defineModel, ModelRef} from "vue";
import {Close} from "@element-plus/icons-vue";

const repo:ModelRef<{
  title: string,
  index_file_paths: string[],
  lyric_file_paths: string[]
}> = defineModel({required: true})

const emit = defineEmits(['close'])

const new_data = ref({
  edit_title: false,
  index_file_path: {
    val: "",
    fun: (v:string)=>{
      if (v) {
        repo.value.index_file_paths.push(v)
        new_data.value.index_file_path.val = ""
      }
    }
  },
  lyric_file_path: {
    val: "",
    fun: (v:string)=>{
      if (v && v.indexOf("[ttml]") != -1) {
        repo.value.lyric_file_paths.push(v)
        new_data.value.lyric_file_path.val = ""
      }
    }
  }
})
</script>

<template>
<el-card>
  <template #header>
    <el-input v-if="new_data.edit_title" v-model="repo.title" size="large" @change="repo.title && (new_data.edit_title = false)" @blur="repo.title && (new_data.edit_title = false)" clearable/>
    <el-row style="display: grid; grid-template-columns: 1fr auto" v-else>
      <el-text size="large" tag="b" v-text="repo.title" @dblclick="new_data.edit_title = true"/>
      <el-button type="danger" :icon="Close" @click="emit('close')" size="small" text/>
    </el-row>
  </template>
  <el-row>
    <el-text size="large" tag="b" v-text="'索引文件'"/>
  </el-row>
  <el-row class="list" v-for="(index_file_path, index) in repo.index_file_paths" :key="index_file_path">
    <span><el-button type="danger" :icon="Close" @click="repo.index_file_paths.splice(index, 1)" size="small" circle/></span>
    <span><el-text v-text="index_file_path"/></span>
  </el-row>
  <el-input v-model="new_data.index_file_path.val" @change="new_data.index_file_path.fun" clearable/>
  <el-divider/>
  <el-row>
    <el-text size="large" tag="b" v-text="'歌词文件'"/>
  </el-row>
  <el-row class="list" v-for="(lyric_file_path, index) in repo.lyric_file_paths" :key="lyric_file_path">
    <span><el-button type="danger" :icon="Close" @click="repo.lyric_file_paths.splice(index, 1)" size="small" circle/></span>
    <span><el-text v-text="lyric_file_path"/></span>
  </el-row>
  <el-input v-model="new_data.lyric_file_path.val" @change="new_data.lyric_file_path.fun" clearable/>
</el-card>
</template>

<style scoped>
.el-card {
  margin-bottom: 16px;
}

.list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  padding-top: 8px;
  padding-bottom: 8px;
}

.list + .list {
  border-top: 1px solid var(--el-border-color);
}

.el-row:has(+ .list) > .el-text {
  border-bottom: 1px dashed var(--el-border-color);
  padding-bottom: 4px;
}
</style>