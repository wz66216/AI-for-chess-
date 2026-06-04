import asyncio
import threading

import httpx
from fastapi.testclient import TestClient

from app.api import whitebox
from app.main import app


client = TestClient(app)


def test_health_check_exposes_deployment_smoke_fields():
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "healthy"
    assert payload["api_prefix"] == "/api/v1"
    assert payload["checks"]["api"] == "ok"
    assert payload["checks"]["whitebox"] == "ok"


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


def test_whitebox_alphabeta_defaults_to_heuristic_evaluator():
    response = client.post(
        "/api/whitebox/play",
        json={
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "engine": "alphabeta",
            "depth": 1,
        },
    )

    assert response.status_code == 200
    assert response.json()["instrumentation"]["evaluator_name"] == "heuristic"


def test_whitebox_openapi_documents_white_centric_scores():
    schema = client.get("/openapi.json").json()
    request_schema = schema["components"]["schemas"]["WhiteboxRequest"]["properties"]
    response_schema = schema["components"]["schemas"]["WhiteboxResponse"]["properties"]
    candidate_schema = schema["components"]["schemas"]["Candidate"]["properties"]

    assert request_schema["depth"]["maximum"] == 8
    assert request_schema["mcts_iterations"]["maximum"] == 50000
    assert request_schema["mcts_exploration_constant"]["maximum"] == 5.0
    assert "positive is better for White" in response_schema["evaluation"]["description"]
    assert "negative is better for Black" in response_schema["evaluation"]["description"]
    assert "positive is better for White" in candidate_schema["evaluation"]["description"]
    assert response_schema["best_move"]["description"] == "The best move selected by the engine"


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


def test_whitebox_rejects_alpha_beta_depth_above_interactive_limit():
    response = client.post(
        "/api/whitebox/play",
        json={
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "engine": "alphabeta",
            "depth": 9,
        },
    )

    assert response.status_code == 422


def test_whitebox_rejects_mcts_iterations_above_interactive_limit():
    response = client.post(
        "/api/whitebox/play",
        json={
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "engine": "mcts",
            "mcts_iterations": 50001,
        },
    )

    assert response.status_code == 422


def test_whitebox_rejects_mcts_exploration_above_interactive_limit():
    response = client.post(
        "/api/whitebox/play",
        json={
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "engine": "mcts",
            "mcts_iterations": 10,
            "mcts_exploration_constant": 5.1,
        },
    )

    assert response.status_code == 422


def test_whitebox_search_does_not_block_follow_up_requests(monkeypatch):
    first_search_started = threading.Event()
    release_first_search = threading.Event()
    call_count = 0
    call_count_lock = threading.Lock()

    def search(self, board):
        nonlocal call_count
        with call_count_lock:
            call_count += 1
            call_number = call_count

        if call_number == 1:
            first_search_started.set()
            release_first_search.wait(timeout=5)

        return {
            "best_move": "e2e4",
            "evaluation": 0.0,
            "nodes_evaluated": 1,
            "nps": 1,
            "time_ms": 1,
            "instrumentation": {"nodes_visited": 1},
            "tree": {
                "id": f"root-{call_number}",
                "name": "ROOT",
                "value": 0.0,
                "node_type": "root",
                "is_pruned": False,
                "metadata": {},
            },
            "candidates": [],
        }

    monkeypatch.setattr(whitebox.AlphaBetaEngine, "search", search)

    payload = {
        "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "engine": "alphabeta",
        "depth": 1,
    }

    async def exercise_concurrent_requests():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as async_client:
            first_task = asyncio.create_task(
                async_client.post("/api/whitebox/play", json=payload)
            )

            await asyncio.to_thread(first_search_started.wait, 2)
            second_response = await asyncio.wait_for(
                async_client.post("/api/whitebox/play", json=payload),
                timeout=1,
            )

            release_first_search.set()
            first_response = await first_task
            return first_response, second_response

    first_response, second_response = asyncio.run(exercise_concurrent_requests())

    assert second_response.status_code == 200
    assert second_response.json()["tree"]["id"] == "root-2"
    assert first_response.status_code == 200
