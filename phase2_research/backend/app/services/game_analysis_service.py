import chess
import chess.pgn
import chess.engine
import asyncio
from io import StringIO
from typing import List, Dict, Any

from app.services.engine_service import EngineService
from app.services.lichess_math import cp_to_win_percent, win_diff_to_accuracy, evaluate_judgment, MoveJudgment
from app.core.config import settings

async def analyze_full_game(pgn_text: str) -> Dict[str, Any]:
    """
    接收 PGN 文本，利用 Stockfish 引擎计算整盘棋双方的精确度和招法质量评价。
    """
    # 1. 解析 PGN
    pgn_io = StringIO(pgn_text)
    game = chess.pgn.read_game(pgn_io)
    if game is None:
        raise ValueError("无法解析 PGN 文本，请确保格式正确。")

    board = game.board()
    moves = list(game.mainline_moves())
    
    # 用于存放每步棋的分析数据
    analysis_results = []
    
    # 启动引擎
    try:
        # 同步启动引擎
        engine_path = settings.STOCKFISH_PATH
        engine = chess.engine.SimpleEngine.popen_uci(engine_path)
    except Exception as e:
        raise RuntimeError(f"无法启动 Stockfish 引擎: {e}")
        
    try:
        # 获取白方的初始视角胜率
        # 初始局面一般引擎给白方 +20 ~ +30 CP 左右
        info = engine.analyse(board, chess.engine.Limit(time=0.1))
        score = info["score"].white()
        
        if score.is_mate():
            current_cp = score.mate() * 10000  # Mate 转换为极大 CP
        else:
            current_cp = score.score() or 0

        current_win_percent = cp_to_win_percent(current_cp)
        
        white_accuracies = []
        black_accuracies = []
        
        judgments_summary = {
            "white": {MoveJudgment.BEST.value: 0, MoveJudgment.EXCELLENT.value: 0, MoveJudgment.GOOD.value: 0, 
                      MoveJudgment.INACCURACY.value: 0, MoveJudgment.MISTAKE.value: 0, MoveJudgment.BLUNDER.value: 0, MoveJudgment.BOOK.value: 0},
            "black": {MoveJudgment.BEST.value: 0, MoveJudgment.EXCELLENT.value: 0, MoveJudgment.GOOD.value: 0, 
                      MoveJudgment.INACCURACY.value: 0, MoveJudgment.MISTAKE.value: 0, MoveJudgment.BLUNDER.value: 0, MoveJudgment.BOOK.value: 0}
        }
        
        # 2. 遍历整盘棋计算评价
        for i, move in enumerate(moves):
            is_white_turn = board.turn == chess.WHITE
            player_key = "white" if is_white_turn else "black"
            
            # 存下用户走这步棋之前的胜率
            wp_before = current_win_percent if is_white_turn else (100.0 - current_win_percent)
            
            # 先获取这步棋的 SAN，然后再 push
            san_move = board.san(move)
            board.push(move)
            
            # 使用引擎评估走完之后的局面
            info_after = engine.analyse(board, chess.engine.Limit(time=0.1))
            score_after = info_after["score"].white()
            
            if score_after.is_mate():
                cp_after = score_after.mate() * 10000
            else:
                cp_after = score_after.score() or 0
                
            new_win_percent = cp_to_win_percent(cp_after)
            wp_after = new_win_percent if is_white_turn else (100.0 - new_win_percent)
            
            # 3. 应用 Lichess 数学模型
            win_diff = wp_before - wp_after
            accuracy = win_diff_to_accuracy(wp_before, wp_after)
            
            # 判定好坏
            judgment = evaluate_judgment(win_diff)
            judgments_summary[player_key][judgment.value] += 1
            
            if is_white_turn:
                white_accuracies.append(accuracy)
            else:
                black_accuracies.append(accuracy)

            # 记录给前端
            analysis_results.append({
                "move_number": (i // 2) + 1,
                "color": player_key,
                "san": san_move,
                "uci": move.uci(),
                "fen": board.fen(),
                "eval_cp": cp_after,
                "win_percent": round(new_win_percent, 1), # 始终保持白方的视角，用于画图
                "player_win_percent": round(wp_after, 1),
                "win_diff": round(win_diff, 1),
                "accuracy": round(accuracy, 1),
                "judgment": judgment.value
            })
            
            # 更新下一个循环的基准
            current_win_percent = new_win_percent

    finally:
        engine.quit()

    # 4. 计算全局平均精确度
    avg_white_acc = sum(white_accuracies) / len(white_accuracies) if white_accuracies else 100.0
    avg_black_acc = sum(black_accuracies) / len(black_accuracies) if black_accuracies else 100.0

    return {
        "headers": dict(game.headers),
        "global_accuracy": {
            "white": round(avg_white_acc, 1),
            "black": round(avg_black_acc, 1)
        },
        "judgments": judgments_summary,
        "moves": analysis_results
    }
