import chess

from app.schemas.analysis import EngineEvaluation, PositionFacts, ScoreSummary


class PositionFactsBuilder:
    def build(
        self,
        fen: str,
        engine_eval: EngineEvaluation,
        played_move: str | None = None,
    ) -> PositionFacts:
        board = chess.Board(fen)
        legal_moves_san: list[str] = []
        legal_moves_uci: list[str] = []

        for move in board.legal_moves:
            legal_moves_uci.append(move.uci())
            legal_moves_san.append(board.san(move))

        top_line = engine_eval.lines[0] if engine_eval.lines else None
        return PositionFacts(
            side_to_move="white" if board.turn == chess.WHITE else "black",
            played_move_san=self._played_move_san(board, played_move),
            is_check=board.is_check(),
            is_mate=bool(top_line and top_line.is_mate) or board.is_checkmate(),
            is_stalemate=board.is_stalemate(),
            score_summary=self._score_summary(engine_eval),
            legal_moves_san=legal_moves_san,
            legal_moves_uci=legal_moves_uci,
            engine_candidate_moves=[line.best_move for line in engine_eval.lines],
            engine_pv_moves=[move for line in engine_eval.lines for move in line.pv],
        )

    def _played_move_san(
        self,
        board: chess.Board,
        played_move: str | None,
    ) -> str | None:
        if not played_move:
            return None

        move = self._parse_move(board, played_move)
        if move not in board.legal_moves:
            raise ValueError("played_move is not legal in the supplied FEN")
        return board.san(move)

    def _parse_move(self, board: chess.Board, played_move: str) -> chess.Move:
        try:
            return chess.Move.from_uci(played_move)
        except ValueError:
            try:
                return board.parse_san(played_move)
            except ValueError as exc:
                raise ValueError("played_move is not legal in the supplied FEN") from exc

    def _score_summary(self, engine_eval: EngineEvaluation) -> ScoreSummary:
        if not engine_eval.lines:
            return ScoreSummary.EQUAL

        top = engine_eval.lines[0]
        if top.is_mate:
            return ScoreSummary.MATE
        if top.score > 0.35:
            return ScoreSummary.WHITE_BETTER
        if top.score < -0.35:
            return ScoreSummary.BLACK_BETTER
        return ScoreSummary.EQUAL
