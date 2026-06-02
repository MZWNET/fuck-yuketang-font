# fuck-yuketang-font

一个用于雨课堂学生作业页面的 userscript：自动捕获页面里的加密题目字体，解析字形映射，并把页面中使用加密字体的文本替换回真实字符。

## 功能

- 自动监听 `www.yuketang.cn/v2/web/cloud/student/exercise/` 下的所有页面，包括多级子路径。
- 捕获 `fe_font/product/exam_font_*.ttf` 字体地址。
- 支持 `GM_xmlhttpRequest` 下载字体，开发环境下回退到 `fetch`。
- 解密带有 `xuetangx-com-encrypted-font` class 的文本节点。
- 在页面右下角显示当前解析/解密状态。

## 项目结构

```text
src/
  app/                 Solid 应用入口和挂载逻辑
  components/          可复用 UI 组件
  constants/           userscript 相关常量
  core/font/           字体解析、字形 hash、文本替换核心逻辑
  runtime/             userscript 运行时、状态、监听器和解密编排
  services/            DOM、HTTP、平台兼容能力
  main.tsx             userscript 构建入口
```

## 开发

```bash
pnpm install
pnpm dev
```

开发服务器由 Vite 启动。userscript 构建入口是 `src/main.tsx`，配置在 `vite.config.ts` 的 `vite-plugin-monkey` 中。

## 测试与检查

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm knip
```

`pnpm test` 会运行 Vitest 并生成覆盖率报告，当前覆盖率阈值为 90%。

## 构建

```bash
pnpm build
```

构建产物输出到 `dist/`。安装到浏览器时，使用 `vite-plugin-monkey` 生成的 userscript 文件。

## 维护提示

- UI 变更优先放在 `src/components/` 或 `src/app/`。
- 字体算法变更放在 `src/core/font/`，避免依赖 DOM。
- 页面监听、状态切换和异步编排放在 `src/runtime/`。
- 浏览器能力、DOM 查询和请求 transport 放在 `src/services/`。
