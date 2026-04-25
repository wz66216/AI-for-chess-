import os
import httpx
from typing import List, Dict, Any
import chess
from dotenv import load_dotenv

load_dotenv()

class BookService:
    def __init__(self):
        # 抛弃本地 .bin 文件，使用 Lichess 官方云端 Masters 开局库 API
        # Lichess 最新要求该接口需配置 OAuth 凭证以防止滥用
        self.api_url = "https://explorer.lichess.org/masters"
        self.token = os.getenv("LICHESS_API_TOKEN", "")

    def get_book_moves(self, fen: str) -> List[Dict[str, Any]]:
        """
        通过 Lichess 官方 Opening Explorer API 获取当前局面的大师对局谱招
        """
        try:
            # Lichess API 强烈要求在请求头携带 User-Agent 标识
            headers = {
                "User-Agent": "ChessExplain/1.0 (https://github.com/your-username/ChessExplain)",
                "Accept": "application/json"
            }
            if self.token:
                headers["Authorization"] = f"Bearer {self.token}"
            
            # play=0 表示不执行实际的走子，只查当前局面
            # fen 参数即当前的局面 FEN 字符串
            params = {
                "fen": fen,
                "moves": 10,   # 获取前 10 种大师最常走的开局变例
                "topGames": 0  # 我们只关心统计数据，不需要具体的对局列表，以节省带宽
            }
            
            with httpx.Client() as client:
                response = client.get(self.api_url, headers=headers, params=params, timeout=5)
                
                # 如果遇到 401 报错，给予开发者明确的指引
                if response.status_code == 401:
                    print("============ [Lichess 开局库授权失败] ============")
                    print("由于 Lichess 的反爬策略更新，调用 Opening Explorer 必须提供 API Token。")
                    print("请在 https://lichess.org/account/oauth/token 申请一个免费的 Access Token。")
                    print("然后在 backend/.env 中配置 LICHESS_API_TOKEN=lip_xxxxxx")
                    print("==================================================")
                    return []

                response.raise_for_status()
                data = response.json()
            
            moves = []
            if "moves" in data:
                for m in data["moves"]:
                    # Lichess 提供白胜、和棋、黑胜的三种独立统计。我们将其加起来作为这一步的总“权重/热度”
                    total_games = m.get("white", 0) + m.get("draws", 0) + m.get("black", 0)
                    moves.append({
                        "san": m.get("san"),
                        "uci": m.get("uci"),
                        "weight": total_games
                    })
            
            # 按对局数(权重)从高到低排序（Lichess 默认已经排好了，保险起见再排一次）
            moves.sort(key=lambda x: x["weight"], reverse=True)
            return moves
            
        except Exception as e:
            print(f"请求 Lichess 开局库 API 失败: {e}")
            return []
