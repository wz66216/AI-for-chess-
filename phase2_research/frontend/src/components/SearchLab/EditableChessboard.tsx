import { Chessboard } from "react-chessboard";

type Props = {
  orientation: "white" | "black";
  fen: string;
  selectedSquare: string | null;
  legalMoveSquares: Set<string>;
  onSquareClick?: (square: string) => void;
};

export default function EditableChessboard({
  orientation,
  fen,
  selectedSquare,
  legalMoveSquares,
  onSquareClick,
}: Props) {
  const customStyles: Record<string, React.CSSProperties> = {};
  if (selectedSquare) {
    customStyles[selectedSquare] = {
      outline: "3px solid #2563eb",
      outlineOffset: "-2px",
    };
  }
  for (const sq of legalMoveSquares) {
    customStyles[sq] = {
      background:
        "radial-gradient(circle, rgba(0,0,0,0.25) 25%, transparent 25%)",
    };
  }

  return (
    <Chessboard
      position={fen}
      boardOrientation={orientation}
      arePiecesDraggable={false}
      customDarkSquareStyle={{ backgroundColor: "#779556" }}
      customLightSquareStyle={{ backgroundColor: "#ebecd0" }}
      onSquareClick={onSquareClick}
      customSquareStyles={customStyles}
    />
  );
}
