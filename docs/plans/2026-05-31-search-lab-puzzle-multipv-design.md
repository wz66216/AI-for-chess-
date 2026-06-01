# Search Lab Puzzle Import + Multi-PV Design

## 背景

Search Lab 已具备局面编辑器、α-β / MCTS 搜索、搜索树可视化与局面检查器。当前仅返回单一最佳着法，且用户需要手动输入 FEN。下一步增强：

1. **Lichess 谜题导入**：从 Lichess Puzzle API 获取随机谜题，一键加载到 Search Lab
2. **Multi-PV 多候选着法**：搜索返回 Top 3 候选着法及各自评分

## 非目标

- 不实现完整的谜题答题系统（不计分、不验证答案）
- 不实现谜题浏览/翻页/搜索
- 不改动前端路由结构
- 不改动棋盘编辑器的其他交互

---

## 1. Lichess 谜题导入

### API
Lichess 公开 API（无需认证）：
- `GET https://lichess.org/api/puzzle/daily` — 每日谜题
- `GET https://lichess.org/api/puzzle/activity` — 按评分范围批量（参数 `maxRating`）

响应格式：
```json
{
  "game": { "pgn": "...", "players": [...] },
  "puzzle": {
    "id": "tkHrC",
    "rating": 2167,
    "solution": ["c6g2", "f2g2", "e8e1", "c4f1", "e1f1"],
    "themes": ["deflection", "middlegame", "mateIn3", "sacrifice", "pin"],
    "fen": "4r1k1/pb3ppp/2q2b2/8/2B5/1P6/P1R2QPP/4B2K b - - 0 1",
    "lastMove": "c1c2"
  }
}
```

### 后端
新增 `/api/puzzle/import`（GET 端点）：
- 请求参数：`rating`（可选，默认不限制）
- 转发 Lichess API，返回 FEN + puzzle 元数据
- 不存储谜题数据到数据库

### 前端 UI
在 Search Lab 版面设置区下方新增"导入谜题"卡片：
- 评分范围滑块（800-3000，默认 1200-2500）
- "获取随机谜题"按钮
- 加载成功后显示谜题信息卡片（ID、评分、主题标签）
- 谜题 FEN 自动载入到局面编辑器棋盘
- 解法参考栏：显示谜题的正确答案序列（折叠/展开）

### 交互流程
1. 用户打开评分范围 → 点"获取随机谜题"
2. API 返回谜题数据 → FEN 载入棋盘
3. 用户调整搜索参数 → 点确认 → 引擎分析
4. 结果区顶部显示谜题正确答案 vs 引擎推荐对比

---

## 2. Multi-PV 多候选着法

### 后端 Alpha-Beta
在 `search()` 返回值中新增 `candidates` 字段：
```json
{
  "best_move": "e2e4",
  "evaluation": 0.12,
  "candidates": [
    { "move": "e2e4", "evaluation": 0.12, "nodes": 8471 },
    { "move": "d2d4", "evaluation": -0.05, "nodes": 7200 },
    { "move": "Ng1f3", "evaluation": -0.08, "nodes": 6900 }
  ]
}
```

实现：在根节点遍历时收集所有合法子节点的 eval，按 maximizing_player 排序取 Top-N（默认 N=3）。

### 后端 MCTS
取 `root.children` 按 visits 降序取 Top 3，组装为 candidates。

### 前端 UI
搜索结果区"最佳着法"卡片改为候选列表：
- 三行，每行：`#1 Nh3 [+0.00] ████████░░`
- 当前最佳着法加蓝色高亮边框
- 小条形图表示评估值相对差异

### 测试
- `npm test -- SearchWorkbench.test.tsx SearchResultSummary.test.tsx`
- 验证 candidates 字段存在时渲染 3 行候选
- 验证 candidates 字段不存在时降级为旧的单行显示

---

## 3. 文件范围

### 新增
- `phase2_research/backend/app/api/puzzle.py` — puzzle import API
- `phase2_research/frontend/src/components/SearchLab/PuzzleImporter.tsx` — 谜题导入 UI

### 修改
- `phase2_research/backend/app/engines/whitebox/minimax.py` — Multi-PV candidates
- `phase2_research/backend/app/engines/whitebox/mcts.py` — Multi-PV candidates
- `phase2_research/backend/app/schemas/whitebox.py` — 新增 candidate schema
- `phase2_research/frontend/src/components/SearchLab/SearchResultSummary.tsx` — 候选列表 UI
- `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.tsx` — 集成 PuzzleImporter
- `phase2_research/frontend/src/types/whitebox.ts` — 新增 Candidate 类型
- `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.test.tsx`
- `phase2_research/frontend/src/components/SearchLab/SearchResultSummary.test.tsx`

### 不动
- `phase2_research/frontend/src/api/whitebox.ts` — 请求形状保持（candidates 由后端自动返回）
- `PositionEditorPanel` 及以下所有编辑器组件
- `SearchTreeExplorer`、`PositionInspector`、`SearchRunHistory`
