import pytest

from scripts.benchmark_runner import (
    ALPHABETA_EVALUATORS,
    CSV_FIELDNAMES,
    fetch_puzzles,
    make_result_row,
)


def test_fetch_puzzles_returns_nonempty_suite_with_id_and_fen():
    puzzles = fetch_puzzles(3)

    assert len(puzzles) == 3
    assert all("id" in puzzle and "fen" in puzzle for puzzle in puzzles)


def test_fetch_puzzles_returns_stockfish_safe_chess_positions():
    import chess

    puzzles = fetch_puzzles(10)

    assert all(chess.Board(puzzle["fen"]).is_valid() for puzzle in puzzles)


def test_make_result_row_includes_alphabeta_instrumentation_columns():
    row = make_result_row(
        puzzle_id="puzzle_1",
        engine="alphabeta",
        param_1_name="depth",
        param_1_val=3,
        param_2_name="use_ordering",
        param_2_val=True,
        result={
            "best_move": "e2e4",
            "nodes_evaluated": 12,
            "time_ms": 5,
            "nps": 2400,
            "evaluation": 1.5,
            "instrumentation": {
                "cutoffs": 2,
                "nodes_visited": 12,
                "leaf_evaluations": 7,
                "generated_children": 18,
                "remaining_depth_counts": {3: 1, 2: 4},
                "children_by_remaining_depth": {2: 18},
            },
        },
        evaluator_name="material",
    )

    assert row["evaluator"] == "material"
    assert row["cutoffs"] == 2
    assert row["cutoff_count"] == 2
    assert row["nodes_visited"] == 12
    assert row["leaf_evaluations"] == 7
    assert row["generated_children"] == 18
    assert row["remaining_depth_counts"] == '{"2": 4, "3": 1}'
    assert row["children_by_remaining_depth"] == '{"2": 18}'
    assert row["max_depth_reached"] == 1


def test_make_result_row_reports_zero_depth_for_terminal_root_position():
    row = make_result_row(
        puzzle_id="puzzle_terminal",
        engine="alphabeta",
        param_1_name="depth",
        param_1_val=3,
        param_2_name="use_ordering",
        param_2_val=True,
        result={
            "best_move": None,
            "nodes_evaluated": 1,
            "time_ms": 0,
            "nps": 0,
            "evaluation": 0.0,
            "instrumentation": {
                "cutoffs": 0,
                "nodes_visited": 1,
                "leaf_evaluations": 1,
                "generated_children": 0,
                "remaining_depth_counts": {3: 1},
                "children_by_remaining_depth": {},
            },
        },
        evaluator_name="material",
    )

    assert row["max_depth_reached"] == 0


def test_make_result_row_leaves_non_alphabeta_rows_stable_without_instrumentation():
    row = make_result_row(
        puzzle_id="puzzle_2",
        engine="mcts",
        param_1_name="iterations",
        param_1_val=100,
        param_2_name="c_val",
        param_2_val=1.414,
        result={
            "best_move": None,
            "nodes_evaluated": 4,
            "time_ms": 1,
            "nps": 4000,
            "evaluation": 0.0,
        },
    )

    assert row["evaluator"] is None
    assert row["cutoffs"] is None
    assert row["nodes_visited"] is None
    assert row["leaf_evaluations"] is None
    assert row["generated_children"] is None


def test_alphabeta_evaluator_sweep_constant_is_explicit_and_stable():
    assert ALPHABETA_EVALUATORS == ("material", "pst", "heuristic")


def test_make_result_row_preserves_variant_evaluator_name():
    row = make_result_row(
        puzzle_id="puzzle_variant",
        engine="alphabeta",
        param_1_name="depth",
        param_1_val=4,
        param_2_name="use_ordering",
        param_2_val=False,
        result={
            "best_move": "g1f3",
            "nodes_evaluated": 8,
            "time_ms": 2,
            "nps": 4000,
            "evaluation": 0.25,
        },
        evaluator_name="pst",
    )

    assert row["evaluator"] == "pst"


def test_make_result_row_does_not_backfill_quality_columns_from_whitebox_evaluation():
    row = make_result_row(
        puzzle_id="puzzle_no_stockfish_quality",
        engine="alphabeta",
        param_1_name="depth",
        param_1_val=4,
        param_2_name="use_ordering",
        param_2_val=True,
        result={
            "best_move": "e2e4",
            "nodes_evaluated": 8,
            "time_ms": 2,
            "nps": 4000,
            "evaluation": 0.35,
        },
        evaluator_name="material",
    )

    assert row["reference_best_move"] is None
    assert row["reference_eval"] is None
    assert row["top_move_match"] is None
    assert row["eval_gap"] is None
    assert row["within_50cp"] is None
    assert row["within_100cp"] is None


def test_normalize_move_to_uci_keeps_uci_moves_unchanged():
    import chess
    import scripts.benchmark_runner as benchmark_runner

    board = chess.Board()

    assert benchmark_runner.normalize_move_to_uci(board, "e2e4") == "e2e4"


def test_normalize_move_to_uci_converts_san_to_uci():
    import chess
    import scripts.benchmark_runner as benchmark_runner

    board = chess.Board()

    assert benchmark_runner.normalize_move_to_uci(board, "e4") == "e2e4"


def test_make_result_row_includes_quality_columns_for_non_mate_position():
    row = make_result_row(
        puzzle_id="puzzle_quality",
        engine="alphabeta",
        param_1_name="depth",
        param_1_val=4,
        param_2_name="use_ordering",
        param_2_val=True,
        result={
            "best_move": "e2e4",
            "nodes_evaluated": 8,
            "time_ms": 2,
            "nps": 4000,
            "evaluation": 0.35,
            "reference_best_move": "e2e4",
            "reference_eval": 0.5,
        },
        evaluator_name="material",
    )

    assert row["reference_best_move"] == "e2e4"
    assert row["reference_eval"] == 0.5
    assert row["top_move_match"] is True
    assert row["eval_gap"] is None
    assert row["within_50cp"] is None
    assert row["within_100cp"] is None


def test_make_result_row_normalizes_chosen_eval_sign_before_gap_comparison():
    row = make_result_row(
        puzzle_id="puzzle_quality_sign",
        engine="alphabeta",
        param_1_name="depth",
        param_1_val=4,
        param_2_name="use_ordering",
        param_2_val=True,
        result={
            "best_move": "e2e4",
            "nodes_evaluated": 8,
            "time_ms": 2,
            "nps": 4000,
            "reference_best_move": "e2e4",
            "reference_eval": 0.5,
            "eval_gap": 0.15,
            "within_50cp": True,
            "within_100cp": True,
        },
        evaluator_name="material",
    )

    assert row["eval_gap"] == pytest.approx(0.15)


def test_normalize_chosen_eval_to_original_pov_flips_stockfish_pov_sign():
    import scripts.benchmark_runner as benchmark_runner

    assert benchmark_runner._normalize_chosen_eval_to_original_pov(0.75) == pytest.approx(-0.75)
    assert benchmark_runner._normalize_chosen_eval_to_original_pov(-0.25) == pytest.approx(0.25)
    assert benchmark_runner._normalize_chosen_eval_to_original_pov(None) is None


def test_quality_summary_uses_normalized_chosen_eval_for_gap_and_thresholds():
    import chess
    import scripts.benchmark_runner as benchmark_runner

    board = chess.Board()
    summary = benchmark_runner._quality_summary(
        board,
        chosen_move="e2e4",
        chosen_eval=0.35,
        reference_best_move="e2e4",
        reference_eval=0.5,
    )

    assert summary["top_move_match"] is True
    assert summary["eval_gap"] == pytest.approx(0.15)
    assert summary["within_50cp"] is True
    assert summary["within_100cp"] is True


def test_make_result_row_leaves_quality_columns_none_for_mate_reference():
    row = make_result_row(
        puzzle_id="puzzle_mate_reference",
        engine="alphabeta",
        param_1_name="depth",
        param_1_val=4,
        param_2_name="use_ordering",
        param_2_val=True,
        result={
            "best_move": "e2e4",
            "nodes_evaluated": 8,
            "time_ms": 2,
            "nps": 4000,
            "evaluation": 0.35,
            "reference_best_move": "e2e4",
            "reference_eval": None,
        },
        evaluator_name="material",
    )

    assert row["reference_eval"] is None
    assert row["eval_gap"] is None
    assert row["within_50cp"] is None
    assert row["within_100cp"] is None


def test_csv_fieldnames_are_explicit_and_stable():
    assert CSV_FIELDNAMES[:5] == ["puzzle_id", "engine", "param_1_name", "param_1_val", "param_2_name"]
    assert "children_by_remaining_depth" in CSV_FIELDNAMES
    assert "reference_best_move" in CSV_FIELDNAMES
    assert "reference_eval" in CSV_FIELDNAMES
    assert "top_move_match" in CSV_FIELDNAMES
    assert "eval_gap" in CSV_FIELDNAMES
    assert "within_50cp" in CSV_FIELDNAMES
    assert "within_100cp" in CSV_FIELDNAMES
