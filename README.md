# ChessExplain & Whitebox Engine Lab

> 国际象棋引擎招法解释与评估系统 暨 清华大学《人工智能导论》搜索树评测分析平台

本项目包含两个主要阶段的工作：
1. **Phase 1 (根目录 `backend/` & `frontend/`)**：基于 Stockfish 引擎与大模型（DeepSeek）的国际象棋对局复盘、 Centipawn Loss 评估与自然语言教练系统。
2. **Phase 2 (子目录 `phase2_research/`)**：针对高校《人工智能导论》课程大作业开发的**白盒引擎可视化测试平台**。采用纯 Python 实现的 Alpha-Beta 剪枝与蒙特卡洛树搜索（MCTS），并在前端直观渲染可交互的搜索树（ECharts Treeviz），同时内置离线性能数据评测与图表生成脚本。

---

## 目录结构

```text
ChessExplain/
├── README.md               # 项目总览
├── .gitignore              # Git忽略文件配置
├── backend/                # Phase 1: 复杂分析后端 (Python/FastAPI)
├── frontend/               # Phase 1: 复杂分析前端 (React/TypeScript)
└── phase2_research/        # Phase 2: 白盒引擎与搜索树评测可视化 (清华 AI 大作业)
    ├── backend/            
    │   ├── app/engines/    # 纯 Python 实现的 Alpha-Beta & MCTS 引擎
    │   └── scripts/        # 离线 Benchmark 与 Matplotlib 图表生成脚本
    └── frontend/           
        └── src/components/Whitebox/ # ECharts 搜索决策树前端渲染组件
```

---

## 核心功能介绍

### Phase 2: 白盒引擎与可视化搜索树 (推荐)
专为《人工智能导论》实验报告设计，抛弃黑盒的 C++ 引擎，使用纯 Python 教学引擎追踪搜索过程：
- **搜索树追踪**：详细记录每一次深度展开（Max/Min 层）与节点值（Eval）。
- **Alpha-Beta 剪枝可视化**：红线高亮被剪枝的分支（Pruned nodes）。
- **MCTS 可视化**：根据访问次数（Visits）放大节点气泡，红黄绿展示胜率估值。
- **可交互调参**：在网页端直接调整搜索深度（Depth）、启用 MVV-LVA 启发式排序，或调整 MCTS 迭代次数与探索常数（c）。

### Phase 1: 国际象棋战术复盘教练
- **引擎招法意图分析**：自然语言解释 (LLM)，战术/战略概念标记。
- **人类招法合理性评估**：Best/Excellent/Good/Mistake/Blunder 分级。
- **棋局精确度分析**：基于 Centipawn Loss 的准确率总分打分系统。

---

## 快速运行指南 (Phase 2 - 教学白盒引擎)

> 确保你已经安装了 **Python 3.9+** 和 **Node.js**。

### 1. 启动后端 (Python/FastAPI)
```bash
cd phase2_research/backend
python -m venv venv

# Windows 下激活虚拟环境:
.\venv\Scripts\activate
# Mac/Linux 下激活虚拟环境:
# source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务 (运行于 8000 端口)
uvicorn app.main:app --reload --port 8000
```

### 2. 启动前端 (React/Vite)
打开一个**新的终端窗口**：
```bash
cd phase2_research/frontend

# 安装依赖
npm install

# 启动网页端 (运行于 5173 或 5180 端口)
npm run dev
```
启动成功后，点击控制台给出的 `http://localhost:5173` 链接即可在浏览器中体验。

### 3. 生成离线实验报告图表 (可选)
如果需要生成用于学术报告的统计图表：
```bash
cd phase2_research/backend
# 确保在已激活的 venv 下运行
python scripts/benchmark_runner.py  # 运行离线跑分
python scripts/generate_plots.py    # 使用 Matplotlib 生成对比图
```
图片将保存在 `phase2_research/backend/plots/` 目录下。

---

## 许可证
MIT License