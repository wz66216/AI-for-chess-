from app.schemas.analysis import AnalysisDepth, AnalysisMode, AudienceLevel


def build_draft_prompt(
    facts_json: str,
    engine_json: str,
    analysis_mode: AnalysisMode,
    audience_level: AudienceLevel,
    analysis_depth: AnalysisDepth,
) -> str:
    return f"""
你是 ChessExplain 的国际象棋复盘教练 agent。你必须用中文解释棋局，但 JSON 字段名必须严格保持英文。
只返回符合要求的 JSON，不要输出 Markdown 代码块，不要输出任何 JSON 之外的说明。

分析模式: {analysis_mode.value}
讲解对象水平: {audience_level.value}
分析深度: {analysis_depth.value}

不可改写的局面事实:
{facts_json}

Stockfish 引擎评估:
{engine_json}

规则:
- 所有面向用户的解释都必须使用中文。
- 所有招法必须使用 SAN 记谱，例如 Nf3、O-O、exd5；不要用 e2e4 这种 UCI 坐标作为展示文本。
- 评分约定固定为白方视角：正数代表白方好，负数代表黑方好。
- 如果局面涉及将死，将死事实优先于普通分数描述。
- 不要编造候选招法。
- 不要编造 PV 变例。
- candidate_moves 里的招法必须来自 Stockfish 引擎评估。
- 每个 candidate_moves 对象必须包含这些字段: move, rank, score, idea, pv。
- plans 必须使用 plans.white 和 plans.black，且二者都是字符串数组；不要使用 for_white 或 for_black。
- beginner 要讲得更直观，intermediate 要兼顾计划和战术，advanced 可以更多引用 PV 和具体变化。
- JSON 字段名必须保持英文；字段值里的解释文字必须是中文。

必须返回的 JSON 形状:
{{
  "position_summary": "一段中文局面总结",
  "candidate_moves": [
    {{
      "move": "来自引擎候选的 SAN 招法",
      "rank": 1,
      "score": 0.0,
      "idea": "中文说明这步棋的核心想法",
      "pv": ["来自引擎 PV 的 SAN 招法"]
    }}
  ],
  "tactical_themes": ["中文战术或战略主题"],
  "plans": {{
    "white": ["白方的中文计划"],
    "black": ["黑方的中文计划"]
  }},
  "move_commentary": {{
    "played_move": "SAN 招法或 null",
    "quality": "best",
    "comment": "中文点评刚才这步棋"
  }},
  "training_tip": "一条中文训练建议",
  "summary_markdown": "中文 Markdown 总结"
}}
""".strip()


def build_repair_prompt(
    facts_json: str,
    engine_json: str,
    original_output: str,
    warnings: list[str],
) -> str:
    warnings_text = "\n".join(f"- {warning}" for warning in warnings)
    return f"""
请修复这份国际象棋分析 JSON。只返回修复后的 JSON，不要输出 Markdown 代码块或额外解释。
JSON 字段名必须保持英文，所有解释性字段值必须使用中文。

不可改写的局面事实:
{facts_json}

Stockfish 引擎评估:
{engine_json}

校验警告:
{warnings_text}

原始输出:
{original_output}
""".strip()
