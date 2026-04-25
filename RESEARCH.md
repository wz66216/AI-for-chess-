# ChessExplain - 调研资料汇总

**收集日期**: 2026-04-24

---

## 1. 竞品分析

### 1.1 商业/成熟工具

| 工具 | 平台 | 特点 |
|------|------|------|
| **Chess.com** | Web | 集成分析，CAPS2准确率系统，免费有限制 |
| **Lichess** | Web (开源) | 完全免费，云端Stockfish，开局库 |
| **ChessBase** | 桌面 | 最强数据库，视频集成，高级引擎选项 |
| **chess.rodeo** | Web | Chess.com+Lichess优点结合，免费功能丰富 |

### 1.2 开源项目

| 项目 | 语言 | 功能 |
|------|------|------|
| [EZ-Chess](https://github.com/AnubhavChoudhery/EZ-Chess) | Python | Stockfish + LLM 解释 |
| [chess-coach](https://github.com/qam4/chess-coach) | Python | 引擎分析 + LLM 解释 |
| [LLM-ChessCoach](https://github.com/ai-chess-training/LLM-ChessCoach) | Python | LLM教练，逐招分析 |
| [thinkfish](https://github.com/ronaldsuwandi/thinkfish) | JS | Stockfish + LLM 实验 |
| [chess-sandbox](https://github.com/pilipolio/chess-sandbox) | Python | 概念检测象棋评论 |
| [explainable-chess-engine](https://github.com/dechantoine/explainable-chess-engine) | Python | 深度学习可解释引擎 |

---

## 2. 核心技术研究

### 2.1 招法分类标准

**Chess.com 分类 (基于期望胜率损失)**:

| 分类 | 符号 | 期望胜率损失 |
|------|------|-------------|
| Best | ★ | 0.00 |
| Excellent | - | 0.00-0.02 |
| Good | ✓ | 0.02-0.05 |
| Inaccuracy | ?! | 0.05-0.10 |
| Mistake | ? | 0.10-0.20 |
| Blunder | ?? | 0.20+ |

**Brilliant/ Great 特殊分类**:
- **Brilliant (!!)**: 正确的弃子，通常是在好位置
- **Great (!)**: 关键步，在压力下唯一正确的走法

### 2.2 准确率计算

**Lichess/chess.rodeo 公式**:
```python
# 胜率转换
Win% = 50 + 50 * (2 / (1 + exp(-0.00368208 * centipawns)) - 1)

# 准确率
Accuracy = 103.1668 * exp(-0.04354 * (Win% lost per move)) - 3.1669
```

**按等级准确率参考**:
| 等级 | 准确率范围 |
|------|-----------|
| 初学者 (<1000) | 50-70% |
| 中级 (1000-1400) | 65-80% |
| 高级 (1400-1800) | 75-85% |
| 专家 (1800-2200) | 80-90% |
| 大师 (2200+) | 85-95% |
| 特级大师 | 90-98% |

### 2.3 LLM 解释方法

**关键发现**:
1. **FEN 上下文很重要**: 提供走棋前后的FEN状态可减少LLM幻觉
2. **模型选择**: GPT-4o 表现最好，4o-mini 一致性较差
3. **Prompt 工程**: 示例 + 上下文重建是关键

**推荐 Prompt 结构**:
```
分析这个象棋局面:
FEN (前): {before_fen}
走法: {move}
FEN (后): {after_fen}
当前评估: {engine_eval}

请用自然语言解释这个走法的战略意图。
```

---

## 3. 学术研究

### 3.1 关键论文

| 论文 | 年份 | 方法 |
|------|------|------|
| **Information-based explanation methods for DL agents** (Nature) | 2024 | 概念检测 |
| **Towards Piece-by-Piece Explanations with SHAP** (arXiv) | 2024 | SHAP特征归因 |
| **CARLSy: Chess Annotation and Recommendation** (OpenReview) | 2025 | LLM象棋评论 |
| **ChessQA: LLM Chess Benchmark** (arXiv) | 2025 | 5维度评估 |
| **Master Distillation** (arXiv) | 2026 | 专家系统推理蒸馏 |
| **CoSMIC: Cognitive Chess System** (arXiv) | 2024 | 引擎+LLM+向量数据库 |

### 3.2 核心技术

**概念检测 (Concept Detection)**:
- 从神经网络激活中提取人类可理解概念
- 用于标记战术/战略主题

**SHAP 归因**:
- 将棋子作为特征，计算其对评估的贡献
- 可视化每个棋子的重要性

**概念标记类别**:
- **战术**: 牵制、闪击、引入、击双、将军、捉双、弃子等
- **战略**: 中心控制、空间优势、王安全、子力兑换等

---

## 4. 技术栈推荐

### 4.1 前端

| 技术 | 推荐 | 备选 |
|------|------|------|
| 框架 | React 18+ | Vue, Svelte |
| 语言 | TypeScript | JavaScript |
| 棋盘库 | react-chessboard | chessboard.js |
| 图表库 | Chart.js / Recharts |  |
| UI框架 | Tailwind CSS | Chakra UI |
| 状态管理 | Zustand | Redux |

### 4.2 后端

| 技术 | 推荐 | 备选 |
|------|------|------|
| 框架 | FastAPI | Flask |
| 语言 | Python 3.11+ |  |
| 象棋库 | python-chess | |
| ORM | SQLAlchemy | |
| LLM | Claude API | OpenAI API |

### 4.3 引擎

| 引擎 | 用途 | 协议 |
|------|------|------|
| Stockfish | 主要分析 | UCI |
| LC0 (Leela) | 概念检测 | UCI |

---

## 5. 相关资源

### 5.1 象棋库

- [python-chess](https://python-chess.readthedocs.io/) - Python 象棋库
- [chess.js](https://github.com/jhlywa/chess.js) - JavaScript 象棋库
- [chessground](https://github.com/jhlywa/chessground) - 棋盘UI

### 5.2 API/SDK

- [Stockfish.js](https://github.com/nmrugg/stockfish.js/) - Stockfish WASM
- [Stockfish.js (Node)](https://github.com/nmrugg/stockfish.js/) - Node.js 版本

### 5.3 数据集

- [Kaggle Lichess Dataset](https://www.kaggle.com/datasets) - 棋局数据
- [Lichess Database](https://database.lichess.org/) - PGN下载

### 5.4 学习资源

- [UCI Protocol Specification](https://backscattering.de/chess/uci/) - UCI协议文档
- [PGN Specification](http://www.saremba.de/chessgamedefn7.htm) - PGN格式

---

## 6. 风险与注意事项

### 6.1 技术风险

| 风险 | 缓解措施 |
|------|----------|
| LLM 幻觉 | FEN上下文，验证引擎分析 |
| 引擎性能 | 多线程，分析深度配置 |
| 响应延迟 | 异步处理，缓存结果 |

### 6.2 数据安全

- 本地运行，数据不离开用户机器
- LLM API 密钥需要安全存储
- 用户棋局数据隐私保护

### 6.3 兼容性问题

- 不同浏览器兼容性测试
- 移动端适配
- Windows/Mac/Linux 跨平台