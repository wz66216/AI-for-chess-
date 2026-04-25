# ChessExplain Frontend

**前端 Web 应用**

---

## 技术栈

- React 18+
- TypeScript
- Vite (构建工具)
- Tailwind CSS (样式)
- React Query (数据获取)
- Zustand (状态管理)
- react-chessboard (棋盘组件)
- Recharts (图表)

---

## 安装

```bash
# 安装依赖
npm install

# 或使用 pnpm
pnpm install
```

---

## 目录结构

```
frontend/
├── src/
│   ├── main.tsx           # 入口文件
│   ├── App.tsx            # 主应用
│   ├── index.css          # 全局样式
│   ├── components/        # React 组件
│   │   ├── ChessBoard/    # 棋盘相关
│   │   ├── Analysis/      # 分析相关
│   │   ├── Review/        # 复盘相关
│   │   └── Explanation/   # 解释相关
│   ├── hooks/             # 自定义 Hooks
│   │   ├── useAnalysis.ts
│   │   ├── useGameReview.ts
│   │   └── useLLM.ts
│   ├── services/          # API 服务
│   │   ├── api.ts
│   │   └── chess.ts
│   ├── stores/            # 状态管理
│   │   └── gameStore.ts
│   ├── types/             # TypeScript 类型
│   │   └── chess.ts
│   ├── utils/             # 工具函数
│   │   └── evaluation.ts
│   └── pages/             # 页面组件
│       ├── Home.tsx
│       ├── Analysis.tsx
│       └── Review.tsx
├── public/                # 静态资源
├── tests/                 # 测试
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 开发

```bash
# 启动开发服务器
npm run dev

# 类型检查
npm run type-check

# 代码格式化
npm run format

# 代码检查
npm run lint

# 构建生产版本
npm run build
```

---

## 主要组件

### ChessBoard

棋盘可视化组件，支持走法输入和局面展示。

```tsx
import { ChessBoard } from './components/ChessBoard';

<ChessBoard
  fen="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
  onMove={handleMove}
  orientation="black"
  highlightedSquares={highlightedSquares}
/>
```

### AnalysisPanel

引擎分析结果显示面板。

```tsx
import { AnalysisPanel } from './components/Analysis';

<AnalysisPanel
  evaluation={+1.2}
  depth={20}
  pv={['Nf3', 'Nc6', 'Bb5']}
  onMoveSelect={handlePvClick}
/>
```

### GameReview

棋局复盘组件，包含步进控制和胜率曲线。

```tsx
import { GameReview } from './components/Review';

<GameReview
  moves={gameMoves}
  analysis={analysis}
  onMoveClick={handleMoveClick}
  currentMoveIndex={currentIndex}
/>
```

### ExplanationCard

LLM 解释显示卡片。

```tsx
import { ExplanationCard } from './components/Explanation';

<ExplanationCard
  explanation="这个走法控制了中心..."
  concepts={['中心控制', '空间优势']}
/>
```

---

## API 集成

```typescript
// services/api.ts
const API_BASE = 'http://localhost:8000/api';

export const api = {
  games: {
    list: () => fetch(`${API_BASE}/games`).then(r => r.json()),
    create: (pgn: string) => fetch(`${API_BASE}/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pgn })
    }).then(r => r.json()),
    get: (id: string) => fetch(`${API_BASE}/games/${id}`).then(r => r.json()),
    delete: (id: string) => fetch(`${API_BASE}/games/${id}`, { method: 'DELETE' }),
  },
  analysis: {
    run: (id: string, depth: number) => fetch(`${API_BASE}/games/${id}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depth })
    }).then(r => r.json()),
    review: (id: string) => fetch(`${API_BASE}/games/${id}/review`).then(r => r.json()),
  },
  explain: {
    move: (data: MoveExplainRequest) => fetch(`${API_BASE}/explain/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  }
};
```

---

## 状态管理

```typescript
// stores/gameStore.ts
import { create } from 'zustand';

interface GameState {
  currentGame: Game | null;
  analysis: Analysis | null;
  currentMoveIndex: number;
  setCurrentGame: (game: Game) => void;
  setAnalysis: (analysis: Analysis) => void;
  goToMove: (index: number) => void;
  nextMove: () => void;
  prevMove: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentGame: null,
  analysis: null,
  currentMoveIndex: -1,
  setCurrentGame: (game) => set({ currentGame: game }),
  setAnalysis: (analysis) => set({ analysis }),
  goToMove: (index) => set({ currentMoveIndex: index }),
  nextMove: () => set((state) => ({
    currentMoveIndex: Math.min(state.currentMoveIndex + 1, state.currentGame?.moves.length || 0)
  })),
  prevMove: () => set((state) => ({
    currentMoveIndex: Math.max(state.currentMoveIndex - 1, -1)
  })),
}));
```

---

## 环境变量

```env
VITE_API_URL=http://localhost:8000/api
```

---

## 部署

```bash
# 构建
npm run build

# 构建产物在 dist/ 目录
# 可以部署到 Vercel、Netlify 或任何静态托管服务

# 或者配合后端一起运行
```