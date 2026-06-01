import EditableChessboard from "./EditableChessboard";
import PieceTray from "./PieceTray";
import PositionSetupControls from "./PositionSetupControls";
import FenAdvancedPanel from "./FenAdvancedPanel";
import CommitAnalysisBar from "./CommitAnalysisBar";
import type { EditorState, TrayPiece } from "./positionEditorState";
import {
  applyPiecePlacement,
  clearBoardState,
  createStartingEditorState,
  editorStateToFen,
  removePieceAtSquare,
  toggleBothCastlingForSide,
} from "./positionEditorState";
import { Chess } from "chess.js";
import { useState, useRef, useCallback } from "react";
import React from "react";

type Props = {
  editorState: EditorState;
  boardOrientation: "white" | "black";
  selectedTrayPiece: TrayPiece | null;
  autoRecompute: boolean;
  fenDraft: string;
  fenError: string;
  dirty: boolean;
  onEditorChange: (state: EditorState) => void;
  onTrayPieceChange: (piece: TrayPiece | null) => void;
  onBoardOrientationChange: (orientation: "white" | "black") => void;
  onAutoRecomputeChange: (next: boolean) => void;
  onFenDraftChange: (fen: string) => void;
  onApplyFen: () => void;
  onCopyFen: () => void;
  onConfirm: () => void;
  puzzleSlot?: React.ReactNode;
};

export default function PositionEditorPanel(props: Props) {
  const [pickedUpSquare, setPickedUpSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<Set<string>>(new Set());
  const undoHistoryRef = useRef<EditorState[]>([]);
  const canUndo = undoHistoryRef.current.length > 0;

  const pushHistory = useCallback((state: EditorState) => {
    undoHistoryRef.current = [...undoHistoryRef.current.slice(-99), state];
  }, []);

  const handleUndo = useCallback(() => {
    const prev = undoHistoryRef.current;
    if (prev.length === 0) return;
    const restored = prev[prev.length - 1];
    undoHistoryRef.current = prev.slice(0, -1);
    setPickedUpSquare(null);
    setLegalMoves(new Set());
    props.onEditorChange(restored);
  }, [props]);

  const doEdit = useCallback(
    (state: EditorState) => {
      pushHistory(props.editorState);
      props.onEditorChange(state);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.editorState, props.onEditorChange, pushHistory],
  );

  const handleBoardSquareClick = (square: string) => {
    // Mode 1: tray piece selected → free placement (no chess rules)
    if (props.selectedTrayPiece) {
      let next = props.editorState;
      if (next.pieces[square]) {
        next = removePieceAtSquare(next, square);
      }
      next = applyPiecePlacement(next, props.selectedTrayPiece, square);
      setPickedUpSquare(null);
      setLegalMoves(new Set());
      doEdit(next);
      return;
    }

    // Mode 2: click-to-move with legal-move validation
    const pieceOnSquare = props.editorState.pieces[square];

    if (pickedUpSquare === null) {
      // Try to pick up a piece from the board
      if (pieceOnSquare) {
        // Compute legal moves for this piece using chess.js.
        // If the side-to-move doesn't match (e.g. picking black when white to move),
        // flip the side-to-move in the FEN and try again.
        try {
          const fen = editorStateToFen(props.editorState);
          const chess = new Chess(fen);
          let moves = chess.moves({
            square: square as import("chess.js").Square,
            verbose: true,
          });
          if (moves.length === 0) {
            // Flip side-to-move and retry
            const parts = fen.split(" ");
            parts[1] = parts[1] === "w" ? "b" : "w";
            const flipped = new Chess(parts.join(" "));
            moves = flipped.moves({
              square: square as import("chess.js").Square,
              verbose: true,
            });
          }
          const destinations = new Set(
            (Array.isArray(moves) ? moves : []).map((m) =>
              typeof m === "string" ? m : m.to,
            ),
          );
          setPickedUpSquare(square);
          setLegalMoves(destinations);
        } catch {
          setPickedUpSquare(square);
          setLegalMoves(new Set());
        }
      }
      return;
    }

    // A square is already picked up
    if (pickedUpSquare === square) {
      setPickedUpSquare(null);
      setLegalMoves(new Set());
      return;
    }

    const movingPiece = props.editorState.pieces[pickedUpSquare];
    if (!movingPiece) {
      setPickedUpSquare(null);
      setLegalMoves(new Set());
      return;
    }

    // Validate move via chess.js if legal moves were computed
    if (legalMoves.size > 0 && !legalMoves.has(square)) {
      // Not a legal destination → deselect and ignore
      setPickedUpSquare(null);
      setLegalMoves(new Set());
      return;
    }

    // Execute the move
    let next = props.editorState;
    next = removePieceAtSquare(next, pickedUpSquare);
    // Capture target piece if present
    if (next.pieces[square]) {
      next = removePieceAtSquare(next, square);
    }
    next = applyPiecePlacement(next, movingPiece, square);
    // Flip side-to-move: a chess move always alternates turns
    next = { ...next, sideToMove: next.sideToMove === "w" ? "b" : "w" };
    setPickedUpSquare(null);
    setLegalMoves(new Set());
    doEdit(next);
  };

  // Clear board selection when a tray piece changes
  const handleTrayChange = (piece: TrayPiece | null) => {
    setPickedUpSquare(null);
    setLegalMoves(new Set());
    props.onTrayPieceChange(piece);
  };

  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <EditableChessboard
        orientation={props.boardOrientation}
        fen={editorStateToFen(props.editorState)}
        selectedSquare={pickedUpSquare}
        legalMoveSquares={legalMoves}
        onSquareClick={handleBoardSquareClick}
      />
      <div className="space-y-4">
        <PieceTray
          selectedPiece={props.selectedTrayPiece}
          onChange={handleTrayChange}
        />
        <PositionSetupControls
          sideToMove={props.editorState.sideToMove}
          castlingRights={props.editorState.castlingRights}
          canUndo={canUndo}
          onSideToMoveChange={(side) => {
            doEdit({ ...props.editorState, sideToMove: side });
          }}
          onToggleCastlingSide={(side) => {
            doEdit(toggleBothCastlingForSide(props.editorState, side));
          }}
          onClearBoard={() => {
            doEdit(clearBoardState(props.editorState));
            setPickedUpSquare(null);
            setLegalMoves(new Set());
          }}
          onResetStartingPosition={() => {
            undoHistoryRef.current = [];
            setPickedUpSquare(null);
            setLegalMoves(new Set());
            props.onEditorChange(createStartingEditorState());
          }}
          onSwapOrientation={() =>
            props.onBoardOrientationChange(
              props.boardOrientation === "white" ? "black" : "white",
            )
          }
          onUndo={handleUndo}
        />
        <FenAdvancedPanel
          fenDraft={props.fenDraft}
          fenError={props.fenError}
          onFenDraftChange={props.onFenDraftChange}
          onApplyFen={props.onApplyFen}
          onCopyFen={props.onCopyFen}
        />
        <CommitAnalysisBar
          dirty={props.dirty}
          autoRecompute={props.autoRecompute}
          onAutoRecomputeChange={props.onAutoRecomputeChange}
          onConfirm={props.onConfirm}
        />
        {props.puzzleSlot}
      </div>
    </section>
  );
}
