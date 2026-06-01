# ChessExplain 部署到 wangzhai-blog 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 ChessExplain（分析页 + 搜索实验室）部署到 wangzhai-blog 静态站点，搜索引擎移植到浏览器 Web Worker，分析页后端部署到 Railway。

**Architecture:** 前端构建为静态文件放入 wangzhai-blog `public/` 目录；搜索引擎从 Python 移植为 TypeScript Web Worker (chess.js)；分析页后端保持 Python 部署到 Railway；开局库代理部署为 Cloudflare Worker。

**Tech Stack:** TypeScript, chess.js, Vite, Web Workers, Astro 5, Cloudflare Pages, Railway, Cloudflare Workers

---

## 文件结构

### 搜索实验室引擎移植 (ChessExplain repo)
| 文件 | 操作 |
|------|------|
| `phase2_research/frontend/src/engine/types.ts` | 新建 — 引擎类型定义 |
| `phase2_research/frontend/src/engine/evaluators.ts` | 新建 — Material/PST/Heuristic 评估器 |
| `phase2_research/frontend/src/engine/alphabeta.ts` | 新建 — Alpha-Beta Worker |
| `phase2_research/frontend/src/engine/mcts.ts` | 新建 — MCTS Worker |
| `phase2_research/frontend/src/engine/engine.worker.ts` | 新建 — Worker 入口 |
| `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.tsx` | 修改 — 替换 runWhiteboxSearch 为 Worker 调用 |
| `phase2_research/frontend/src/api/whitebox.ts` | 修改 — 添加 Worker 通信封装 |

### 前端部署 (wangzhai-blog repo)
| 文件 | 操作 |
|------|------|
| `my-blog/public/chesslab/` | 新建 — 搜索实验室构建输出 |
| `my-blog/public/chess/analysis/` | 新建 — 分析页构建输出 |
| `my-blog/src/components/Sidebar.astro` | 修改 — 添加导航链接 |
| `my-blog/astro.config.mjs` | 修改 — 添加 worker 文件 MIME 配置 |

### 后端部署 (Railway)
| 文件 | 操作 |
|------|------|
| `phase2_research/backend/Procfile` | 新建 — Railway 启动命令 |
| `phase2_research/backend/railway.json` | 新建 — Railway 配置 |
| `phase2_research/backend/runtime.txt` | 新建 — Python 版本 |

### 开局库代理 (Cloudflare Workers)
| 文件 | 操作 |
|------|------|
| `workers/lichess-proxy/src/index.js` | 新建 — Worker 代码 |
| `workers/lichess-proxy/wrangler.toml` | 新建 — Worker 配置 |

---

### Task 1: TypeScript 搜索引擎 Worker

**Files:**
- Create: `phase2_research/frontend/src/engine/types.ts`
- Create: `phase2_research/frontend/src/engine/evaluators.ts`
- Create: `phase2_research/frontend/src/engine/alphabeta.ts`
- Create: `phase2_research/frontend/src/engine/mcts.ts`
- Create: `phase2_research/frontend/src/engine/engine.worker.ts`

**Step 1:** 创建类型定义

```typescript
// types.ts
export type EvaluatorName = "material" | "pst" | "heuristic";

export interface SearchConfig {
  engine: "alphabeta" | "mcts";
  evaluator: EvaluatorName;
  depth: number;
  useMoveOrdering: boolean;
  mctsIterations: number;
  mctsExplorationConstant: number;
}

export interface Candidate {
  move: string;
  evaluation: number;
  nodes: number;
}

export interface SearchResult {
  best_move: string | null;
  evaluation: number;
  nodes_evaluated: number;
  nps: number;
  time_ms: number;
  tree: TreeNode;
  candidates: Candidate[];
}

export interface TreeNode {
  id: string;
  name: string;
  value: number | null;
  node_type: string;
  is_pruned: boolean;
  metadata: Record<string, unknown>;
  children: TreeNode[];
}
```

**Step 2:** 创建评估器

```typescript
// evaluators.ts (简化，直接移植 Python 逻辑)
import { Chess } from "chess.js";

const PIECE_VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

export function materialScore(board: Chess): number {
  let score = 0;
  const fen = board.fen().split(" ")[0];
  for (const ch of fen) {
    if (ch in PIECE_VALUES) {
      score += ch === ch.toUpperCase() ? PIECE_VALUES[ch.toLowerCase()] : -PIECE_VALUES[ch];
    }
  }
  return score;
}

// PST 和 heuristic 评估器类似移植 Python 版本
// (为简洁此处省略完整代码，实际实现需完整移植 phase2_research/backend/app/engines/whitebox/evaluators.py)
```

**Step 3:** 创建 Alpha-Beta Worker

```typescript
// alphabeta.ts
import { Chess, Move } from "chess.js";
import { SearchConfig, SearchResult, TreeNode, Candidate } from "./types";
import { materialScore } from "./evaluators";

function generateUUID(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export function alphabetaSearch(fen: string, config: SearchConfig): SearchResult {
  const board = new Chess(fen);
  const startTime = performance.now();
  let nodesEvaluated = 0;

  function evaluate(b: Chess): number {
    nodesEvaluated++;
    return materialScore(b); // 简化版，实际用 config.evaluator 选择
  }

  function orderMoves(moves: Move[]): Move[] {
    if (!config.useMoveOrdering) return moves;
    return [...moves].sort((a, b) => {
      const sa = board.isCapture(a) ? 1000 : 0;
      const sb = board.isCapture(b) ? 1000 : 0;
      return sb - sa;
    });
  }

  function alphabeta(
    b: Chess,
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean,
    parentNode: TreeNode
  ): [number, Move | null] {
    if (depth === 0 || b.isGameOver()) {
      const val = evaluate(b);
      parentNode.value = val;
      return [val, null];
    }

    const moves = orderMoves([...b.moves({ verbose: true })] as unknown as Move[]);
    let bestMove: Move | null = null;

    if (maximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const child: TreeNode = { id: generateUUID(), name: move.san, value: null, node_type: "max", is_pruned: false, metadata: {}, children: [] };
        parentNode.children.push(child);
        b.move(move.san);
        const [evalVal] = alphabeta(b, depth - 1, alpha, beta, false, child);
        b.undo();
        child.value = evalVal;
        if (evalVal > maxEval) { maxEval = evalVal; bestMove = move; }
        alpha = Math.max(alpha, evalVal);
        if (beta <= alpha) { parentNode.children.push({ id: generateUUID(), name: "Pruned", value: null, node_type: "pruned", is_pruned: true, metadata: {}, children: [] }); break; }
      }
      parentNode.value = maxEval;
      return [maxEval, bestMove];
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const child: TreeNode = { id: generateUUID(), name: move.san, value: null, node_type: "min", is_pruned: false, metadata: {}, children: [] };
        parentNode.children.push(child);
        b.move(move.san);
        const [evalVal] = alphabeta(b, depth - 1, alpha, beta, true, child);
        b.undo();
        child.value = evalVal;
        if (evalVal < minEval) { minEval = evalVal; bestMove = move; }
        beta = Math.min(beta, evalVal);
        if (beta <= alpha) { parentNode.children.push({ id: generateUUID(), name: "Pruned", value: null, node_type: "pruned", is_pruned: true, metadata: {}, children: [] }); break; }
      }
      parentNode.value = minEval;
      return [minEval, bestMove];
    }
  }

  const root: TreeNode = { id: "root", name: "ROOT", value: null, node_type: "root", is_pruned: false, metadata: {}, children: [] };
  const [bestVal, bestMove] = alphabeta(board, config.depth, -Infinity, Infinity, board.turn() === "w", root);

  const duration = performance.now() - startTime;

  const candidates: Candidate[] = root.children
    .filter(c => !c.is_pruned && c.value !== null)
    .map(c => ({ move: c.name, evaluation: c.value ?? 0, nodes: 0 }))
    .sort((a, b) => Math.abs(b.evaluation) - Math.abs(a.evaluation))
    .slice(0, 3);

  return {
    best_move: bestMove?.san ?? null,
    evaluation: bestVal,
    nodes_evaluated: nodesEvaluated,
    nps: Math.round(nodesEvaluated / (duration / 1000)),
    time_ms: Math.round(duration),
    tree: root,
    candidates,
  };
}
```

**Step 4:** 创建 Worker 入口

```typescript
// engine.worker.ts
import { alphabetaSearch } from "./alphabeta";
import { SearchConfig } from "./types";

self.onmessage = (e: MessageEvent<{ fen: string; config: SearchConfig }>) => {
  const { fen, config } = e.data;
  try {
    const result = config.engine === "alphabeta"
      ? alphabetaSearch(fen, config)
      : alphabetaSearch(fen, config); // MCTS to be added later
    self.postMessage({ type: "result", result });
  } catch (err) {
    self.postMessage({ type: "error", error: String(err) });
  }
};
```

**Step 5:** 验证

```bash
cd phase2_research/frontend
npm run type-check
# 手动测试 Worker 加载
```

---

### Task 2: 修改 SearchWorkbench 使用 Worker

**Files:**
- Modify: `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.tsx`
- Modify: `phase2_research/frontend/src/api/whitebox.ts`

**Step 1:** 修改 whitebox.ts 为 Worker 封装

```typescript
// whitebox.ts — 改为 Worker 调用
import type { SearchConfig } from "../types/whitebox";
import type { SearchResult } from "../engine/types";

const worker = new Worker(new URL("../engine/engine.worker.ts", import.meta.url), { type: "module" });

export function runSearch(
  fen: string,
  config: SearchConfig
): Promise<SearchResult> {
  return new Promise((resolve, reject) => {
    const handler = (e: MessageEvent) => {
      worker.removeEventListener("message", handler);
      if (e.data.type === "result") resolve(e.data.result);
      else reject(new Error(e.data.error));
    };
    worker.addEventListener("message", handler);
    worker.postMessage({ fen, config });
  });
}
```

**Step 2:** 修改 SearchWorkbench.tsx 的 import

```typescript
// 将:
import { runWhiteboxSearch } from "../../api/whitebox";
// 改为:
import { runSearch } from "../../api/whitebox";

// 将 runWhiteboxSearch(fen, config) 改为 runSearch(fen, config)
```

**Step 3:** 验证

```bash
npm run type-check
npm test -- SearchWorkbench.test.tsx
```

---

### Task 3: 构建并部署前端到 wangzhai-blog

**Files:**
- Modify: `E:\计算机\wangzhai-blog\my-blog\src\components\Sidebar.astro`
- Modify: `E:\计算机\wangzhai-blog\my-blog\astro.config.mjs`

**Step 1:** 构建搜索实验室

```bash
cd phase2_research/frontend
npm run build
# 输出在 dist/
```

**Step 2:** 复制到 wangzhai-blog

```powershell
Copy-Item -Recurse "C:\Users\15096\Desktop\ChessExplain\phase2_research\frontend\dist\*" "E:\计算机\wangzhai-blog\my-blog\public\chesslab\" -Force
```

**Step 3:** 在 Sidebar.astro 添加导航链接

在侧边栏最上方 (logo 附近) 添加：
```astro
<div class="chess-links">
  <a href="/chess/analysis/" class="chess-link">♜ 国际象棋分析</a>
  <a href="/chesslab/" class="chess-link">♟ 搜索实验室</a>
</div>
```

**Step 4:** 验证 wangzhai-blog 构建

```bash
cd E:\计算机\wangzhai-blog\my-blog
npm run build
# 检查输出是否包含 chesslab/ 和 chess/analysis/ 目录
```

---

### Task 4: Railway 部署分析页后端

**Files:**
- Create: `phase2_research/backend/Procfile`
- Create: `phase2_research/backend/railway.json`
- Create: `phase2_research/backend/runtime.txt`

**Step 1:** 创建 Railway 配置文件

```
# Procfile
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

```
# runtime.txt
python-3.11
```

```json
// railway.json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Step 2:** 部署到 Railway

```bash
cd phase2_research/backend
railway login
railway init
railway up
# 记录分配的域名 (如 chess-backend.railway.app)
```

**Step 3:** 配置环境变量

在 Railway Dashboard 设置：
- `STOCKFISH_PATH=/usr/games/stockfish`
- `LLM_API_KEY=...`
- `LICHESS_API_TOKEN=lip_...`

---

### Task 5: Cloudflare Worker 开局库代理

**Files:**
- Create: `workers/lichess-proxy/src/index.js`
- Create: `workers/lichess-proxy/wrangler.toml`

**Step 1:** Worker 代码

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const fen = url.searchParams.get("fen");
    if (!fen) return new Response("missing fen", { status: 400 });

    const lichessResp = await fetch(
      `https://explorer.lichess.org/masters?fen=${encodeURIComponent(fen)}&moves=10`,
      { headers: { Authorization: `Bearer ${LICHESS_TOKEN}`, "User-Agent": "ChessExplain/1.0" } }
    );
    const data = await lichessResp.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  },
};
```

**Step 2:** 部署

```bash
npx wrangler deploy
```

**Step 3:** 修改分析页前端 API URL

将 `http://localhost:8000/api/v1/opening-book` 改为 Worker URL。

---

### Task 6: 全量验证

- [ ] wangzhai-blog `npm run build` 成功
- [ ] 搜索实验室页面可访问：`/chesslab/`
- [ ] 分析页可访问：`/chess/analysis/`
- [ ] Worker 引擎搜索返回结果
- [ ] Railway 后端 API 响应正常
- [ ] 开局库 Worker 返回数据
- [ ] 博客导航链接正确
- [ ] `git commit && git push` 两个仓库
