import { useRef, useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { Chess } from "chess.js";
import { runWhiteboxSearch } from "../../api/whitebox";
import type {
  SearchConfig,
  SearchTreeNode,
  WhiteboxResult,
} from "../../types/whitebox";
import EvaluatorSelector from "./EvaluatorSelector";
import PuzzleImporter from "./PuzzleImporter";
import PositionEditorPanel from "./PositionEditorPanel";
import PositionInspector from "./PositionInspector";
import SearchHyperparamsPanel from "./SearchHyperparamsPanel";
import SearchRunHistory, { type SearchRunRecord } from "./SearchRunHistory";
import SearchResultSummary from "./SearchResultSummary";
import SearchTreeExplorer from "./SearchTreeExplorer";
import { makeRunId } from "./runIds";
import {
  DEFAULT_EDITOR_FEN,
  createEditorStateFromFen,
  createStartingEditorState,
  editorStateToFen,
  type EditorState,
  type TrayPiece,
} from "./positionEditorState";

const DEFAULT_CONFIG: SearchConfig = {
  engine: "alphabeta",
  evaluator: "material",
  depth: 2,
  useMoveOrdering: true,
  mctsIterations: 100,
  mctsExplorationConstant: 1.41,
};
const INVALID_FEN_MESSAGE =
  "FEN 格式无效，请检查棋盘、行棋方、易位权利和回合数。";
const SEARCH_FAILED_MESSAGE = "搜索失败，请稍后重试。";

export default function SearchWorkbench() {
  const requestIdRef = useRef(0);
  const runIdCounterRef = useRef(0);
  const [editingPosition, setEditingPosition] = useState<EditorState>(
    createStartingEditorState(),
  );
  const [committedPosition, setCommittedPosition] = useState<EditorState>(
    createStartingEditorState(),
  );
  const [fenDraft, setFenDraft] = useState(DEFAULT_EDITOR_FEN);
  const [selectedTrayPiece, setSelectedTrayPiece] = useState<TrayPiece | null>(
    null,
  );
  const [autoRecompute, setAutoRecompute] = useState(false);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">(
    "white",
  );
  const [inspectorNode, setInspectorNode] = useState<SearchTreeNode | null>(
    null,
  );
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [result, setResult] = useState<WhiteboxResult | null>(null);
  const [resultRootFen, setResultRootFen] = useState<string | null>(null);
  const [runs, setRuns] = useState<SearchRunRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const editingFen = editorStateToFen(editingPosition);

  const [importedFromAnalysis, setImportedFromAnalysis] = useState(false);

  // On mount, read ?fen= from URL query
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fen = params.get("fen");
    if (fen) {
      try {
        new Chess(fen);
        const state = createEditorStateFromFen(fen);
        setEditingPosition(state);
        setCommittedPosition(state);
        setFenDraft(fen);
        setImportedFromAnalysis(true);
      } catch {
        // ignore invalid fen
      }
    }
  }, []);
  const committedFen = editorStateToFen(committedPosition);
  const isDirty = editingFen !== committedFen;
  const hasConfirmedPosition = resultRootFen !== null;
  const fenValidationMessage = (() => {
    try {
      new Chess(fenDraft);
      return "";
    } catch {
      return INVALID_FEN_MESSAGE;
    }
  })();

  const runSearch = async (fen: string, searchConfig: SearchConfig) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const next = await runWhiteboxSearch(fen, searchConfig);
      if (requestIdRef.current !== requestId) return;

      // Convert UCI best_move to SAN for display
      try {
        const chess = new Chess(fen);
        const move = chess.move(next.best_move);
        if (move) {
          next.best_move = move.san;
        }
      } catch {
        // keep raw UCI if conversion fails
      }

      setResult(next);
      setResultRootFen(fen);
      setInspectorNode(null);
      setRuns((previous) => {
        runIdCounterRef.current += 1;
        return [
          {
            id: makeRunId(
              globalThis.crypto?.randomUUID?.bind(globalThis.crypto),
              runIdCounterRef.current,
            ),
            fen,
            config: searchConfig,
            result: next,
            createdAt: new Date().toISOString(),
          },
          ...previous,
        ].slice(0, 8);
      });
    } catch {
      if (requestIdRef.current !== requestId) return;
      setError(SEARCH_FAILED_MESSAGE);
      setResult(null);
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  };

  const handleConfirm = async (state: EditorState = editingPosition) => {
    const fen = editorStateToFen(state);
    setError("");
    setCommittedPosition(state);
    setFenDraft(fen);
    setInspectorNode(null);
    await runSearch(fen, config);
  };

  const cancelSearch = () => {
    // Increment requestId so any in-flight response is silently discarded
    requestIdRef.current += 1;
    setLoading(false);
  };

  const handlePuzzleImport = (fen: string) => {
    setFenDraft(fen);
    try {
      new Chess(fen);
      const state = createEditorStateFromFen(fen);
      setEditingPosition(state);
      setCommittedPosition(state);
      setSelectedTrayPiece(null);
      setError("");
    } catch {
      setError(INVALID_FEN_MESSAGE);
    }
  };

  const handleApplyFen = () => {
    try {
      new Chess(fenDraft);
      const next = createEditorStateFromFen(fenDraft);
      setEditingPosition(next);
      setSelectedTrayPiece(null);
      setError("");
    } catch {
      setError(INVALID_FEN_MESSAGE);
    }
  };

  const handleEditorChange = (next: EditorState) => {
    setEditingPosition(next);
    setFenDraft(editorStateToFen(next));
    if (autoRecompute && hasConfirmedPosition && !loading) {
      void handleConfirm(next);
    }
  };

  const handleTreeSelect = useCallback((node: SearchTreeNode) => {
    setInspectorNode(node);
    try {
      const nodeFen =
        (node.metadata as Record<string, unknown> | undefined)?.fen;
      if (typeof nodeFen === "string") {
        const state = createEditorStateFromFen(nodeFen);
        setEditingPosition(state);
        setCommittedPosition(state);
        setFenDraft(nodeFen);
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
          Search Lab
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          搜索实验室
        </h2>
        <p className="text-sm leading-6 text-slate-600">
          探索不同搜索策略对局面评估的影响。先在上方设置局面，再在下方查看指标、搜索树与局面详情。
        </p>
        {importedFromAnalysis ? (
          <Link
            to="/"
            className="inline-block text-sm text-indigo-600 underline hover:text-indigo-800"
          >
            ← 回到分析页继续对局
          </Link>
        ) : null}
      </header>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-slate-900">
            局面设定工作台
          </h3>
          <p className="text-sm text-slate-600">
            通过摆子或导入 FEN
            配置起始局面；点击确认后开始计算，后续仍可继续编辑棋盘。
          </p>
        </div>
        <PositionEditorPanel
          editorState={editingPosition}
          boardOrientation={boardOrientation}
          selectedTrayPiece={selectedTrayPiece}
          autoRecompute={autoRecompute}
          fenDraft={fenDraft}
          fenError={fenValidationMessage}
          dirty={isDirty}
          onEditorChange={handleEditorChange}
          onTrayPieceChange={setSelectedTrayPiece}
          onBoardOrientationChange={setBoardOrientation}
          onAutoRecomputeChange={setAutoRecompute}
          onFenDraftChange={setFenDraft}
          onApplyFen={handleApplyFen}
          onCopyFen={() => void navigator.clipboard?.writeText(editingFen)}
          onConfirm={() => void handleConfirm()}
        />
        <PuzzleImporter onImportFen={handlePuzzleImport} />
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-slate-900">
            搜索分析工作台
          </h3>
          <p className="text-sm text-slate-600">
            当前分析基于最近一次确认局面；点击搜索树节点后，局面检查器会切换到对应节点。
          </p>
        </div>
        <SearchHyperparamsPanel
          config={config}
          onChange={(patch) => setConfig((prev) => ({ ...prev, ...patch }))}
        />
        {config.engine === "alphabeta" ? (
          <EvaluatorSelector
            value={config.evaluator}
            onChange={(value) =>
              setConfig((prev) => ({ ...prev, evaluator: value }))
            }
          />
        ) : null}
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {error}
          </div>
        ) : null}
        {loading ? (
          <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <span className="text-sm font-medium text-blue-800">
              正在搜索，请稍候…
            </span>
            <button
              type="button"
              className="ml-auto rounded-lg border border-red-300 bg-white px-3 py-1 text-sm font-medium text-red-600 transition hover:bg-red-50"
              onClick={cancelSearch}
            >
              停止
            </button>
          </div>
        ) : null}
        {result && isDirty ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            当前棋盘已变更，以下结果仍基于上一次确认局面。
          </div>
        ) : null}
        <SearchResultSummary result={result} loading={loading} />
        <SearchTreeExplorer
          tree={result?.tree ?? null}
          onNodeSelect={handleTreeSelect}
        />
        <PositionInspector
          rootFen={resultRootFen ?? committedFen}
          committedFen={committedFen}
          node={inspectorNode}
        />
        <SearchRunHistory
          runs={runs}
          onRestore={(run) => {
            requestIdRef.current += 1;
            const restored = createEditorStateFromFen(run.fen);
            setEditingPosition(restored);
            setCommittedPosition(restored);
            setFenDraft(run.fen);
            setSelectedTrayPiece(null);
            setConfig(run.config);
            setResult(run.result);
            setResultRootFen(run.fen);
            setInspectorNode(null);
            setError("");
            setLoading(false);
          }}
          onClear={() => setRuns([])}
        />
      </section>
    </div>
  );
}
