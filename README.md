# Video App (Cloudflare Workers 版)

基于 **Cloudflare Workers** + **Vite** + **React 19** + **Hono** 极速边缘架构构建的高颜值在线影视 Web 应用。

## 架构亮点

- **超强性能**：Worker 边缘节点冷启动低于 5ms，静态资源托管于 Cloudflare Global CDN。
- **双数据源聚合**：已完整接入 **4K 影视 (`4kvm.net`)** 与 **欧乐影视 (`olevod.com`)**，支持搜索时自动聚合双源或单源筛选，并在卡片与播放器中清晰标记数据来源。
- **边缘 WebAssembly 解密 & 媒体代理**：内置 WebAssembly 播放凭据自动签名器，全面内置 `/api/proxy-img` 与 `/api/proxy-m3u8`（M3U8 重写及 TS 切片强缓存），无缝解决跨域、防盗链与播放卡顿问题。
- **现代化 UI**：暗色微光玻璃态（Glassmorphism）设计，支持响应式导航、多分类筛选、来源切换 Tab 与实时搜索。
- **流畅播放**：集成 ArtPlayer 播放器与 HLS.js，支持高清/多码率切换与无刷新后台切集、一键搜索换源。

## 本地开发与使用

### 1. 运行本地开发服务器
```bash
npm run dev
```
启动 Vite 配合 Hono 插件本地服务，访问 `http://localhost:3000`。

### 2. 验证与构建
```bash
# 类型检查
npx tsc --noEmit

# 构建前端产物至 dist 目录
npm run build
```

### 3. 本地模拟 Worker 测试
```bash
npm run worker:dev
```

### 4. 部署至 Cloudflare Workers
```bash
npm run deploy
```

## 项目目录结构

```
├── dist/               # Vite 静态编译产物 (Cloudflare Worker 托管)
├── public/             # 静态图标与资源
├── src/
│   ├── components/     # React 界面组件 (Navbar, VideoPlayer, ProtectedRoute)
│   ├── pages/          # 页面 (HomePage, PlayPage, LoginPage)
│   ├── worker/         # Cloudflare Worker API
│   │   ├── index.ts    # Hono 路由、爬虫解析与代理网关
│   │   └── wasm-signer.ts # 4kvm Wasm 签名生成器
│   ├── App.tsx         # 应用主组件与路由管理
│   ├── index.css       # Tailwind CSS & 玻璃态样式
│   └── main.tsx        # SPA 入口挂载
├── index.html          # Vite HTML 模版
├── vite.config.ts      # Vite & Hono 开发服务器配置
└── wrangler.json       # Cloudflare Workers 配置
```
