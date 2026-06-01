from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_whitebox_rejects_unsupported_alphabeta_evaluator():
    response = client.post(
        "/api/whitebox/play",
        json={
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "engine": "alphabeta",
            "evaluator": "unknown",
        },
    )

    assert response.status_code == 422


def test_whitebox_alphabeta_accepts_pst_evaluator():
    response = client.post(
        "/api/whitebox/play",
        json={
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "engine": "alphabeta",
            "evaluator": "pst",
            "depth": 1,
        },
    )

    assert response.status_code == 200
    assert response.json()["instrumentation"]["evaluator_name"] == "pst"


def test_whitebox_alphabeta_accepts_heuristic_evaluator():
    response = client.post(
        "/api/whitebox/play",
        json={
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "engine": "alphabeta",
            "depth": 1,
            "evaluator": "heuristic",
        },
    )

    assert response.status_code == 200
    assert response.json()["instrumentation"]["evaluator_name"] == "heuristic"


def test_whitebox_alphabeta_response_includes_instrumentation():
    response = client.post(
        "/api/whitebox/play",
        json={
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "engine": "alphabeta",
            "depth": 1,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "instrumentation" in payload
    assert payload["instrumentation"]["nodes_visited"] >= 1


def test_whitebox_mcts_remains_compatible():
    response = client.post(
        "/api/whitebox/play",
        json={
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "engine": "mcts",
            "mcts_iterations": 5,
        },
    )

    assert response.status_code == 200
    assert "instrumentation" in response.json()


def test_whitebox_rejects_negative_alpha_beta_depth_with_validation():
    response = client.post(
        "/api/whitebox/play",
        json={
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "engine": "alphabeta",
            "depth": -1,
        },
    )

    assert response.status_code == 422
