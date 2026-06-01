# ChessExplain & Whitebox Engine Lab

> 国际象棋引擎招法解释与评估系统 暨 清华大学《人工智能导论》搜索树评测分析平台

本项目包含两个主要阶段的工作：
1. **Phase 1 (根目录 `backend/` & `frontend/`)**：基于 Stockfish 引擎与大模型（DeepSeek）的国际象棋对局复盘、Centipawn Loss 评估与自然语言教练系统。
2. **Phase 2 (子目录 `phase2_research/`)**：针对高校《人工智能导论》课程大作业开发的**白盒引擎可视化测试平台**。包含交互式棋盘局面编辑器、Alpha-Beta / MCTS 搜索对比、Multi-PV 多候选着法、Lichess 谜题导入、可交互 ECharts 搜索树可视化，以及离线性能评测与图表生成脚本。

---

## 目录结构

```text
ChessExplain/
├── README.md                    # 项目总览
├── .gitignore                   # Git 忽略文件配置
├── backend/                     # Phase 1: 复杂分析后端 (Python/FastAPI)
├── frontend/                    # Phase 1: 复杂分析前端 (React/TypeScript)
└── phase2_research/             # Phase 2: 白盒引擎与搜索树评测可视化
    ├── backend/
    │   ├── app/
    │   │   ├── api/             # whitebox 搜索 API + puzzle 谜题导入 API
    │   │   └── engines/whitebox/
    │   │       ├── minimax.py   # Alpha-Beta 剪枝引擎
    │   │       ├── mcts.py      # MCTS 蒙特卡洛树搜索引擎
    │   │       └── evaluators.py # 评估器 (Material / PST / Heuristic)
    │   └── scripts/             # 离线 Benchmark 与图表生成脚本
    └── frontend/
        └── src/
            ├── components/
            │   ├── SearchLab/   # 搜索实验室核心组件 (15+ 文件)
            │   │   ├── SearchWorkbench.tsx    # 主工作台：局面编辑 + 搜索分析
            │   │   ├── PositionEditorPanel.tsx # 局面编辑器 (棋盘拖拽/点击)
            │   │   ├── PuzzleImporter.tsx      # Lichess 谜题导入
            │   │   ├── SearchResultSummary.tsx  # 搜索结果摘要 + Multi-PV
            │   │   └── SearchTreeExplorer.tsx   # ECharts 搜索树可视化
            │   └── Whitebox/     # ECharts 决策树渲染组件
            ├── pages/SearchLabPage.tsx
            └── types/whitebox.ts
```

---

## 核心功能介绍

### Phase 2: 搜索实验室 Search Lab (🆕)
- **局面编辑器**：棋盘点击选子 → 合法着法圆点提示 → 点击完成着法。支持撤销、清空、标准开局、交换视角、12 枚棋子托盘
- **搜索对比**：Alpha-Beta 剪枝 vs MCTS 蒙特卡洛，可调深度/迭代/探索系数
- **Multi-PV 多候选着法**：搜索返回 Top 3 着法及评分柱状图
- **搜索树可视化**：ECharts 交互树，点击节点跳转棋盘，SAN 着法显示，剪枝分支高亮
- **Lichess 谜题导入**：从 Lichess 开放数据库流式解压 5.9M 谜题，按评分随机选题；支持每日谜题
- **跨页联动**：分析页一键"在搜索实验室中打开"携带当前 FEN

### Phase 1: 国际象棋战术复盘教练
- **引擎招法意图分析**：自然语言解释 (LLM)，战术/战略概念标记
- **人类招法合理性评估**：Best/Excellent/Good/Mistake/Blunder 分级
- **棋局精确度分析**：基于 Centipawn Loss 的准确率总分打分系统

---

## 快速运行指南 (Phase 2)

> 确保已安装 **Python 3.9+** 和 **Node.js 18+**。

### 1. 启动后端
```bash
cd phase2_research/backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 2. 启动前端
打开新终端：
```bash
cd phase2_research/frontend
npm install
npm run dev
```
访问 `http://localhost:5173` → 分析页，点击顶栏导航到 **搜索实验室**。

### 3. Lichess 谜题配置 (可选)
确保 `phase2_research/backend/.env` 中配置了 Lichess API Token：
```env
LICHESS_API_TOKEN=lip_xxxxxx
```
Token 可在 https://lichess.org/account/oauth/token 免费申请。

### 4. 运行测试
```bash
cd phase2_research/frontend
npm test        # 11 files, 37 tests
npm run lint    # ESLint
npm run build   # Vite production build
```

---

## 技术栈

| 层次 | 技术 |
|------|------|
| 后端框架 | FastAPI (Python) |
| 搜索引擎 | Alpha-Beta + MCTS (纯 Python) |
| 象棋库 | python-chess, chess.js |
| 前端框架 | React 18 + TypeScript |
| UI | Tailwind CSS |
| 棋盘 | react-chessboard |
| 可视化 | ECharts (echarts-for-react) |
| 数据压缩 | zstandard (Lichess DB) |
| 测试 | Vitest + Testing Library |

## 许可证
MIT License
