<!--
 * @Author: {{ 作者 }}
 * @Date: {{ YYYY-MM-DD HH:mm:ss }}
 * @Description: 代码风格参考示例——单文件自包含：导入分组 → 局部状态 → 就近的 async 方法
 *               新建页面/组件时参照本文件的组织方式（骨架结构见同目录 temp.vue）
-->
<template>
  <div id="styleSampleBox">
    <a-form layout="inline">
      <a-form-item label="主机">
        <a-input v-model:value="pgConfig.host" />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" :loading="loading" @click="testDB">测试连接</a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
// 1. 第三方库
import axios from 'axios'
import { message } from 'ant-design-vue'
import { onMounted, ref, shallowReactive, toRaw } from 'vue'

// 2. 本地模块
import type { Res } from '@/types'

// 也可在入口文件统一 axios.defaults.baseURL，调用处就只写 '/db/db-config'
const baseUrl = import.meta.env.VITE_HTTP_BASE_URL

// 状态就近声明在本文件：不进 store（技能 #10），不用 computed/watch 转接（技能 #12）
const pgConfig = shallowReactive({
  username: '',
  password: '',
  host: '',
  port: 5432,
  database: '',
  status: 0,
})

const loading = ref(false)

// 接口调用就地完成：请求 → 判断 code → 反馈，都写在一个函数里，读代码不需要跳去别的文件（技能 #14）
const getDbConfig = async () => {
  try {
    const res = await axios.get<Res>(`${baseUrl}/db/db-config`)
    const { code, data } = res.data
    if (code === 200 && data.username) {
      Object.assign(pgConfig, data)
    }
  } catch (error) {
    message.error(`获取数据库配置失败：${(error as Error).message}`)
  }
}

const testDB = async () => {
  loading.value = true
  try {
    // toRaw：避免把响应式代理对象直接塞进请求体
    const res = await axios.post<Res>(`${baseUrl}/db/test`, toRaw(pgConfig))
    const { code, msg } = res.data
    if (code === 200) {
      message.success(msg)
      pgConfig.status = 1
    } else {
      message.error(msg)
      pgConfig.status = 0
    }
  } catch (error) {
    message.error(`连接失败：${(error as Error).message}`)
    pgConfig.status = 0
  } finally {
    loading.value = false
  }
}

onMounted(getDbConfig)
</script>

<style scoped lang="less">
#styleSampleBox {
}
</style>

<!--
 * 本文件示范的是「组织方式」，不是「必须逐字复制的方法实现」：
 * 1. 导入按 第三方 → 本地 分组，组间空一行；未使用的导入一律删掉（原示例中的 IconPoint / ShpFile 未被使用，故移除）
 * 2. 只要能就地写完，就不要为了"复用"提前拆成 service.ts / utils.ts / 多个小 composable，导致看一个功能要跳 3 个文件
 * 3. 异步必须包 try/catch（技能 #8 + AGENTS.md #9），关键操作要有 loading 与错误提示
 * 4. 请求直接用 axios（AGENTS.md #16）：拦截器与 defaults 只在入口文件注册一次（如 src/http/index.ts，在 main.ts 引入），
 *    业务代码直接 axios.get / post，不要再包一层自研 request/get/post 封装，也不要到处 axios.create()
-->
