import chess
import chess.engine
import asyncio

async def main():
    transport, engine = await chess.engine.popen_uci('engines/stockfish.exe')
    board = chess.Board()
    info = await engine.analyse(board, chess.engine.Limit(time=0.1))
    score = info['score']
    pov_score = score.pov(chess.WHITE)
    print('is_mate exists:', hasattr(pov_score, 'is_mate'))
    print('mate exists:', hasattr(pov_score, 'mate'))
    print('score exists:', hasattr(pov_score, 'score'))
    await engine.quit()

asyncio.run(main())
