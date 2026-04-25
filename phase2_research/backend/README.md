# ChessExplain Backend

**后端 API 服务**

---

## 技术栈

- Python 3.11+
- FastAPI
- python-chess
- SQLAlchemy
- Stockfish (UCI引擎)

---

## 安装

```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
.\venv\Scripts\activate   # Windows

# 安装依赖
pip install -r requirements.txt

# 下载 Stockfish
# 1. 从 https://stockfishchess.org/download/ 下载
# 2. 解压到 engines/ 目录
# 3. 确保 stockfish.exe 可执行
```

---

## 目录结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI 应用入口
│   ├── config.py         # 配置
│   ├── database.py       # 数据库连接
│   ├── routers/          # API 路由
│   │   ├── __init__.py
│   │   ├── games.py      # 棋局相关
│   │   ├── analysis.py   # 分析相关
│   │   └── llm.py        # LLM 相关
│   ├── services/         # 业务逻辑
│   │   ├── __init__.py
│   │   ├── engine.py     # Stockfish 引擎服务
│   │   ├── game.py       # 棋局服务
│   │   └── llm.py        # LLM 服务
│   ├── models/           # 数据模型
│   │   ├── __init__.py
│   │   ├── game.py
│   │   └── analysis.py
│   └── schemas/          # Pydantic 模型
│       ├── __init__.py
│       ├── game.py
│       └── analysis.py
├── engines/              # 引擎目录
│   └── stockfish.exe     # (需要手动下载)
├── tests/                # 测试
├── requirements.txt
└── .env.example          # 环境变量示例
```

---

## 环境变量 (.env)

```env
# LLM API
OPENAI_API_KEY=sk-...
# 或
ANTHROPIC_API_KEY=sk-ant-...

# Stockfish 路径
STOCKFISH_PATH=engines/stockfish.exe

# 数据库
DATABASE_URL=sqlite:///./chess_explain.db

# 服务器
HOST=0.0.0.0
PORT=8000
```

---

## 运行

```bash
# 开发模式
uvicorn app.main:app --reload --port 8000

# 生产模式
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## API 端点

### 棋局 (Games)

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/games` | POST | 创建棋局 (导入PGN) |
| `/api/games` | GET | 获取所有棋局 |
| `/api/games/{id}` | GET | 获取单个棋局 |
| `/api/games/{id}` | DELETE | 删除棋局 |

### 分析 (Analysis)

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/games/{id}/analyze` | POST | 运行引擎分析 |
| `/api/games/{id}/review` | GET | 获取复盘数据 |

### LLM 解释

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/explain/move` | POST | 解释单个走法 |
| `/api/explain/game` | POST | 解释整局棋 |
| `/api/concepts` | POST | 获取概念标记 |

### 引擎状态

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/engine/status` | GET | 引擎状态 |
| `/api/engine/depth` | GET | 当前分析深度 |

---

## 示例请求

### 导入棋局

```bash
curl -X POST http://localhost:8000/api/games \
  -H "Content-Type: application/json" \
  -d '{
    "pgn": "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7"
  }'
```

### 分析棋局

```bash
curl -X POST http://localhost:8000/api/games/1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "depth": 20,
    "multiPv": 3
  }'
```

### 解释走法

```bash
curl -X POST http://localhost:8000/api/explain/move \
  -H "Content-Type: application/json" \
  -d '{
    "fen_before": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "move": "e4",
    "fen_after": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    "engine_eval": 35
  }'
```

---

## 开发说明

### 添加新的路由

1. 在 `app/routers/` 创建路由文件
2. 定义 Pydantic schemas
3. 在 `main.py` 注册路由

### 添加新的服务

1. 在 `app/services/` 创建服务文件
2. 实现业务逻辑
3. 在路由中调用

### 测试

```bash
pytest tests/ -v
```