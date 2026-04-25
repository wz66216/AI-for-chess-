import os
from openai import AsyncOpenAI
from app.core.config import settings
from app.schemas.analysis import EngineEvaluation

class LLMService:
    def __init__(self):
        api_key = settings.DEEPSEEK_API_KEY
        
        # 兼容 OpenAI SDK，指向 DeepSeek 接口
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com"
        )
        self.model = settings.LLM_MODEL  # 默认 'deepseek-reasoner'

    async def explain_move(self, fen: str, move: str, engine_eval: EngineEvaluation) -> str:
        if not self.client.api_key:
            return "未配置 DeepSeek API Key，无法生成语言解释。请在 .env 中设置 DEEPSEEK_API_KEY。"

        # 整理一二三选的文本给大模型
        engine_options_text = ""
        for i, line in enumerate(engine_eval.lines):
            score_text = f"M{line.mate_score} (杀棋)" if line.is_mate else f"{line.score:+.2f}"
            pv_text = " -> ".join(line.pv) if line.pv else "无"
            engine_options_text += f"第{i+1}选: 走法 {line.best_move} | 评分: {score_text} | 变例: {pv_text}\n"
            
        # 玩家走后的最佳线路作为比较基准
        top_line = engine_eval.lines[0] if engine_eval.lines else None
        
        prompt = f"""
        你是一位顶级国际象棋特级大师（Grandmaster）兼王牌教练。
        所有的招法都使用标准代数记谱法 (SAN) 比如 Nf3, O-O, exd5 等。
        
        走棋前的局面 FEN: {fen}
        玩家实际走出的招法 (UCI格式，请你在大脑中转为标准记谱): {move}
        
        玩家走棋后，Stockfish 引擎对当前局面的推演（白方视角）:
        {engine_options_text}
        
        请用通俗易懂的语言，完成以下分析:
        1. 玩家走出这步棋的意图是什么？（评价这步棋的质量，是否存在漏看战术或送子的情况）
        2. 对比引擎的推荐（一二三选），给玩家解释为什么引擎的最佳招法更好？主要威胁或战术是什么？
        3. 给出后续如何应对（围绕引擎的一选思路）的具体一句话建议。
        
        输出要求：
        - 语气要有教练的耐心和鼓励。
        - **必须使用标准代数记谱法 (SAN, 比如 Nxd4, Bc4, 0-0)** 来指代棋子和招法，绝对不要用冰冷的座标法(如 e2e4)。
        - 结构清晰，排版舒适（使用 Markdown）。
        """

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一位专业且耐心的国际象棋分析助手与特级大师教练。请始终使用人类习惯的标准代数记谱法(SAN)。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"调用 DeepSeek API 时发生错误: {str(e)}"
