import chess

from app.engines.whitebox import AlphaBetaEngine
from app.engines.whitebox.evaluators import HeuristicEvaluator, MaterialEvaluator, PstEvaluator


class CountingEvaluator:
    name = "counting"

    def __init__(self):
        self.calls = 0

    def evaluate(self, board: chess.Board) -> float:
        self.calls += 1
        return 42.0


def test_alphabeta_search_keeps_public_result_keys_and_instrumentation():
    engine = AlphaBetaEngine(depth=1)
    result = engine.search(chess.Board())

    assert set(result) >= {
        "best_move",
        "evaluation",
        "nodes_evaluated",
        "nps",
        "time_ms",
        "tree",
        "instrumentation",
    }

    instrumentation = result["instrumentation"]
    assert instrumentation["nodes_visited"] >= 1
    assert instrumentation["leaf_evaluations"] >= 1
    assert instrumentation["generated_children"] >= 1
    assert instrumentation["remaining_depth_counts"]


def test_alphabeta_instrumentation_counts_root_and_leaf_separately_at_shallow_depth():
    engine = AlphaBetaEngine(depth=1)
    result = engine.search(chess.Board())

    instrumentation = result["instrumentation"]

    assert instrumentation["nodes_visited"] == 21
    assert instrumentation["leaf_evaluations"] == 20
    assert instrumentation["remaining_depth_counts"] == {1: 1, 0: 20}
    assert instrumentation["children_by_remaining_depth"] == {1: 20}


def test_alphabeta_engine_uses_injected_evaluator():
    evaluator = CountingEvaluator()
    engine = AlphaBetaEngine(depth=1, evaluator=evaluator)

    result = engine.search(chess.Board())

    assert evaluator.calls == result["nodes_evaluated"]
    assert result["evaluation"] == 42.0
    assert result["instrumentation"]["evaluator_name"] == "counting"


def test_alphabeta_engine_defaults_to_material_evaluator_semantics():
    engine = AlphaBetaEngine(depth=1)

    assert isinstance(engine.evaluator, MaterialEvaluator)
    assert engine.evaluator.evaluate(chess.Board()) == 0.0


def test_alphabeta_engine_supports_pst_evaluator_and_records_name():
    engine = AlphaBetaEngine(depth=1, evaluator=PstEvaluator())

    result = engine.search(chess.Board())

    assert result["instrumentation"]["evaluator_name"] == "pst"


def test_alphabeta_engine_supports_heuristic_evaluator_and_records_name():
    engine = AlphaBetaEngine(depth=1, evaluator=HeuristicEvaluator())

    result = engine.search(chess.Board())

    assert result["instrumentation"]["evaluator_name"] == "heuristic"
