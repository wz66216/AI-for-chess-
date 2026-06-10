from io import StringIO
from typing import Any

import chess
import chess.engine
import chess.pgn

from app.services.engine_service import _find_stockfish
from app.services.lichess_math import (
    MoveJudgment,
    cp_to_win_percent,
    evaluate_judgment,
    win_diff_to_accuracy,
)


def board_to_white_cp(
    board: chess.Board,
    score: chess.engine.PovScore | None = None,
) -> int:
    """Return a white-centric centipawn-style score for a board.

    Positive means White is better; negative means Black is better.
    Terminal checkmate must be read from the board before trusting engine mate
    output because checkmate positions can surface as mate 0.
    """
    if board.is_checkmate():
        return -10000 if board.turn == chess.WHITE else 10000
    if board.is_stalemate() or board.is_insufficient_material():
        return 0
    if score is None:
        return 0

    white_score = score.white()
    if white_score.is_mate():
        mate_score = white_score.mate()
        if mate_score is None or mate_score == 0:
            return 0
        return 10000 if mate_score > 0 else -10000
    return white_score.score() or 0


def empty_judgment_summary() -> dict[str, dict[str, int]]:
    return {
        "white": {judgment.value: 0 for judgment in MoveJudgment},
        "black": {judgment.value: 0 for judgment in MoveJudgment},
    }


async def analyze_full_game(pgn_text: str) -> dict[str, Any]:
    pgn_io = StringIO(pgn_text)
    game = chess.pgn.read_game(pgn_io)
    if game is None:
        raise ValueError("无法解析 PGN 文本，请确保格式正确。")

    board = game.board()
    moves = list(game.mainline_moves())
    analysis_results: list[dict[str, Any]] = []

    engine_path = _find_stockfish()
    try:
        engine = chess.engine.SimpleEngine.popen_uci(engine_path)
    except Exception as exc:
        raise RuntimeError(f"无法启动 Stockfish 引擎: {engine_path}. {exc}") from exc

    try:
        info = engine.analyse(board, chess.engine.Limit(time=0.1))
        current_cp = board_to_white_cp(board, info["score"])
        current_win_percent = cp_to_win_percent(current_cp)

        white_accuracies: list[float] = []
        black_accuracies: list[float] = []
        judgments_summary = empty_judgment_summary()

        for index, move in enumerate(moves):
            is_white_turn = board.turn == chess.WHITE
            player_key = "white" if is_white_turn else "black"
            wp_before = (
                current_win_percent if is_white_turn else 100.0 - current_win_percent
            )

            san_move = board.san(move)
            board.push(move)

            info_after = engine.analyse(board, chess.engine.Limit(time=0.1))
            cp_after = board_to_white_cp(board, info_after["score"])

            new_win_percent = cp_to_win_percent(cp_after)
            wp_after = new_win_percent if is_white_turn else 100.0 - new_win_percent
            win_diff = wp_before - wp_after
            accuracy = win_diff_to_accuracy(wp_before, wp_after)
            judgment = evaluate_judgment(win_diff)
            judgments_summary[player_key][judgment.value] += 1

            if is_white_turn:
                white_accuracies.append(accuracy)
            else:
                black_accuracies.append(accuracy)

            analysis_results.append(
                {
                    "move_number": (index // 2) + 1,
                    "color": player_key,
                    "san": san_move,
                    "uci": move.uci(),
                    "fen": board.fen(),
                    "eval_cp": cp_after,
                    "win_percent": round(new_win_percent, 1),
                    "player_win_percent": round(wp_after, 1),
                    "win_diff": round(win_diff, 1),
                    "accuracy": round(accuracy, 1),
                    "judgment": judgment.value,
                }
            )
            current_win_percent = new_win_percent
    finally:
        engine.quit()

    avg_white_acc = (
        sum(white_accuracies) / len(white_accuracies) if white_accuracies else 100.0
    )
    avg_black_acc = (
        sum(black_accuracies) / len(black_accuracies) if black_accuracies else 100.0
    )

    return {
        "headers": dict(game.headers),
        "global_accuracy": {
            "white": round(avg_white_acc, 1),
            "black": round(avg_black_acc, 1),
        },
        "judgments": judgments_summary,
        "moves": analysis_results,
    }
