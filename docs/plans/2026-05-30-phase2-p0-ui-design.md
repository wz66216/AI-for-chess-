# Phase 2 P0 UI Design

## Goal

将当前 Phase 2 前端从“功能可运行的研究演示页”提升为“结构清晰、视觉统一、具备产品展示感的国际象棋分析工作台”。

本次 P0 聚焦四件事：

1. 优化整体视觉骨架与背景层次
2. 强化主分析链路的信息层级
3. 统一 loading / empty / error / unavailable 状态表达
4. 明确评分语义，并补充“下一步建议”模块

---

## Design Direction

本次设计方向已确认如下：

- **背景风格**：浅色棋盘 + 瑞士网格 + 克制黑白
- **白盒分析区优先级**：降一级，作为辅助实验区
- **整体气质**：偏科技感 / AI 引擎系统

一句话总结：

> **浅色棋盘瑞士网格骨架 + 科技感分析台气质 + 白盒实验区降级为辅助模块**

这意味着页面不会走成纯博客风，也不会走成重霓虹实验室风，而是保留国际象棋黑白秩序感，同时加入轻量的分析系统气质。

---

## Current Problems

基于当前实现，主要问题如下：

### 1. 背景与内容割裂

- 页面背景仍然是普通灰底
- Header、主体卡片、白盒区之间缺乏统一舞台感
- 无法体现国际象棋主题和参考设计中的几何秩序

### 2. 信息层级不够清晰

- 开局库、棋盘、引擎分析、教练解释、白盒区视觉权重过于接近
- 用户第一眼难以判断“主操作区”和“主结果区”
- 功能虽然很多，但不容易迅速理解主要闭环

### 3. 状态表达不统一

- 不同区块的 loading / empty / error 状态表达方式不一致
- 某些区域仍然偏“文本提示”，缺少统一产品化反馈

### 4. 评分语义不够显式

- 用户对评分来源、视角、正负意义容易误解
- 当前 UI 缺少足够直接的语义说明

### 5. 缺少行动导向信息

- 用户能看到多条引擎线和一大段解释
- 但“下一步该怎么走/该怎么理解”没有被提炼成简洁建议

---

## P0 Scope

本次 P0 仅处理前端可用性与展示质量问题，不进入大规模工程重构。

### Included

- 页面背景重构
- 主布局视觉层级重排
- 主分析链路表达优化
- 统一状态组件 / 状态样式
- 评分语义明确化
- “下一步建议”卡片设计
- 白盒区降级并重新组织版位

### Excluded

- 大规模拆分 `ChessGame.tsx`
- 引入新的全局状态管理方案
- 白盒算法逻辑升级
- 后端复杂 API 扩展
- 全量设计系统抽象

---

## Visual System

### 1. Background Layer

页面背景采用三层叠加：

#### Layer A: Light Chessboard Texture

- 白格：`#FCFCFB`
- 灰格：`#F3F4F6`
- 以极低对比度构成棋盘格底纹
- 不做强烈黑白对冲，只提供秩序感

#### Layer B: Swiss Grid Lines

- 在背景中叠加极淡网格线
- 体现参考仓库的 Swiss Grid 几何秩序
- 只作为结构辅助，不参与交互

#### Layer C: Soft Tech Glow

- 局部叠加非常轻的冷色辉光
- 偏蓝灰 / 冰蓝，不做霓虹风
- 用于建立“AI 分析系统”的技术气质

### 2. Color Strategy

#### Structural Colors

- 主背景：白 / 灰白
- 主文字：深黑 / 深灰
- 分割线：冷灰
- 卡片底：白色或半透明浅白

#### Accent Colors

- 科技强调：蓝灰 / 冰蓝
- 教练强调：少量琥珀金
- 警告 / unavailable：柔和橙红
- 正分 / 负分：保留已有绿 / 红逻辑，但更克制

### 3. Card Language

所有主要卡片统一如下：

- 统一圆角
- 统一边框厚度
- 统一阴影风格（弱阴影、非悬浮感）
- 减少杂乱配色
- 强调“几何边界清楚”而不是“每块都自成系统”

---

## Information Hierarchy

P0 将页面重组为三个层级。

### Level 1: Primary Interaction Zone

这是页面第一视觉中心，包含：

- 棋盘
- 当前走法状态
- 上一步 / 下一步 / 翻转 / 首选开局等操作
- 深度解析按钮
- 自动分析开关

设计目标：

- 用户一打开页面就知道“这里是主操作台”
- 走棋和触发分析的链路最短、最清楚

### Level 2: Primary Analysis Zone

这是页面第二视觉中心，包含两大主要输出：

#### A. 引擎评估卡

建议改名为：

> `局面评分（白方视角）`

并在标题附近直接说明：

- `评分基于走后局面`
- `正分表示白优，负分表示黑优`

#### B. AI 教练解读卡

保留当前解释区，但增加更强的摘要感：

- 标题保留教练语义
- 首屏可见位置加入摘要句
- 让用户先看到结论，再决定是否继续读长文

#### C. 新增“下一步建议”卡片

建议插入在引擎评估和教练解释之间，成为连接“数值结果”与“行动建议”的桥梁。

内容结构建议：

- 你的走法：`e4`
- 局面判断：`白方略优 (+0.33)`
- 推荐下一步 / 推荐应对
- 一句话建议

这个模块的目标是：

> 把“引擎数据”转化为“用户下一步行动建议”。

### Level 3: Secondary Analysis Zone

这些内容保留，但降级为辅助分析能力：

- Lichess 开局库
- 白盒搜索实验区
- PGN 整局分析入口

它们仍然重要，但不应该抢主分析闭环的视觉中心。

---

## Whitebox Section Strategy

本次已明确：白盒区在 P0 中**降一级**。

### Positioning

将白盒区定义为：

> `白盒搜索实验室`

副标题建议：

> `对比 Alpha-Beta 与 MCTS 的搜索行为`

### Visual Treatment

- 放在主分析区之后
- 边框更轻、背景更浅
- 保留科技感，但降低第一眼吸引力
- 让用户在完成主分析后自然下探，而不是一上来被实验区分散注意力

### Why

这样可以同时满足两件事：

- 页面整体更像“产品 demo”
- 白盒实验能力仍然保有课程 / 研究价值

---

## Status UX Unification

P0 需要统一四类状态：

- `loading`
- `empty`
- `error`
- `unavailable`
- `success`

### Target Sections

统一应用到：

- 开局库
- 引擎评估
- 教练解释
- 白盒实验

### Target Behavior

#### Opening Book

- 成功：显示 Lichess 谱招
- empty：显示当前局面暂无谱招
- unavailable：显示服务暂不可用，但仍可继续本地分析

#### Engine Analysis

- loading：明确告知正在进行 Multi-PV 分析
- success：显示多条候选线与语义化评分
- error：明确指出引擎未启动 / 失败，而不是仅控制台报错

#### Coach Panel

- loading：保留现有“深度思考”体验，但统一样式
- unavailable：提示“引擎已完成，但文字解释暂不可用”

#### Whitebox Panel

- idle：等待用户主动进入实验
- loading：明确实验正在运行
- success：显示结果摘要 + 树可视化
- error：参数或服务异常时显示具体提示

---

## Score Semantics

评分问题已被用户明确指出，因此在 P0 中需要显式表达。

### Required Semantics

- 显示的是**走后局面**评分
- 固定为**白方视角**
- 正分表示白优，负分表示黑优

### UI Expression

建议在引擎评估区中直接加入：

- 标题：`局面评分（白方视角）`
- 副说明：`正分表示白优，负分表示黑优`

可进一步为每条 PV 增加轻量标签：

- `白优`
- `黑优`
- `近均势`

这样用户不用猜测分数意义。

---

## Next-Step Suggestion Card

这是 P0 中一个高价值的新模块。

### Purpose

将复杂分析收敛为清晰建议。

### Suggested Structure

- 当前走法
- 局面判断
- 推荐续走 / 推荐应对
- 一句话说明

### Example

- 当前走法：`e4`
- 局面判断：`白方略优 (+0.33)`
- 若黑方应 `e5`，建议续走：`Nf3`
- 建议：`继续发展王翼马并保持中心压力`

### Value

这个模块会显著增强产品感，因为它提供了：

- 结论
- 行动
- 简洁指导

而不仅仅是“展示数据”和“长文解释”。

---

## File-Level Implementation Boundary

P0 优先建议只在以下文件内完成。

### Primary Files

- `phase2_research/frontend/src/App.tsx`
- `phase2_research/frontend/src/index.css`
- `phase2_research/frontend/src/components/Chessboard/ChessGame.tsx`
- `phase2_research/frontend/src/components/Whitebox/WhiteboxResultPanel.tsx`

### Possible Secondary Touches

- `phase2_research/frontend/src/components/Whitebox/WhiteboxControlPanel.tsx`
- `phase2_research/frontend/src/components/Whitebox/TreeVisualizer.tsx`

### Avoid in P0

- 拆分 `ChessGame.tsx`
- 引入新的设计 token 系统
- 大规模 hook 抽离
- 后端协议级改造

---

## Success Criteria

P0 完成后，应达到以下效果：

1. 页面整体呈现“国际象棋分析台”气质，而不是普通灰底卡片页
2. 用户一眼能看出主操作区、主结果区、辅助实验区的层级
3. 开局库 / 引擎 / 教练 / 白盒的状态反馈统一且产品化
4. 评分语义清晰，不再引起“分数来自哪里、正负表示什么”的困惑
5. 页面新增一个能指导用户行动的“下一步建议”模块
6. 白盒区仍保留价值，但不抢占主分析闭环的视觉焦点

---

## Next Step

若设计确认通过，下一步进入实施计划阶段：

- 将本设计拆解为具体前端任务
- 明确每个文件的修改范围
- 制定验证方式（type-check、build、浏览器验证）
