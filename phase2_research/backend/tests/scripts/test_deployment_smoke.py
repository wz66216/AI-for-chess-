import pytest

from scripts import deployment_smoke


def test_run_smoke_checks_can_skip_opening_book(monkeypatch):
    called = []

    def fake_health(api_base):
        called.append(("health", api_base))
        return deployment_smoke.SmokeResult("health", True, "ok")

    def fake_whitebox(api_base):
        called.append(("whitebox", api_base))
        return deployment_smoke.SmokeResult("whitebox", True, "ok")

    monkeypatch.setattr(deployment_smoke, "check_health", fake_health)
    monkeypatch.setattr(deployment_smoke, "check_whitebox", fake_whitebox)

    results = deployment_smoke.run_smoke_checks(
        "http://example.test",
        include_opening_book=False,
    )

    assert [result.name for result in results] == ["health", "whitebox"]
    assert called == [
        ("health", "http://example.test"),
        ("whitebox", "http://example.test"),
    ]


def test_check_whitebox_requires_white_score_payload(monkeypatch):
    def fake_request_json(url, *, method="GET", payload=None, timeout=15.0):
        assert url == "http://api.test/api/whitebox/play"
        assert method == "POST"
        assert payload["engine"] == "alphabeta"
        return {
            "best_move": "e2e4",
            "evaluation": 0.1,
            "nodes_evaluated": 20,
            "tree": {},
            "candidates": [],
        }

    monkeypatch.setattr(deployment_smoke, "_request_json", fake_request_json)

    result = deployment_smoke.check_whitebox("http://api.test")

    assert result.ok is True
    assert result.name == "whitebox"
    assert "evaluation=0.1" in result.detail


def test_check_whitebox_rejects_missing_contract_fields(monkeypatch):
    monkeypatch.setattr(
        deployment_smoke,
        "_request_json",
        lambda *args, **kwargs: {"evaluation": 0.0},
    )

    with pytest.raises(deployment_smoke.SmokeFailure, match="missing fields"):
        deployment_smoke.check_whitebox("http://api.test")


def test_main_returns_nonzero_on_smoke_failure(monkeypatch, capsys):
    def fail(*args, **kwargs):
        raise deployment_smoke.SmokeFailure("boom")

    monkeypatch.setattr(deployment_smoke, "run_smoke_checks", fail)

    assert deployment_smoke.main(["--api-base", "http://api.test"]) == 1
    assert "[FAIL] boom" in capsys.readouterr().err
