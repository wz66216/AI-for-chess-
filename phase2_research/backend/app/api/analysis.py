from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.core.config import settings
from app.schemas.analysis import (
    AnalysisMode,
    AnalyzeMoveRequest,
    AnalyzeMoveResponse,
    GameReviewRequest,
    GameReviewResponse,
    PositionAnalysisRequest,
    PositionAnalysisResponse,
)
from app.services.engine_service import EngineService
from app.services.llm_service import LLMService
from app.services.book_service import BookService
from app.services.game_analysis_service import analyze_full_game
from app.services.game_review_agent import GameReviewAgent
from app.services.position_analysis import PositionAnalysisAgent

router = APIRouter()

class AnalyzeGameRequest(BaseModel):
    pgn: str

def get_engine_service():
    return EngineService()

def get_llm_service():
    return LLMService()

def get_book_service():
    return BookService()

def get_position_analysis_agent():
    return PositionAnalysisAgent()

def get_game_review_agent():
    return GameReviewAgent()

@router.post("/analyze-position", response_model=PositionAnalysisResponse)
async def analyze_position(
    request: PositionAnalysisRequest,
    engine_service: EngineService = Depends(get_engine_service),
    agent: PositionAnalysisAgent = Depends(get_position_analysis_agent),
):
    if not settings.ENABLE_POSITION_ANALYSIS_AGENT:
        raise HTTPException(status_code=503, detail="Position analysis agent is disabled")
    try:
        engine_eval = await engine_service.analyze_position(
            request.fen,
            request.played_move,
        )
        return await agent.analyze(
            fen=request.fen,
            engine_eval=engine_eval,
            played_move=request.played_move,
            analysis_mode=request.analysis_mode,
            audience_level=request.audience_level,
            analysis_depth=request.analysis_depth,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-move", response_model=AnalyzeMoveResponse)
async def analyze_move(
    request: AnalyzeMoveRequest,
    engine_service: EngineService = Depends(get_engine_service),
    llm_service: LLMService = Depends(get_llm_service),
    agent: PositionAnalysisAgent = Depends(get_position_analysis_agent),
):
    try:
        # 第一步：获取引擎分数和最佳走法
        engine_eval = await engine_service.analyze_position(request.fen, request.move)

        if settings.ENABLE_POSITION_ANALYSIS_AGENT:
            agent_result = await agent.analyze(
                fen=request.fen,
                engine_eval=engine_eval,
                played_move=request.move,
                analysis_mode=AnalysisMode.MOVE,
                audience_level=request.audience_level,
                analysis_depth=request.analysis_depth,
            )
            return AnalyzeMoveResponse(
                fen=request.fen,
                move=request.move,
                engine_eval=engine_eval,
                explanation=agent_result.analysis.summary_markdown,
                analysis=agent_result.analysis,
                facts=agent_result.facts,
                validation=agent_result.validation,
            )
        
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

@router.post("/review-game", response_model=GameReviewResponse)
async def review_game(
    request: GameReviewRequest,
    agent: GameReviewAgent = Depends(get_game_review_agent),
):
    """
    接受完整 PGN，先复用 Stockfish 整盘分析，再生成中文 AI 复盘摘要。
    """
    try:
        game_analysis = await analyze_full_game(request.pgn)
        return await agent.review(
            game_analysis=game_analysis,
            audience_level=request.audience_level,
            analysis_depth=request.analysis_depth,
        )
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
