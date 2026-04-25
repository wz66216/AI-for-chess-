# ChessExplain

> 国际象棋引擎招法解释与棋局分析平台

## 项目结构

```
ChessExplain/
├── README.md              # 项目总览
├── IMPLEMENTATION_PLAN.md # 实施计划
├── RESEARCH.md            # 调研资料
├── backend/               # 后端服务
│   ├── README.md
│   ├── requirements.txt
│   └── .env.example
└── frontend/              # 前端应用
    ├── README.md
    └── package.json
```

## 快速开始

### 1. 安装后端依赖

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 安装前端依赖

```bash
cd ../frontend
npm install
```

### 3. 下载 Stockfish

从 [stockfishchess.org](https://stockfishchess.org/download/) 下载并解压到 `backend/engines/` 目录

### 4. 配置环境变量

```bash
# backend/.env
OPENAI_API_KEY=your-api-key
STOCKFISH_PATH=engines/stockfish.exe
```

### 5. 运行

```bash
# 终端1: 后端
cd backend
uvicorn app.main:app --reload --port 8000

# 终端2: 前端
cd frontend
npm run dev
```

## 访问

- 前端: http://localhost:5173
- API文档: http://localhost:8000/docs

## 核心功能

- [ ] 棋局导入 (PGN/FEN)
- [ ] Stockfish 引擎分析
- [ ] 招法分类与准确率评估
- [ ] 棋局复盘与胜率曲线
- [ ] LLM 自然语言解释

## 技术栈

| 组件 | 技术 |
|------|------|
| 前端 | React + TypeScript + Vite |
| 后端 | Python + FastAPI |
| 引擎 | Stockfish (UCI) |
| LLM | Claude / GPT-4 |
| 数据库 | SQLite |

## 许可

MIT License