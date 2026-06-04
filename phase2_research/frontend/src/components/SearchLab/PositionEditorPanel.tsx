import { useCallback, useRef, useState } from "react";
import type React from "react";
import { Chess, type Square } from "chess.js";

import CommitAnalysisBar from "./CommitAnalysisBar";
import EditableChessboard from "./EditableChessboard";
import FenAdvancedPanel from "./FenAdvancedPanel";
import PieceTray from "./PieceTray";
import PositionSetupControls from "./PositionSetupControls";
import type { EditorState, TrayPiece } from "./positionEditorState";
import {
  applyPiecePlacement,
  clearBoardState,
  createEditorStateFromFen,
  createStartingEditorState,
  editorStateToFen,
  removePieceAtSquare,
  toggleBothCastlingForSide,
} from "./positionEditorState";

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

  const clearSelection = useCallback(() => {
    setPickedUpSquare(null);
    setLegalMoves(new Set());
  }, []);

  const doEdit = useCallback(
    (state: EditorState) => {
      pushHistory(props.editorState);
      props.onEditorChange(state);
    },
    [props, pushHistory],
  );

  const handleUndo = useCallback(() => {
    const prev = undoHistoryRef.current;
    if (prev.length === 0) return;
    const restored = prev[prev.length - 1];
    undoHistoryRef.current = prev.slice(0, -1);
    clearSelection();
    props.onEditorChange(restored);
  }, [clearSelection, props]);

  const legalDestinationsForSquare = useCallback(
    (square: string) => {
      const piece = props.editorState.pieces[square];
      if (!piece || piece[0] !== props.editorState.sideToMove) {
        return new Set<string>();
      }

      try {
        const chess = new Chess(editorStateToFen(props.editorState));
        const moves = chess.moves({ square: square as Square, verbose: true });
        return new Set(moves.map((move) => move.to));
      } catch {
        return new Set<string>();
      }
    },
    [props.editorState],
  );

  const selectSquareIfLegalTurn = useCallback(
    (square: string) => {
      const piece = props.editorState.pieces[square];
      if (!piece || piece[0] !== props.editorState.sideToMove) {
        clearSelection();
        return;
      }
      setPickedUpSquare(square);
      setLegalMoves(legalDestinationsForSquare(square));
    },
    [clearSelection, legalDestinationsForSquare, props.editorState],
  );

  const executeLegalMove = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (props.selectedTrayPiece) return false;
      const piece = props.editorState.pieces[sourceSquare];
      if (!piece || piece[0] !== props.editorState.sideToMove) return false;

      try {
        const chess = new Chess(editorStateToFen(props.editorState));
        const move = chess.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        });
        if (!move) return false;
        clearSelection();
        doEdit(createEditorStateFromFen(chess.fen()));
        return true;
      } catch {
        return false;
      }
    },
    [clearSelection, doEdit, props.editorState, props.selectedTrayPiece],
  );

  const handleBoardSquareClick = (square: string) => {
    if (props.selectedTrayPiece) {
      let next = props.editorState;
      if (next.pieces[square]) {
        next = removePieceAtSquare(next, square);
      }
      next = applyPiecePlacement(next, props.selectedTrayPiece, square);
      clearSelection();
      doEdit(next);
      return;
    }

    if (pickedUpSquare === null) {
      selectSquareIfLegalTurn(square);
      return;
    }

    if (pickedUpSquare === square) {
      clearSelection();
      return;
    }

    if (executeLegalMove(pickedUpSquare, square)) return;

    selectSquareIfLegalTurn(square);
  };

  const handleTrayChange = (piece: TrayPiece | null) => {
    clearSelection();
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
        onPieceDrop={executeLegalMove}
      />
      <div className="space-y-4">
        <PieceTray
          selectedPiece={props.selectedTrayPiece}
          onChange={handleTrayChange}
          onClearBoard={() => {
            doEdit(clearBoardState(props.editorState));
            clearSelection();
          }}
        />
        <PositionSetupControls
          sideToMove={props.editorState.sideToMove}
          castlingRights={props.editorState.castlingRights}
          canUndo={canUndo}
          onSideToMoveChange={(side) => {
            doEdit({ ...props.editorState, sideToMove: side });
            clearSelection();
          }}
          onToggleCastlingSide={(side) => {
            doEdit(toggleBothCastlingForSide(props.editorState, side));
            clearSelection();
          }}
          onResetStartingPosition={() => {
            undoHistoryRef.current = [];
            clearSelection();
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
      </div>
      {props.puzzleSlot}
      <CommitAnalysisBar
        dirty={props.dirty}
        autoRecompute={props.autoRecompute}
        onAutoRecomputeChange={props.onAutoRecomputeChange}
        onConfirm={props.onConfirm}
      />
    </section>
  );
}
