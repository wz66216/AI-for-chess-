from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any


START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


@dataclass(slots=True)
class SmokeResult:
    name: str
    ok: bool
    detail: str


class SmokeFailure(RuntimeError):
    pass


def _request_json(
    url: str,
    *,
    method: str = "GET",
    payload: dict[str, Any] | None = None,
    timeout: float = 15.0,
) -> dict[str, Any]:
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        raise SmokeFailure(f"HTTP {exc.code} for {url}") from exc
    except urllib.error.URLError as exc:
        raise SmokeFailure(f"Request failed for {url}: {exc.reason}") from exc

    try:
        parsed = json.loads(body)
    except json.JSONDecodeError as exc:
        raise SmokeFailure(f"Non-JSON response from {url}") from exc
    if not isinstance(parsed, dict):
        raise SmokeFailure(f"Expected JSON object from {url}")
    return parsed


def _join_url(api_base: str, path: str) -> str:
    return urllib.parse.urljoin(api_base.rstrip("/") + "/", path.lstrip("/"))


def check_health(api_base: str) -> SmokeResult:
    payload = _request_json(_join_url(api_base, "/health"))
    if payload.get("status") != "healthy":
        raise SmokeFailure(f"Unexpected health payload: {payload}")
    return SmokeResult("health", True, f"{payload.get('service')} {payload.get('version')}")


def check_whitebox(api_base: str) -> SmokeResult:
    payload = _request_json(
        _join_url(api_base, "/api/whitebox/play"),
        method="POST",
        payload={
            "fen": START_FEN,
            "engine": "alphabeta",
            "depth": 1,
            "evaluator": "heuristic",
        },
    )
    required = {"best_move", "evaluation", "nodes_evaluated", "tree", "candidates"}
    missing = sorted(required.difference(payload))
    if missing:
        raise SmokeFailure(f"Whitebox response missing fields: {', '.join(missing)}")
    if not isinstance(payload["evaluation"], int | float):
        raise SmokeFailure("Whitebox evaluation is not numeric")
    return SmokeResult(
        "whitebox",
        True,
        f"best_move={payload['best_move']} evaluation={payload['evaluation']}",
    )


def check_opening_book(api_base: str) -> SmokeResult:
    query = urllib.parse.urlencode({"fen": START_FEN, "moves": 10, "topGames": 0})
    payload = _request_json(_join_url(api_base, f"/api/v1/opening-book?{query}"))
    moves = payload.get("moves")
    if not isinstance(moves, list):
        raise SmokeFailure("Opening-book response does not include a moves list")
    return SmokeResult("opening-book", True, f"moves={len(moves)}")


def run_smoke_checks(api_base: str, *, include_opening_book: bool = True) -> list[SmokeResult]:
    checks = [check_health, check_whitebox]
    if include_opening_book:
        checks.append(check_opening_book)
    return [check(api_base) for check in checks]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run ChessExplain deployment smoke checks.")
    parser.add_argument("--api-base", default="http://127.0.0.1:8000")
    parser.add_argument(
        "--skip-opening-book",
        action="store_true",
        help="Skip Lichess opening-book check when token/upstream state is not relevant.",
    )
    args = parser.parse_args(argv)

    try:
        results = run_smoke_checks(
            args.api_base,
            include_opening_book=not args.skip_opening_book,
        )
    except SmokeFailure as exc:
        print(f"[FAIL] {exc}", file=sys.stderr)
        return 1

    for result in results:
        print(f"[OK] {result.name}: {result.detail}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
