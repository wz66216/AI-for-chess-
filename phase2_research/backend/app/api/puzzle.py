import csv
import io
import random
import chess
import zstandard as zstd
import httpx
from fastapi import APIRouter, Query, HTTPException

router = APIRouter()

LICHESS_PUZZLE_DB = "https://database.lichess.org/lichess_db_puzzle.csv.zst"
LICHESS_DAILY = "https://lichess.org/api/puzzle/daily"

# Cache: download once, reuse for session
_puzzle_cache: list[dict] = []


def uci_solution_to_san(fen: str, uci_moves: list[str]) -> list[str]:
    """Convert a Lichess UCI puzzle line to SAN, preserving invalid fallbacks."""
    san_moves: list[str] = []
    try:
        board = chess.Board(fen)
        for uci_move in uci_moves:
            move = chess.Move.from_uci(uci_move)
            if move in board.legal_moves:
                san_moves.append(board.san(move))
                board.push(move)
            else:
                san_moves.append(uci_move)
    except Exception:
        return uci_moves
    return san_moves


def prepare_lichess_puzzle(fen: str, uci_moves: list[str]) -> tuple[str, list[str]]:
    """Apply Lichess' setup move and return the playable puzzle position."""
    if not uci_moves:
        return fen, []

    try:
        board = chess.Board(fen)
        setup_move = chess.Move.from_uci(uci_moves[0])
        if setup_move not in board.legal_moves:
            return fen, uci_solution_to_san(fen, uci_moves)
        board.push(setup_move)
        playable_fen = board.fen()
        return playable_fen, uci_solution_to_san(playable_fen, uci_moves[1:])
    except Exception:
        return fen, uci_moves


def _download_and_parse() -> list[dict]:
    """Stream-download and decompress puzzle DB, parse first ~2000 rows."""
    puzzles: list[dict] = []
    dctx = zstd.ZstdDecompressor()

    with httpx.stream("GET", LICHESS_PUZZLE_DB, timeout=180, follow_redirects=True) as resp:
        it = resp.iter_bytes(chunk_size=131072)
        buf = b""

        class _Reader:
            def read(self, n: int) -> bytes:  # type: ignore[override]
                nonlocal buf
                while len(buf) < n:
                    try:
                        buf += next(it)
                    except StopIteration:
                        break
                out, buf = buf[:n], buf[n:]
                return out

        reader = dctx.stream_reader(_Reader())  # type: ignore[arg-type]
        text = io.TextIOWrapper(reader, encoding="utf-8")
        csv_reader = csv.DictReader(text)
        for row in csv_reader:
            puzzles.append(row)
            if len(puzzles) >= 3000:
                break
    return puzzles


@router.get("/random")
async def random_puzzle(
    min_rating: int = Query(default=1200, ge=600, le=3000),
    max_rating: int = Query(default=2500, ge=600, le=3000),
):
    """Return a random puzzle from the Lichess open database, filtered by rating."""
    try:
        if not _puzzle_cache:
            _puzzle_cache[:] = _download_and_parse()

        in_range = [
            p for p in _puzzle_cache
            if min_rating <= int(p.get("Rating", "0")) <= max_rating
        ]
        if not in_range:
            raise HTTPException(status_code=404, detail="指定评分范围内无谜题")

        p = random.choice(in_range)
        fen = p.get("FEN", "")
        uci_moves = (p.get("Moves", "") or "").split()
        playable_fen, solution = prepare_lichess_puzzle(fen, uci_moves)

        return {
            "id": p.get("PuzzleId", "?"),
            "fen": playable_fen,
            "rating": int(p.get("Rating", "0")),
            "themes": (p.get("Themes", "") or "").split(),
            "solution": solution,
            "players": [],
        }
    except HTTPException:
        raise
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"无法连接 Lichess 数据库: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"谜题获取失败: {exc}")


@router.get("/daily")
async def daily_puzzle():
    """Fetch today's Lichess puzzle."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(LICHESS_DAILY)
            resp.raise_for_status()
            puzzle = resp.json()
        fen = puzzle["puzzle"]["fen"]
        uci_moves = puzzle["puzzle"]["solution"]
        playable_fen, solution = prepare_lichess_puzzle(fen, uci_moves)
        return {
            "id": puzzle["puzzle"]["id"],
            "fen": playable_fen,
            "rating": puzzle["puzzle"]["rating"],
            "themes": puzzle["puzzle"]["themes"],
            "solution": solution,
            "players": puzzle["game"]["players"],
        }
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Lichess API 不可达: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"谜题获取失败: {exc}")
