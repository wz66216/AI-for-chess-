from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol

import chess

EvaluatorName = Literal["material", "pst", "heuristic"]


PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 0,
}


def _piece_square_table(piece_type: chess.PieceType) -> tuple[int, ...]:
    values: list[int] = []
    for square in chess.SQUARES:
        rank = chess.square_rank(square)
        file = chess.square_file(square)
        center_distance = abs(file - 3.5) + abs(rank - 3.5)

        if piece_type == chess.PAWN:
            value = rank * 6 - int(abs(file - 3.5) * 2)
        elif piece_type == chess.KNIGHT:
            value = int(24 - center_distance * 6)
        elif piece_type == chess.BISHOP:
            value = int(18 - center_distance * 4)
        elif piece_type == chess.ROOK:
            value = rank * 4 - int(abs(file - 3.5) * 2)
        elif piece_type == chess.QUEEN:
            value = int(10 - center_distance * 2)
        elif piece_type == chess.KING:
            value = int(-center_distance * 4)
        else:
            value = 0

        values.append(value)

    return tuple(values)


PST_TABLES = {
    chess.PAWN: _piece_square_table(chess.PAWN),
    chess.KNIGHT: _piece_square_table(chess.KNIGHT),
    chess.BISHOP: _piece_square_table(chess.BISHOP),
    chess.ROOK: _piece_square_table(chess.ROOK),
    chess.QUEEN: _piece_square_table(chess.QUEEN),
    chess.KING: _piece_square_table(chess.KING),
}


class BoardEvaluator(Protocol):
    name: str

    def evaluate(self, board: chess.Board) -> float:
        ...


def available_evaluator_names() -> tuple[EvaluatorName, ...]:
    return ("material", "pst", "heuristic")


def _terminal_score(board: chess.Board) -> float | None:
    if board.is_checkmate():
        return -99999.0 if board.turn == chess.WHITE else 99999.0
    if board.is_stalemate() or board.is_insufficient_material():
        return 0.0
    return None


def _material_score(board: chess.Board) -> float:
    score = 0.0
    for piece_type, piece_value in PIECE_VALUES.items():
        score += len(board.pieces(piece_type, chess.WHITE)) * piece_value
        score -= len(board.pieces(piece_type, chess.BLACK)) * piece_value
    return score


def _pst_score(board: chess.Board) -> float:
    score = 0.0
    for piece_type, table in PST_TABLES.items():
        for square in board.pieces(piece_type, chess.WHITE):
            score += table[square]
        for square in board.pieces(piece_type, chess.BLACK):
            score -= table[chess.square_mirror(square)]
    return score


def _mobility_score(board: chess.Board) -> float:
    white_board = board.copy(stack=False)
    white_board.turn = chess.WHITE
    black_board = board.copy(stack=False)
    black_board.turn = chess.BLACK
    return 5.0 * (white_board.legal_moves.count() - black_board.legal_moves.count())


def _pawn_structure_score(board: chess.Board) -> float:
    score = 0.0
    for color, sign in ((chess.WHITE, 1.0), (chess.BLACK, -1.0)):
        pawns = board.pieces(chess.PAWN, color)
        files = [chess.square_file(square) for square in pawns]

        for file_index in set(files):
            count = files.count(file_index)
            if count > 1:
                score -= sign * 12.0 * (count - 1)

        for square in pawns:
            file_index = chess.square_file(square)
            if file_index - 1 not in files and file_index + 1 not in files:
                score -= sign * 8.0

    return score


def _king_safety_score(board: chess.Board) -> float:
    score = 0.0
    for color, sign in ((chess.WHITE, 1.0), (chess.BLACK, -1.0)):
        king_square = board.king(color)
        if king_square is None:
            continue
        if king_square in {chess.G1, chess.C1, chess.G8, chess.C8}:
            score += sign * 35.0
        elif king_square in {chess.E1, chess.E8}:
            score -= sign * 15.0
    return score


@dataclass(slots=True)
class MaterialEvaluator:
    name: str = "material"

    def evaluate(self, board: chess.Board) -> float:
        terminal_score = _terminal_score(board)
        if terminal_score is not None:
            return terminal_score
        return _material_score(board)


@dataclass(slots=True)
class PstEvaluator:
    name: str = "pst"

    def evaluate(self, board: chess.Board) -> float:
        terminal_score = _terminal_score(board)
        if terminal_score is not None:
            return terminal_score
        return _material_score(board) + _pst_score(board)


@dataclass(slots=True)
class HeuristicEvaluator:
    name: str = "heuristic"

    def evaluate(self, board: chess.Board) -> float:
        terminal_score = _terminal_score(board)
        if terminal_score is not None:
            return terminal_score
        return (
            _material_score(board)
            + _pst_score(board)
            + _mobility_score(board)
            + _pawn_structure_score(board)
            + _king_safety_score(board)
        )


def build_evaluator(name: EvaluatorName) -> BoardEvaluator:
    if name == "material":
        return MaterialEvaluator()
    if name == "pst":
        return PstEvaluator()
    if name == "heuristic":
        return HeuristicEvaluator()
    raise ValueError(f"Unknown evaluator: {name}")
