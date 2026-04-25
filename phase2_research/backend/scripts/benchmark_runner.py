import sys
import os
import csv
import time
import chess
import urllib.request
import json
from pathlib import Path

# Add backend to path so we can import the engines directly without FastAPI
sys.path.append(str(Path(__file__).parent.parent))

from app.engines.whitebox import AlphaBetaEngine, MCTSEngine

def fetch_puzzles(count: int = 10) -> list:
    """Fetch random puzzles from Lichess API for benchmarking"""
    print(f"Fetching {count} puzzles from Lichess...")
    puzzles = []
    # For a real benchmark, we'd query the Lichess puzzle DB, but for simplicity
    # and avoiding API limits, we'll use some hardcoded FENs covering different phases
    
    hardcoded_fens = [
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", # Start
        "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5", # Italian
        "r1bqk2r/ppppbppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 6", # Midgame
        "8/8/8/4k3/8/8/4K3/8 w - - 0 1", # Endgame basic
        "1k6/8/8/8/8/8/8/1K5R w - - 0 1", # Rook endgame
        "r2q1rk1/1b2bppp/p1n1pn2/1p6/3P4/P1N2N2/1P1B1PPP/RB1QR1K1 w - - 1 15", # Complex midgame
        "8/p7/1p6/2p5/2P5/1P6/P7/8 w - - 0 1", # Pawn structure
        "2r1r1k1/pp3pbp/1qn3p1/3p1b2/3P4/B3PN2/P3BPPP/R1Q2RK1 w - - 2 16", # Positional
        "rnbq1rk1/pp2ppbp/3p1np1/8/3pP3/2N2N2/PPP1BPPP/R1BQ1RK1 w - - 0 8", # Sicilian
        "8/3k4/8/8/8/3K4/8/8 w - - 0 1" # Kings only
    ]
    
    for i in range(min(count, len(hardcoded_fens))):
        puzzles.append({
            "id": f"puzzle_{i}",
            "fen": hardcoded_fens[i]
        })
        
    return puzzles

def run_benchmark():
    puzzles = fetch_puzzles(10)
    results = []
    
    # 1. Benchmark Alpha-Beta (Depth vs Move Ordering)
    print("Running Alpha-Beta Benchmark...")
    for puzzle in puzzles:
        board = chess.Board(puzzle["fen"])
        for depth in [2, 3, 4]:
            for use_ordering in [True, False]:
                engine = AlphaBetaEngine(depth=depth, use_move_ordering=use_ordering)
                res = engine.search(board.copy())
                results.append({
                    "puzzle_id": puzzle["id"],
                    "engine": "alphabeta",
                    "param_1_name": "depth",
                    "param_1_val": depth,
                    "param_2_name": "use_ordering",
                    "param_2_val": str(use_ordering),
                    "best_move": res["best_move"],
                    "nodes": res["nodes_evaluated"],
                    "time_ms": res["time_ms"],
                    "nps": res["nps"],
                    "evaluation": res["evaluation"]
                })
                
    # 2. Benchmark MCTS (Iterations vs Exploration)
    print("Running MCTS Benchmark...")
    for puzzle in puzzles:
        board = chess.Board(puzzle["fen"])
        for iterations in [50, 100, 200]:
            for c_val in [0.5, 1.414, 2.0]:
                engine = MCTSEngine(iterations=iterations, exploration_constant=c_val)
                res = engine.search(board.copy())
                results.append({
                    "puzzle_id": puzzle["id"],
                    "engine": "mcts",
                    "param_1_name": "iterations",
                    "param_1_val": iterations,
                    "param_2_name": "c_val",
                    "param_2_val": c_val,
                    "best_move": res["best_move"],
                    "nodes": res["nodes_evaluated"],
                    "time_ms": res["time_ms"],
                    "nps": res["nps"],
                    "evaluation": res["evaluation"]
                })
                
    # Save to CSV
    os.makedirs("results", exist_ok=True)
    filename = f"results/benchmark_{int(time.time())}.csv"
    with open(filename, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)
        
    print(f"Benchmark completed. Data saved to {filename}")

if __name__ == "__main__":
    run_benchmark()
