import asyncio
import chess.engine
import os

async def main():
    path = 'engines/stockfish.exe'
    print('Path exists:', os.path.exists(path))
    try:
        transport, engine = await chess.engine.popen_uci(path)
        print('Started engine')
        await engine.quit()
    except Exception as e:
        print('Error:', type(e), repr(e))

asyncio.run(main())
