from pydantic import BaseModel
from typing import Optional, List

class AnalyzeMoveRequest(BaseModel):
    fen: str         # 当前局面
    move: str        # 玩家刚刚走出的招法，例如 "e2e4"

class PVLine(BaseModel):
    score: float     # 百分兵(Centipawn)或者杀棋步数。如果杀棋，通常用极大值表示
    is_mate: bool    # 是否是必杀局面
    mate_score: Optional[int] = None # 杀棋步数（如果是杀棋局面）
    best_move: str   # 该线路的推荐最佳招法（标准代数记谱法 SAN）
    pv: List[str]    # 主要变例 (PV，标准代数记谱法 SAN)

class EngineEvaluation(BaseModel):
    lines: List[PVLine] # 一二三选的多分支推演

class AnalyzeMoveResponse(BaseModel):
    fen: str
    move: str
    engine_eval: EngineEvaluation
    explanation: str # 大模型(DeepSeek)生成的自然语言解释
