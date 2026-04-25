import math
from enum import Enum

class MoveJudgment(str, Enum):
    BEST = "Best"           # 最佳
    EXCELLENT = "Excellent" # 极佳
    GOOD = "Good"           # 好棋
    INACCURACY = "Inaccuracy" # 缓着
    MISTAKE = "Mistake"       # 失误
    BLUNDER = "Blunder"       # 漏着
    BOOK = "Book"             # 谱招

def cp_to_win_percent(cp: int) -> float:
    """
    Lichess 公式: 将 Centipawn (CP) 分数转化为预期胜率 (0.0 到 100.0)。
    其中 0 分对应 50%，+150 分（1.5）对应更高胜率。
    """
    multiplier = -0.00368208
    try:
        # Lichess WinPercent formula
        win_chances = 2 / (1 + math.exp(multiplier * cp)) - 1
        return 50.0 + 50.0 * win_chances
    except OverflowError:
        return 100.0 if cp > 0 else 0.0

def win_diff_to_accuracy(win_percent_before: float, win_percent_after: float) -> float:
    """
    Lichess 公式: 将这一步的胜率下跌量转化为这步棋的精确度得分 (0-100)。
    如果胜率上升（比如对手失误导致），得分就是 100。
    """
    if win_percent_after >= win_percent_before:
        return 100.0
    
    win_diff = win_percent_before - win_percent_after
    
    # Lichess AccuracyPercent regression curve
    raw = 103.1668100711649 * math.exp(-0.04354415386753951 * win_diff) - 3.166924740191411
    
    # 加上 1.0 的不确定性奖励
    acc = raw + 1.0
    return max(0.0, min(100.0, acc))

def evaluate_judgment(win_diff: float) -> MoveJudgment:
    """
    基于 Lichess 的胜率跌幅阈值判定招法质量。
    注意：win_diff 是正数表示这步棋导致的胜率下降了。
    """
    if win_diff >= 30.0:  # 胜率暴跌 30% 以上 -> 漏着
        return MoveJudgment.BLUNDER
    elif win_diff >= 20.0:  # 胜率跌幅在 20%-30% -> 失误
        return MoveJudgment.MISTAKE
    elif win_diff >= 10.0:  # 胜率跌幅在 10%-20% -> 缓着
        return MoveJudgment.INACCURACY
    elif win_diff >= 5.0:
        return MoveJudgment.GOOD
    elif win_diff >= 2.0:
        return MoveJudgment.EXCELLENT
    else:
        return MoveJudgment.BEST
