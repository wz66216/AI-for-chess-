import csv
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import chess

# Add backend to path so we can import the engines directly without FastAPI.
sys.path.append(str(Path(__file__).parent.parent))

from app.engines.whitebox import AlphaBetaEngine, MCTSEngine, build_evaluator


ALPHABETA_EVALUATORS = ("material", "pst", "heuristic")

CSV_FIELDNAMES = [
    "puzzle_id",
    "engine",
    "param_1_name",
    "param_1_val",
    "param_2_name",
    "param_2_val",
    "evaluator",
    "best_move",
    "nodes",
    "time_ms",
    "nps",
    "evaluation",
    "cutoffs",
    "cutoff_count",
    "nodes_visited",
    "leaf_evaluations",
    "generated_children",
    "remaining_depth_counts",
    "children_by_remaining_depth",
    "max_depth_reached",
    "reference_best_move",
    "reference_eval",
    "top_move_match",
    "eval_gap",
    "within_50cp",
    "within_100cp",
]


def fetch_puzzles(count: int = 10) -> list[dict[str, str]]:
    """Return a small deterministic benchmark suite."""
    hardcoded_fens = [
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5",
        "r1bqk2r/ppppbppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 6",
        "8/8/8/4k3/8/8/4K3/8 w - - 0 1",
        "1k6/8/8/8/8/8/8/1K5R w - - 0 1",
        "r2q1rk1/1b2bppp/p1n1pn2/1p6/3P4/P1N2N2/1P1B1PPP/RB1QR1K1 w - - 1 15",
        "4k3/p7/1p6/2p5/2P5/1P6/P7/4K3 w - - 0 1",
        "2r1r1k1/pp3pbp/1qn3p1/3p1b2/3P4/B3PN2/P3BPPP/R1Q2RK1 w - - 2 16",
        "rnbq1rk1/pp2ppbp/3p1np1/8/3pP3/2N2N2/PPP1BPPP/R1BQ1RK1 w - - 0 8",
        "8/3k4/8/8/8/3K4/8/8 w - - 0 1",
    ]

    return [
        {"id": f"puzzle_{index}", "fen": fen}
        for index, fen in enumerate(hardcoded_fens[:count])
    ]


def _json_counts(value: dict[Any, Any] | None) -> str | None:
    if value is None:
        return None
    normalized = {str(key): count for key, count in value.items()}
    return json.dumps(normalized, sort_keys=True)


def _max_depth_reached(configured_depth: Any, remaining_depth_counts: dict[Any, Any] | None) -> int | None:
    if remaining_depth_counts is None:
        return None
    if not remaining_depth_counts:
        return 0
    try:
        start_depth = int(configured_depth)
        min_remaining = min(int(depth) for depth in remaining_depth_counts.keys())
    except (TypeError, ValueError):
        return None
    return max(0, start_depth - min_remaining)


def normalize_move_to_uci(board: chess.Board, move: str | None) -> str | None:
    if not move:
        return None
    try:
        parsed = chess.Move.from_uci(move)
        if parsed in board.legal_moves:
            return parsed.uci()
    except ValueError:
        pass
    try:
        return board.parse_san(move).uci()
    except ValueError:
        return move


def _normalize_chosen_eval_to_original_pov(chosen_eval: float | None) -> float | None:
    if chosen_eval is None:
        return None
    return -chosen_eval


def _quality_summary(
    board: chess.Board,
    chosen_move: str | None,
    chosen_eval: float | None,
    reference_best_move: str | None,
    reference_eval: float | None,
) -> dict[str, Any]:
    normalized_chosen = normalize_move_to_uci(board, chosen_move)
    normalized_reference = normalize_move_to_uci(board, reference_best_move)
    top_move_match = (
        normalized_chosen is not None
        and normalized_reference is not None
        and normalized_chosen == normalized_reference
    )

    normalized_eval = (
        _normalize_chosen_eval_to_original_pov(-chosen_eval)
        if chosen_eval is not None
        else None
    )
    if normalized_eval is None or reference_eval is None:
        eval_gap = None
        within_50cp = None
        within_100cp = None
    else:
        eval_gap = abs(reference_eval - normalized_eval)
        within_50cp = eval_gap <= 0.5
        within_100cp = eval_gap <= 1.0

    return {
        "reference_best_move": reference_best_move,
        "reference_eval": reference_eval,
        "top_move_match": top_move_match,
        "eval_gap": eval_gap,
        "within_50cp": within_50cp,
        "within_100cp": within_100cp,
    }


def make_result_row(
    *,
    puzzle_id: str,
    engine: str,
    param_1_name: str,
    param_1_val: Any,
    param_2_name: str,
    param_2_val: Any,
    result: dict[str, Any],
    evaluator_name: str | None = None,
) -> dict[str, Any]:
    instrumentation = result.get("instrumentation") or {}
    remaining_depth_counts = instrumentation.get("remaining_depth_counts")
    children_by_remaining_depth = instrumentation.get("children_by_remaining_depth")
    reference_best_move = result.get("reference_best_move")
    reference_eval = result.get("reference_eval")
    top_move_match = None
    if result.get("best_move") and reference_best_move:
        top_move_match = result.get("best_move") == reference_best_move

    row = {
        "puzzle_id": puzzle_id,
        "engine": engine,
        "param_1_name": param_1_name,
        "param_1_val": param_1_val,
        "param_2_name": param_2_name,
        "param_2_val": param_2_val,
        "evaluator": evaluator_name if engine == "alphabeta" else None,
        "best_move": result.get("best_move"),
        "nodes": result.get("nodes_evaluated"),
        "time_ms": result.get("time_ms"),
        "nps": result.get("nps"),
        "evaluation": result.get("evaluation"),
        "cutoffs": instrumentation.get("cutoffs"),
        "cutoff_count": instrumentation.get("cutoffs"),
        "nodes_visited": instrumentation.get("nodes_visited"),
        "leaf_evaluations": instrumentation.get("leaf_evaluations"),
        "generated_children": instrumentation.get("generated_children"),
        "remaining_depth_counts": _json_counts(remaining_depth_counts),
        "children_by_remaining_depth": _json_counts(children_by_remaining_depth),
        "max_depth_reached": _max_depth_reached(param_1_val, remaining_depth_counts),
        "reference_best_move": reference_best_move,
        "reference_eval": reference_eval,
        "top_move_match": top_move_match,
        "eval_gap": result.get("eval_gap"),
        "within_50cp": result.get("within_50cp"),
        "within_100cp": result.get("within_100cp"),
    }
    return row


def run_benchmark() -> None:
    puzzles = fetch_puzzles(10)
    results: list[dict[str, Any]] = []

    print("Running Alpha-Beta benchmark...")
    for puzzle in puzzles:
        board = chess.Board(puzzle["fen"])
        for evaluator_name in ALPHABETA_EVALUATORS:
            for depth in [2, 3, 4]:
                for use_ordering in [True, False]:
                    engine = AlphaBetaEngine(
                        depth=depth,
                        use_move_ordering=use_ordering,
                        evaluator=build_evaluator(evaluator_name),
                    )
                    res = engine.search(board.copy())
                    results.append(
                        make_result_row(
                            puzzle_id=puzzle["id"],
                            engine="alphabeta",
                            param_1_name="depth",
                            param_1_val=depth,
                            param_2_name="use_ordering",
                            param_2_val=use_ordering,
                            result=res,
                            evaluator_name=evaluator_name,
                        )
                    )

    print("Running MCTS benchmark...")
    for puzzle in puzzles:
        board = chess.Board(puzzle["fen"])
        for iterations in [50, 100, 200]:
            for c_val in [0.5, 1.414, 2.0]:
                engine = MCTSEngine(iterations=iterations, exploration_constant=c_val)
                res = engine.search(board.copy())
                results.append(
                    make_result_row(
                        puzzle_id=puzzle["id"],
                        engine="mcts",
                        param_1_name="iterations",
                        param_1_val=iterations,
                        param_2_name="c_val",
                        param_2_val=c_val,
                        result=res,
                    )
                )

    os.makedirs("results", exist_ok=True)
    filename = f"results/benchmark_{int(time.time())}.csv"
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES)
        writer.writeheader()
        writer.writerows(results)

    print(f"Benchmark completed. Data saved to {filename}")


if __name__ == "__main__":
    run_benchmark()
