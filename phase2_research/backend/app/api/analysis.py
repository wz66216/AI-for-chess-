from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any

from app.schemas.analysis import AnalyzeMoveRequest, AnalyzeMoveResponse
from app.services.engine_service import EngineService
from app.services.llm_service import LLMService
from app.services.book_service import BookService
from app.services.game_analysis_service import analyze_full_game

router = APIRouter()

class AnalyzeGameRequest(BaseModel):
    pgn: str

def get_engine_service():
    return EngineService()

def get_llm_service():
    return LLMService()

def get_book_service():
    return BookService()

@router.post("/analyze-move", response_model=AnalyzeMoveResponse)
async def analyze_move(
    request: AnalyzeMoveRequest,
    engine_service: EngineService = Depends(get_engine_service),
    llm_service: LLMService = Depends(get_llm_service)
):
    try:
        # 第一步：获取引擎分数和最佳走法
        engine_eval = await engine_service.analyze_position(request.fen, request.move)
        
        # 第二步：调用 DeepSeek (OpenAI 兼容)
        explanation = await llm_service.explain_move(request.fen, request.move, engine_eval)
        
        return AnalyzeMoveResponse(
            fen=request.fen,
            move=request.move,
            engine_eval=engine_eval,
            explanation=explanation
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-game")
async def analyze_game(request: AnalyzeGameRequest):
    """
    接受一段完整的 PGN，用 Stockfish 计算出每一步的评级与全局精确度。
    """
    try:
        result = await analyze_full_game(request.pgn)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/opening-book")
async def get_opening_book(
    fen: str,
    book_service: BookService = Depends(get_book_service)
):
    """
    获取开局库数据
    """
    try:
        moves = book_service.get_book_moves(fen)
        return {"moves": moves}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

