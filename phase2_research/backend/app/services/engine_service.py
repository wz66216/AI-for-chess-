import chess
import chess.engine
import os
import asyncio
from typing import List
from app.core.config import settings
from app.schemas.analysis import EngineEvaluation, PVLine

class EngineService:
    def __init__(self):
        self.engine_path = settings.STOCKFISH_PATH
    
    def _analyze_sync(self, fen: str, move: str = None) -> EngineEvaluation:
        board = chess.Board(fen)
        
        try:
            # 同步启动引擎
            engine = chess.engine.SimpleEngine.popen_uci(self.engine_path)
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise RuntimeError(f"无法启动 Stockfish 引擎，请检查路径: {self.engine_path}。错误类型: {type(e).__name__}, 详情: {repr(e)}")
        
        try:
            # 如果提供了玩家的招法，先在棋盘上走出这步棋再评估局面
            if move:
                try:
                    board.push_uci(move)
                except ValueError as ve:
                    print(f"Invalid move {move} for FEN {fen}: {ve}")
                    
            # 获取引擎分析结果，带时间限制并请求前三选 (multipv=3)
            infos = engine.analyse(
                board, 
                chess.engine.Limit(time=settings.ENGINE_TIME_LIMIT, depth=settings.ENGINE_DEPTH),
                multipv=3
            )
            
            # multipv 返回的是一个列表，即使只有一个元素
            if not isinstance(infos, list):
                infos = [infos]
                
            pv_lines: List[PVLine] = []
            
            for info in infos:
                score_obj = info.get("score")
                is_mate = False
                mate_score = None
                score_cp = 0.0
                
                if score_obj is not None:
                    # 以当前走子方的视角获取分数 (POV)
                    pov_score = score_obj.pov(board.turn)
                    if pov_score.is_mate():
                        is_mate = True
                        mate_score = pov_score.mate()
                        # 给一个极大的伪分数，表示必定赢或必定输
                        score_cp = 10000.0 if mate_score > 0 else -10000.0
                    else:
                        score_cp = pov_score.score() / 100.0 # 转换为兵的单位 (Pawn)
                
                # 提取并转换为国际象棋标准代数记谱法 (SAN)
                pv_san_list = []
                pv_moves = info.get("pv", [])
                
                # 创建一个副本来推演这根线的 SAN 记谱
                temp_board = board.copy()
                for pv_move in pv_moves[:6]:  # 只取前6步变着
                    try:
                        san_move = temp_board.san(pv_move)
                        pv_san_list.append(san_move)
                        temp_board.push(pv_move)
                    except Exception:
                        # 兜底防错，如果无法走就直接输出原本的格式
                        pv_san_list.append(pv_move.uci())
                    
                best_move_san = pv_san_list[0] if pv_san_list else ""
                
                pv_lines.append(PVLine(
                    score=score_cp,
                    is_mate=is_mate,
                    mate_score=mate_score,
                    best_move=best_move_san,
                    pv=pv_san_list
                ))
            
            return EngineEvaluation(lines=pv_lines)
            
        finally:
            # 确保分析完毕后关闭引擎，防止资源泄漏
            engine.quit()

    async def analyze_position(self, fen: str, move: str = None) -> EngineEvaluation:
        # 在线程池中运行阻塞的引擎代码，避免阻塞 FastAPI 的主事件循环
        return await asyncio.to_thread(self._analyze_sync, fen, move)
