from fastapi import APIRouter, HTTPException
from typing import Any
import chess

from app.schemas.whitebox import WhiteboxRequest, WhiteboxResponse
from app.engines.whitebox import AlphaBetaEngine, MCTSEngine

router = APIRouter()

@router.post("/play", response_model=WhiteboxResponse)
async def play_whitebox(req: WhiteboxRequest) -> Any:
    try:
        board = chess.Board(req.fen)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid FEN string")

    # Select and configure engine
    if req.engine == "alphabeta":
        engine = AlphaBetaEngine(
            depth=req.depth, 
            use_move_ordering=req.use_move_ordering
        )
    elif req.engine == "mcts":
        engine = MCTSEngine(
            iterations=req.mcts_iterations,
            exploration_constant=req.mcts_exploration_constant
        )
    else:
        raise HTTPException(status_code=400, detail="Engine must be 'alphabeta' or 'mcts'")

    # Run the search
    try:
        result = engine.search(board)
        return WhiteboxResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
