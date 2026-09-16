---
name: frontend
description: Vue 3 + TypeScript + Ant Design Vue 项目的前端开发规范。涉及 .vue 组件与页面、样式、状态管理（Pinia / 组合式函数）、接口请求与类型定义、Cesium / OpenLayers 地图与三维场景时使用。
license: MIT
---

# 前端开发规范（Vue 3 + TypeScript + Ant Design Vue）

> **强制前置**：按 AGENTS.md 硬约束 #13，`frontend/` 目录内的**一切**改动（含改 bug、调样式、重构等小改动），动手前必须先读本技能并遵循。
> **级别**：本技能全部条款按**必须**执行，没有「推荐」档。
> **冲突**：与 AGENTS.md 不一致时取**更严格**者；两者结论相反且都很硬时，停下来问，禁止自行挑选。
> **技术背景**：Vue 3 + `<script setup>` + TypeScript + Pinia + Ant Design Vue + less + Cesium / OpenLayers。

---

## 1. 项目结构与目录职责

```
frontend/src/
├── components/    公共组件（跨页面复用）
├── composables/   组合式函数 useXxx.ts（可复用的响应式逻辑）
├── views/         页面组件（按路由 / 业务场景拆分）
├── store/         Pinia 状态（非必要不用）
├── api/           业务接口函数（按模块拆分，不含拦截器）
├── http/          axios 入口：默认配置与请求 / 响应拦截器（AGENTS.md #16）
├── types/         全局类型定义（Res<T> 等，index.ts 统一出口）
├── styles/        全局样式（唯一允许定义全局样式的位置）
└── utils/         纯工具函数（无响应式）
```

- 业务组件放所属页面目录下的 `components/`；只有**跨页面复用**的才上提到 `src/components/`。
- 目录职责不得串用：接口函数在 `api/`、axios 配置在 `http/`、类型在 `types/`、响应式逻辑在 `composables/`、纯函数在 `utils/`。

---

## 2. 新建文件与模板

- 新建任何 `.vue` 文件前，必须先读取骨架 `.dsh/skills/frontend/reference/temp.vue`，并严格沿用其结构。
- 骨架顺序固定：**文件头注释块 → `<template>` → `<script setup lang="ts">` → `<style scoped lang="less">`**。
- 文件头注释必须保留 `@Author` / `@Date` / `@Description` 三项：`@Date` 填实际创建时间（`YYYY-MM-DD HH:mm:ss`），`@Description` 写清文件用途。
- 模板根节点 id 用 `<组件名>Box`（如 `mapContainerBox`），样式块以该 id 选择器编写；样式一律 `scoped` 且 `lang="less"`。
- 组织方式的参照物是 `.dsh/skills/frontend/reference/style-sample.vue`：导入分组 → 局部状态 → 就近的 `async` 方法。

---

## 3. 代码组织与语法

- **页面拆分**：不同路由 / 功能必须拆到独立 `.vue` 文件，严禁所有代码写在一个文件里；一个页面文件只负责一个主要业务场景。
- **组件提取**：出现下列情况必须拆成独立组件——同一段模板 / 逻辑在 2 处以上使用、单文件超过 300 行（不含样式）、包含独立业务逻辑（表单、弹窗、列表项等）。
- **文件行数**：Vue 文件（模板 + 脚本）建议 ≤ 400 行，**1000 行是底线**，超过必须拆分；样式超过 200 行拆到独立 `.scss` / `.css`。
- **强制 ES6+**：`const` / `let`、箭头函数、解构、模板字符串、`async/await`、可选链 `?.`、空值合并 `??`、模块化 `import/export`；禁止 `var`；使用 `===` / `!==`，避免 `==` / `!=`。
- **ES5 退化必须汇报**：仅当目标环境或依赖确实不兼容时才可使用 ES5 写法（`function` + `var`、`arguments`、`const that = this`、回调式异步等），且必须在交付说明中写明**退化位置 + 具体原因 + 影响范围**；未汇报即使用 ES5 语法视为违规。
- **Composition API**：统一 `<script setup>`；超过 20 行的响应式逻辑（状态、方法、生命周期）抽到 `composables/` 下的独立 `.ts`；纯工具函数放 `utils/`。
- **导入规范**：按 第三方库 → 本地模块 分组，组间空一行（Node 侧脚本如需内置模块，内置模块放最前）；避免通配符导入 `import *`；使用明确路径；未使用的导入一律删除。
- **响应式**：`ref` 处理基本类型，`reactive` / `shallowReactive` 处理对象与数组；Props 和 Emits 必须显式声明类型。
- **输出代码块用正确语言标识**：Vue 单文件组件用 ```` ```vue ````，脚本片段用 ```` ```ts ````，样式用 ```` ```less ````。

---

## 4. 状态与复用

- **非必要不用 store**：局部状态留在组件内（`ref` / `reactive`）或抽到 composables，禁止图省事把普通状态塞进 Pinia。
- **只有复杂组件间共享的变量才进 store**：典型是全局单例对象，如 OpenLayers 的 `map`、Cesium 的 `viewer`——需要被多个页面 / 组件同时访问和操作时才放进 store。
- **判断基准**：状态只在单个页面 / 组件树内用 → 组件内或 composables；跨路由、跨模块长期共享 → store。拿不准时先放 composables，确认确实需要共享再上移。
- **单例要求**：进入 store 的共享实例必须保持单例，避免多处 `new Map()` / `new Viewer()` 导致地图、视图状态混乱（另见《9. 地图与三维场景》）。
- **禁止在组件中直接修改 store 状态**（AGENTS.md #15）：必须经由 store 暴露的 action 变更。
- **复用与拆分优先 composables**：可复用的响应式逻辑（状态 + 方法）必须抽到 `src/composables/` 下的 `useXxx.ts`，禁止复制粘贴；**组件过长时优先用 composables 拆分**，而不是拆成多个只有几行的子组件——把状态与逻辑搬进 composables，让模板与 `<script setup>` 保持精简。
- **composables 约定**：命名统一 `useXxx`，必须有文件头注释说明用途与返回值。
- **节制使用 `watch` / `computed`**：二者会掩盖数据流、降低可读性，非必要不引入。
  - 能在事件回调（`@click`、`@change`、接口返回处）直接处理结果的，不要用 `watch` 去"监听变化再处理"。
  - `computed` 仅用于确实需要依赖缓存的派生值；简单取值直接写函数或模板内表达式。
  - 禁止用 `watch` 建立组件之间的隐式同步链路；需要同步就用显式的 props / emit 或 store action。
  - 确有必要使用时，就地写一行注释说明**为什么不能用更直接的方式**。

---

## 5. 类型与接口

- **统一响应体 `Res<T>`（强制）**：后端所有接口统一返回下述结构，前端一律用它标注类型，禁止各处自定义响应类型：

  ```ts
  /*
   * @Author: Zesion Lee
   * @Date: 2025-07-10 14:44:14
   * @Description: 后端统一响应体
   */

  export interface Res<T = any> {
    code: number
    data: T
    msg: string
  }
  ```

- **成功判定**：`code === 200` 为成功，**其余 code 一律视为失败**（401 未登录、403 无权限、500 服务器错误、业务错误码等）；只按 `code === 200` 判断，禁止拿 `msg` 文案判断成功与否。
- **泛型标注**：`data` 必须用泛型标出具体业务类型（如 `Res<PgConfig>`、`Res<PgConfig[]>`），禁止 `res.data.data` 裸取后当 `any` 用。
- **类型集中放 `src/types/`，禁止写在组件里**：按领域分文件（`api.ts` 放 `Res<T>` 等通用类型，`db.ts` / `user.ts` 放对应领域类型），由 `src/types/index.ts` 统一 re-export 作为唯一出口；组件内禁止就地手写接口返回类型或 `ref<{ ... }>` 内联结构类型。
- **引用方式**：业务代码一律 `import type { Res } from '@/types'`。
- **类型文件只放类型**：必须用 `import type` / `export type`，不得包含运行时代码，避免把无关模块拖进依赖图。
- `T = any` 是本项目对 AGENTS.md #8「禁止 `any`」的**唯一豁免**：它只是缺省泛型参数，业务代码实际取用时必须显式传入具体类型。
- TypeScript 严格模式与 `any` 的通用要求见 AGENTS.md #7 / #8；复杂数据结构用 `interface` / `type` 定义在 `types/` 中，并为函数参数与返回值补类型。

---

## 6. 请求与错误处理

- **直接用 axios 默认实例**（AGENTS.md #16）：业务代码直接调用 `axios.get` / `axios.post` / `axios.put` / `axios.delete`。
- **统一注册点**：Token 注入、错误提示、loading 等只在 `src/http/index.ts` 注册一次——`axios.interceptors.request / response.use()` 与 `axios.defaults.*`（在 `main.ts` 里引入一次即可全局生效）。
- **禁止**再包一层自研 `request` / `get` / `post` 封装，也禁止到处 `axios.create()` 造多实例。
- **异步必须 `try/catch`**：所有可能失败的异步操作（`onMounted`、用户点击触发的请求等）都要捕获；错误信息要有意义，禁止静默失败。
- **关键操作要有 loading 与错误提示**：用户触发的请求需给出加载状态，失败时用 `message` 明确告知。
- 请求参数若来自响应式对象，传参前用 `toRaw()` 取出原始对象，避免把响应式代理塞进请求体。

---

## 7. 样式

- 必须使用 `scoped`（模板已固定 `lang="less"`）或 CSS Modules，避免样式泄露。
- 全局样式只在 `src/styles/` 中定义，禁止在其他文件写全局样式污染。
- 单文件样式超过 200 行时拆到独立样式文件（见《3. 代码组织与语法》）。

---

## 8. 注释与可读性

- **复杂组件**（超过 150 行）顶部写一段注释说明：用途、主要 Props、关键事件。
- **composables 文件**必须有文件头注释说明返回值（另见《4. 状态与复用》）。
- 公共函数 / 类必须有 JSDoc 注释；复杂业务逻辑加行内注释说明思路；特殊处理必须注释「为什么这么做」（AGENTS.md #23）。
- **代码自包含：禁止为抽象而抽象**
  - 单处使用的逻辑**就近**写在使用处（页面 / 组件 / composable 内），保证打开一个文件就能看懂一件事；禁止为了"看起来解耦"把一次性的取数、转换、判断拆到多个小文件，导致读实现要跨文件跳转。
  - 允许且仅允许两种拆分理由：**真复用**（同一逻辑 ≥ 2 处使用）、**真超长**（触及《3. 代码组织与语法》的行数上限）。其余情况先就地写，等第二处出现再抽；确需拆分时优先 composables，而不是碎片化子组件。

---

## 9. 地图与三维场景（Cesium / OpenLayers）

- **实例单例**：`Cesium.Viewer`、OpenLayers `Map` 等重量级实例全应用只保留一个；跨页面共享时放 store，只在单个页面内使用时用模块级或组件内变量持有，禁止在组件里反复 `new`。
- **从 store 取，不在组件里造**：需要共享实例的组件必须从 store 取用（如 `store.viewer`），不要在组件内自行创建第二个实例，否则会出现瓦片 / 相机 / 内存混乱。
- **必须销毁**：组件卸载时在 `onUnmounted` 中销毁实例与监听——`viewer.destroy()`、`map.setTarget(undefined)`，同时清理事件监听与定时器。
- **不要深度响应式包裹实例**：实例本身用 `shallowRef` / `markRaw` 持有或 `toRaw()` 传参，避免深度代理带来的性能与循环引用问题；图层 / 实体等业务数据放组件状态即可。

---

## 附：与 AGENTS.md 的对应关系

| 本技能小节 | 对应 AGENTS.md 硬约束 |
| ---------- | --------------------- |
| 1. 项目结构与目录职责 | #13（技能强制前置）、#16（`http/` 入口） |
| 2. 新建文件与模板 | #13、#12（kebab-case 命名） |
| 3. 代码组织与语法 | #10（重复率）、#11（函数长度）、#12（命名） |
| 4. 状态与复用 | #14（非必要不用 store）、#15（禁止直接改 store） |
| 5. 类型与接口 | #7（严格模式）、#8（禁止 any）、#18（统一响应体） |
| 6. 请求与错误处理 | #9（错误处理）、#16（axios 直用） |
| 7. 样式 | —（技能独有） |
| 8. 注释与可读性 | #23（注释规范） |
| 9. 地图与三维场景 | #14（单例实例入 store） |

> 新增前端细则一律写进本技能，并在 AGENTS.md #13 的覆盖清单里登记；跨端 / 后端 / 通用规则写 AGENTS.md 硬约束。
