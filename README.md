# Video App (Cloudflare Workers 版)

基于 **Cloudflare Workers** + **Vite** + **React 19** + **Hono** 极速边缘架构构建的高颜值在线影视 Web 应用。

## 架构亮点

- ⚡️ **超强性能**：Worker 代码体积 < 100KB，边缘节点冷启动低于 5ms。
- 🛡️ **边缘中转代理**：全面内置 `/api/proxy-img`（图片代理缓存）与 `/api/proxy-m3u8`（M3U8 重写及 TS 切片强缓存），无缝解决跨域与播放卡顿问题。
- 🎨 **现代化 UI**：暗色微光玻璃态（Glassmorphism）设计，支持响应式导航、多分类筛选与实时搜索。
- 🎬 **流畅播放**：集成 ArtPlayer 播放器与 HLS.js，支持高清/多码率切换与无刷新后台切集。

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
│   ├── components/     # React 界面组件 (Navbar, VideoPlayer)
│   ├── pages/          # 页面 (HomePage, PlayPage)
│   ├── worker/         # Cloudflare Worker API (index.ts 基于 Hono)
│   ├── App.tsx         # 应用主组件与路由管理
│   ├── index.css       # Tailwind CSS & 玻璃态样式
│   └── main.tsx        # SPA 入口挂载
├── index.html          # Vite HTML 模版
├── vite.config.ts      # Vite & Hono 开发服务器配置
└── wrangler.json       # Cloudflare Workers 配置
```
