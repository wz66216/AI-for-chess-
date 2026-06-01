# ChessExplain 部署到 wangzhai-blog 设计文档

## 背景

将 ChessExplain（分析页 + 搜索实验室）部署到个人博客 wangzhai-blog，实现全网可访问。wangzhai-blog 是 Astro 5 纯静态站点，部署在 Cloudflare Pages。

## 架构

```
wangzhai.pages.dev
├── /                    博客首页
├── /chess/analysis/     分析页 (静态前端)
├── /chess/search-lab/   搜索实验室 (静态前端)
└── /blog/...            博客其他页面

Railway (分析页后端)
├── Stockfish 引擎评估
├── LLM 战术复盘教练
└── 开局库 (代理 Lichess API)

Cloudflare Worker (开局库代理)
├── Lichess Explorer API 转发
└── Token 管理

浏览器 (本地计算)
└── Web Worker: α-β / MCTS 搜索引擎 (TypeScript + chess.js)
```

## 分组件说明

### 1. 搜索实验室前端 → wangzhai-blog
- Vite build 输出静态文件，放入 `my-blog/public/chesslab/`
- 搜索引擎从 Python → TypeScript Web Worker (chess.js)
- 谜题导入直连 Lichess API（不经过后端）
- 博客导航栏加 "♟ 搜索实验室" 链接

### 2. 搜索实验室引擎 → 浏览器 Web Worker
- 新建 `src/engine/` 目录：alphabeta.ts, mcts.ts, evaluators.ts, types.ts
- 复用 chess.js 的 Board / Move API
- 通过 `postMessage` 与主线程通信
- 前端 `SearchWorkbench` 改为 `new Worker()` 调用

### 3. 分析页前端 → wangzhai-blog
- Vite build 输出，放入 `my-blog/public/chess/analysis/`
- 所有后端 API 调用改为指向 Railway URL
- 博客导航栏加 "♜ 国际象棋分析" 链接

### 4. 分析页后端 → Railway
- 保持现有 Python FastAPI 代码，部署到 Railway
- 安装 Stockfish 二进制
- 设置环境变量：LLM API Key、Lichess Token
- CORS 允许 wangzhai.pages.dev

### 5. 开局库代理 → Cloudflare Worker
- 新建 `workers/lichess-proxy.js`
- 转发请求到 Lichess Explorer API
- 注入 Lichess API Token（从环境变量读取）
- 缓存热门局面（减少 API 调用）

## 构建流程

```bash
# 搜索实验室
cd phase2_research/frontend
VITE_API_BASE=https://chess-backend.railway.app npm run build
cp -r dist/* ../wangzhai-blog/my-blog/public/chesslab/

# 分析页（使用 Phase 1 或 Phase 2 构建）
cd frontend
VITE_API_BASE=https://chess-backend.railway.app npm run build
cp -r dist/* ../wangzhai-blog/my-blog/public/chess/analysis/
```

## 非目标
- 不保持 Python 搜索后端
- 不在 wangzhai-blog 内运行服务端进程
- 不修改 wangzhai-blog 现有路由结构
- 不需要数据库
