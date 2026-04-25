import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PVLine {
  score: number;
  is_mate: boolean;
  mate_score: number | null;
  best_move: string;
  pv: string[];
}

interface AnalysisResponse {
  engine_eval: {
    lines: PVLine[];
  };
  explanation: string;
}

interface AnalyzedMove {
  move_number: number;
  color: string;
  san: string;
  uci: string;
  fen: string;
  eval_cp: number;
  win_percent: number;
  player_win_percent: number;
  win_diff: number;
  accuracy: number;
  judgment: string;
}

interface GameAnalysisResponse {
  headers: Record<string, string>;
  global_accuracy: {
    white: number;
    black: number;
  };
  judgments: {
    white: Record<string, number>;
    black: Record<string, number>;
  };
  moves: AnalyzedMove[];
}

interface BookMove {
  san: string;
  uci: string;
  weight: number;
}

export const ChessGame: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookMoves, setBookMoves] = useState<BookMove[]>([]);
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [lastMoveInfo, setLastMoveInfo] = useState<{fen: string, uciMove: string} | null>(null);

  // Keyboard shortcut states
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [redoStack, setRedoStack] = useState<any[]>([]);

  const [showPgnModal, setShowPgnModal] = useState(false);
  const [pgnInput, setPgnInput] = useState("");
  const [gameAnalysis, setGameAnalysis] = useState<GameAnalysisResponse | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [analyzingGame, setAnalyzingGame] = useState(false);

  useEffect(() => {
    fetchBookMoves(game.fen());
  }, [game]);

  async function fetchBookMoves(fen: string) {
    try {
      const response = await axios.get<{ moves: BookMove[] }>(`http://localhost:8000/api/v1/opening-book?fen=${encodeURIComponent(fen)}`);
      setBookMoves(response.data.moves);
    } catch (error) {
      console.error("Failed to fetch opening book moves:", error);
    }
  }

  const handlePreviousMove = () => {
    if (gameAnalysis) {
      goToMove(Math.max(-1, currentMoveIndex - 1));
    } else {
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn());
      const move = gameCopy.undo();
      if (move) {
        setRedoStack(prev => [move, ...prev]);
        setGame(gameCopy);
        setAnalysis(null);
        setLastMoveInfo(null);
      }
    }
  };

  const handleNextMove = () => {
    if (gameAnalysis) {
      goToMove(Math.min(gameAnalysis.moves.length - 1, currentMoveIndex + 1));
    } else {
      if (redoStack.length > 0) {
        const move = redoStack[0];
        const gameCopy = new Chess();
        gameCopy.loadPgn(game.pgn());
        gameCopy.move(move);
        setRedoStack(prev => prev.slice(1));
        setGame(gameCopy);
        setAnalysis(null);
        setLastMoveInfo(null);
      }
    }
  };

  const handleStartMove = () => {
    if (gameAnalysis) {
      goToMove(-1);
    } else {
      const history = game.history({ verbose: true });
      if (history.length > 0) {
        setRedoStack(prev => [...history, ...prev]);
        setGame(new Chess());
        setAnalysis(null);
        setLastMoveInfo(null);
      }
    }
  };

  const handleEndMove = () => {
    if (gameAnalysis) {
      goToMove(gameAnalysis.moves.length - 1);
    } else {
      if (redoStack.length > 0) {
        const gameCopy = new Chess();
        gameCopy.loadPgn(game.pgn());
        redoStack.forEach(m => gameCopy.move(m));
        setRedoStack([]);
        setGame(gameCopy);
        setAnalysis(null);
        setLastMoveInfo(null);
      }
    }
  };

  const handlePlayBestBookMove = () => {
    if (gameAnalysis || currentMoveIndex !== -1) return; // Not during game review
    if (bookMoves.length > 0) {
      const bestMove = bookMoves[0];
      const fenBeforeMove = game.fen();
      
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn());
      
      try {
        const moveResult = gameCopy.move(bestMove.san);
        if (moveResult) {
          setGame(gameCopy);
          setRedoStack([]);
          
          const uciMove = moveResult.from + moveResult.to + (moveResult.promotion || '');
          setLastMoveInfo({ fen: fenBeforeMove, uciMove: uciMove });
          
          if (autoAnalyze) {
            analyzeMove(fenBeforeMove, uciMove);
          } else {
            setAnalysis(null);
          }
        }
      } catch (e) {
        console.error("Invalid book move", e);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in a textarea or input
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case 'ArrowLeft':
          handlePreviousMove();
          e.preventDefault();
          break;
        case 'ArrowRight':
          handleNextMove();
          e.preventDefault();
          break;
        case 'ArrowUp':
          handleStartMove();
          e.preventDefault();
          break;
        case 'ArrowDown':
          handleEndMove();
          e.preventDefault();
          break;
        case ' ':
        case 'Spacebar':
          handlePlayBestBookMove();
          e.preventDefault();
          break;
        case 'f':
        case 'F':
          setBoardOrientation(prev => prev === 'white' ? 'black' : 'white');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game, gameAnalysis, currentMoveIndex, redoStack, bookMoves, autoAnalyze]);

  function onDrop(sourceSquare: string, targetSquare: string) {
    const fenBeforeMove = game.fen();
    
    try {
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn());
      const moveResult = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', 
      });
      
      if (moveResult === null) return false;
      
      setGame(gameCopy);
      setRedoStack([]); // Clear redo stack on new move branch
      
      // If we are in Analysis mode, automatically drop out of it when moving freely
      if (gameAnalysis) {
        setGameAnalysis(null);
        setCurrentMoveIndex(-1);
      }
      
      const uciMove = moveResult.from + moveResult.to + (moveResult.promotion || '');
      
      setLastMoveInfo({ fen: fenBeforeMove, uciMove: uciMove });
      
      if (autoAnalyze) {
        analyzeMove(fenBeforeMove, uciMove);
      } else {
        setAnalysis(null);
      }
      
      return true;
    } catch (e) {
      return false;
    }
  }

  async function analyzeMove(fen: string, uciMove: string) {
    setLoading(true);
    setAnalysis(null);
    
    try {
      const response = await axios.post<AnalysisResponse>('http://localhost:8000/api/v1/analyze-move', {
        fen: fen,
        move: uciMove
      });
      setAnalysis(response.data);
    } catch (error) {
      console.error("Analysis request failed:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyzeGame() {
    if (!pgnInput.trim()) return;
    setAnalyzingGame(true);
    try {
      const response = await axios.post<GameAnalysisResponse>('http://localhost:8000/api/v1/analyze-game', {
        pgn: pgnInput
      });
      setGameAnalysis(response.data);
      setShowPgnModal(false);
      setCurrentMoveIndex(-1);
      setGame(new Chess()); // Reset to start
      setAnalysis(null);
      setLastMoveInfo(null);
      setRedoStack([]);
    } catch (error) {
      console.error("Game analysis failed:", error);
      alert("解析 PGN 失败，请确保格式正确且包含合法的对局谱。");
    } finally {
      setAnalyzingGame(false);
    }
  }

  function goToMove(index: number) {
    if (!gameAnalysis) return;
    setCurrentMoveIndex(index);
    if (index === -1) {
      setGame(new Chess());
      setAnalysis(null);
      setLastMoveInfo(null);
    } else {
      const move = gameAnalysis.moves[index];
      setGame(new Chess(move.fen));
      
      let prevFen = new Chess().fen();
      if (index > 0) prevFen = gameAnalysis.moves[index - 1].fen;
      
      setLastMoveInfo({ fen: prevFen, uciMove: move.uci });
      if (autoAnalyze) {
        analyzeMove(prevFen, move.uci);
      } else {
        setAnalysis(null);
      }
    }
  }

  function renderMoveList() {
    if (gameAnalysis) {
      const moves = gameAnalysis.moves;
      const pairs = [];
      for (let i = 0; i < moves.length; i += 2) {
        pairs.push({ white: moves[i], black: moves[i + 1] });
      }
      return (
        <div className="flex flex-wrap gap-2 text-sm font-mono p-1">
          {pairs.map((pair, idx) => (
            <div key={idx} className="flex gap-2 w-full sm:w-auto">
              <span className="text-slate-400 w-6 text-right select-none">{idx + 1}.</span>
              <span 
                className={`cursor-pointer px-1.5 rounded transition-colors ${currentMoveIndex === idx * 2 ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
                onClick={() => goToMove(idx * 2)}
              >
                {pair.white.san}
              </span>
              {pair.black && (
                <span 
                  className={`cursor-pointer px-1.5 rounded transition-colors ${currentMoveIndex === idx * 2 + 1 ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
                  onClick={() => goToMove(idx * 2 + 1)}
                >
                  {pair.black.san}
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }

    const history = game.history();
    const future = redoStack.map(m => m.san);
    const allMoves = [...history, ...future];
    
    const pairs = [];
    for (let i = 0; i < allMoves.length; i += 2) {
      pairs.push({ white: allMoves[i], black: allMoves[i + 1], moveNum: i / 2 + 1 });
    }

    const jumpToNormalMove = (targetIndex: number) => {
       const currentIdx = history.length - 1;
       if (targetIndex === currentIdx) return;
       
       const gameCopy = new Chess();
       gameCopy.loadPgn(game.pgn());
       
       if (targetIndex < currentIdx) {
           let steps = currentIdx - targetIndex;
           const newRedo = [...redoStack];
           while(steps > 0) {
               const m = gameCopy.undo();
               if(m) newRedo.unshift(m);
               steps--;
           }
           setGame(gameCopy);
           setRedoStack(newRedo);
       } else {
           let steps = targetIndex - currentIdx;
           const newRedo = [...redoStack];
           while(steps > 0 && newRedo.length > 0) {
               const m = newRedo.shift();
               if(m) gameCopy.move(m);
               steps--;
           }
           setGame(gameCopy);
           setRedoStack(newRedo);
       }
       setAnalysis(null);
       setLastMoveInfo(null);
    };

    return (
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-mono p-1">
        {pairs.map((pair, idx) => {
          const whiteIndex = idx * 2;
          const blackIndex = idx * 2 + 1;
          const isWhiteFuture = whiteIndex >= history.length;
          const isBlackFuture = blackIndex >= history.length;
          const isWhiteCurrent = whiteIndex === history.length - 1;
          const isBlackCurrent = blackIndex === history.length - 1;

          return (
            <div key={idx} className="flex gap-1.5 items-center">
              <span className="text-slate-400 w-5 text-right select-none">{pair.moveNum}.</span>
              <span 
                className={`cursor-pointer px-1.5 py-0.5 rounded transition-colors ${isWhiteCurrent ? 'bg-blue-600 text-white font-bold' : isWhiteFuture ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-700 hover:bg-slate-200'}`}
                onClick={() => jumpToNormalMove(whiteIndex)}
              >
                {pair.white}
              </span>
              {pair.black && (
                <span 
                  className={`cursor-pointer px-1.5 py-0.5 rounded transition-colors ${isBlackCurrent ? 'bg-blue-600 text-white font-bold' : isBlackFuture ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-700 hover:bg-slate-200'}`}
                  onClick={() => jumpToNormalMove(blackIndex)}
                >
                  {pair.black}
                </span>
              )}
            </div>
          )
        })}
        {allMoves.length === 0 && (
          <span className="text-slate-400 italic text-xs pt-1">走子开始对局...</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full max-w-7xl mx-auto">
      
      {/* 左侧：开局库谱招或全局分析 */}
      <div className="w-full lg:w-1/4 bg-white rounded-xl shadow-md border border-slate-200 p-5 flex flex-col h-[500px] lg:h-[750px]">
        {gameAnalysis ? (
          <>
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-3 flex justify-between items-center shrink-0">
              <span>📊 对局分析报告</span>
              <button onClick={() => {
                setGameAnalysis(null); 
                setGame(new Chess()); 
                setCurrentMoveIndex(-1);
                setRedoStack([]);
              }} className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600">关闭</button>
            </h3>
            
            <div className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-700">{gameAnalysis.global_accuracy.white}%</div>
                  <div className="text-xs text-slate-500 font-medium">白方准确度</div>
                </div>
                <div className="text-2xl text-slate-300">⚔️</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">{gameAnalysis.global_accuracy.black}%</div>
                  <div className="text-xs text-slate-500 font-medium">黑方准确度</div>
                </div>
              </div>
              
              <div className="text-sm space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div className="flex justify-between"><span className="text-slate-600">最佳 (Best):</span> <span>{gameAnalysis.judgments.white['Best']} / {gameAnalysis.judgments.black['Best']}</span></div>
                <div className="flex justify-between"><span className="text-emerald-600">极佳 (Excellent):</span> <span>{gameAnalysis.judgments.white['Excellent']} / {gameAnalysis.judgments.black['Excellent']}</span></div>
                <div className="flex justify-between"><span className="text-blue-600">好棋 (Good):</span> <span>{gameAnalysis.judgments.white['Good']} / {gameAnalysis.judgments.black['Good']}</span></div>
                <div className="flex justify-between"><span className="text-yellow-600">缓着 (Inaccuracy):</span> <span>{gameAnalysis.judgments.white['Inaccuracy']} / {gameAnalysis.judgments.black['Inaccuracy']}</span></div>
                <div className="flex justify-between"><span className="text-orange-500">失误 (Mistake):</span> <span>{gameAnalysis.judgments.white['Mistake']} / {gameAnalysis.judgments.black['Mistake']}</span></div>
                <div className="flex justify-between"><span className="text-red-600 font-bold">漏着 (Blunder):</span> <span>{gameAnalysis.judgments.white['Blunder']} / {gameAnalysis.judgments.black['Blunder']}</span></div>
              </div>

              <div className="space-y-1 mt-4 border-t border-slate-200 pt-4">
                <h4 className="text-sm font-bold text-slate-700 mb-2">对局回顾</h4>
                <div 
                  onClick={() => goToMove(-1)}
                  className={`flex justify-between items-center p-2 rounded cursor-pointer border ${currentMoveIndex === -1 ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-200'}`}
                >
                  <span className="font-medium text-slate-700">初始局面</span>
                </div>
                {gameAnalysis.moves.map((m, idx) => {
                  let badgeColor = "bg-slate-200 text-slate-600 border-slate-300";
                  if (m.judgment === "Blunder") badgeColor = "bg-red-100 text-red-700 border-red-300";
                  else if (m.judgment === "Mistake") badgeColor = "bg-orange-100 text-orange-700 border-orange-300";
                  else if (m.judgment === "Inaccuracy") badgeColor = "bg-yellow-100 text-yellow-700 border-yellow-300";
                  else if (m.judgment === "Best") badgeColor = "bg-sky-100 text-sky-700 border-sky-300";
                  else if (m.judgment === "Excellent") badgeColor = "bg-emerald-100 text-emerald-700 border-emerald-300";
                  
                  return (
                    <div 
                      key={idx} 
                      onClick={() => goToMove(idx)}
                      className={`flex justify-between items-center p-2 rounded cursor-pointer border ${currentMoveIndex === idx ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-200'}`}
                    >
                      <span className="font-medium text-slate-700">
                        {m.color === 'white' ? `${m.move_number}. ` : `${m.move_number}... `}
                        {m.san}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badgeColor}`}>
                        {m.judgment}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-3 flex items-center gap-2 shrink-0">
              📚 本地开局库
            </h3>
            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
              {bookMoves.length > 0 ? (
                <div className="space-y-2">
                  {bookMoves.map((move, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition">
                      <span className="font-bold text-lg text-slate-700">{move.san}</span>
                      <span className="text-sm font-medium text-slate-500 bg-slate-200 px-2 py-1 rounded">
                        对局数 {move.weight.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 pt-20">
                  <div className="text-4xl opacity-50">📖</div>
                  <p className="text-center font-medium">当前局面暂无谱招<br/><span className="text-xs font-normal">可能已脱离理论开局阶段</span></p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 中间：棋盘与引擎数据 */}
      <div className="w-full lg:w-1/3 flex flex-col items-center">
        {/* 快捷键与控制区 */}
        <div className="w-full max-w-[450px] mb-3 flex justify-between items-center text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <button className="flex items-center justify-center w-7 h-7 bg-white border border-slate-300 rounded hover:bg-slate-100 hover:text-slate-800 shadow-sm transition" onClick={handlePreviousMove} title="上一步 (←)">
              ←
            </button>
            <button className="flex items-center justify-center w-7 h-7 bg-white border border-slate-300 rounded hover:bg-slate-100 hover:text-slate-800 shadow-sm transition" onClick={handleNextMove} title="下一步 (→)">
              →
            </button>
            <button className="flex items-center justify-center h-7 px-2 bg-white border border-slate-300 rounded hover:bg-slate-100 hover:text-slate-800 shadow-sm transition" onClick={handlePlayBestBookMove} title="自动选择最佳开局谱招 (空格)" disabled={bookMoves.length === 0 || gameAnalysis !== null}>
              🚀 首选开局 (空格)
            </button>
            <button className="flex items-center justify-center h-7 px-2 bg-white border border-slate-300 rounded hover:bg-slate-100 hover:text-slate-800 shadow-sm transition" onClick={() => setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')} title="翻转棋盘 (F)">
              🔄 翻转 (F)
            </button>
          </div>
          <button 
            className="text-blue-600 hover:text-blue-800 transition px-2 py-1 rounded hover:bg-blue-50"
            onClick={() => { 
              setGame(new Chess()); 
              setAnalysis(null); 
              setBookMoves([]); 
              setLastMoveInfo(null);
              setRedoStack([]);
              setGameAnalysis(null);
              setCurrentMoveIndex(-1);
            }}
          >
            重新开始对局
          </button>
        </div>

        {/* 棋盘 */}
        <div className="w-full max-w-[450px] shadow-lg rounded-sm overflow-hidden border border-gray-300">
          <Chessboard 
            position={game.fen()} 
            boardOrientation={boardOrientation}
            onPieceDrop={onDrop}
            customDarkSquareStyle={{ backgroundColor: '#779556' }}
            customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
          />
        </div>

        {/* 棋谱展示区 (Move List) */}
        <div className="w-full max-w-[450px] mt-4 bg-white rounded-md shadow-sm border border-slate-200 p-3 max-h-32 overflow-y-auto">
          {renderMoveList()}
        </div>
        
        {/* 控制按钮 */}
        <div className="mt-4 flex flex-col gap-4 w-full max-w-[450px] justify-center">
          <button 
            className="w-full px-6 py-2 bg-emerald-600 text-white font-medium rounded-md shadow-sm hover:bg-emerald-700 transition flex items-center justify-center gap-2"
            onClick={() => setShowPgnModal(true)}
          >
            📥 导入 PGN 分析对局
          </button>

          {/* 分析开关区 */}
          <div className="flex items-center justify-between bg-slate-100 p-3 rounded-md border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                checked={autoAnalyze}
                onChange={(e) => setAutoAnalyze(e.target.checked)}
              />
              <span className="text-sm font-medium text-slate-700">自动深度分析每步棋</span>
            </label>
            
            {!autoAnalyze && (
              <button 
                className="px-4 py-1.5 bg-amber-500 text-white text-sm font-medium rounded shadow-sm hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => lastMoveInfo && analyzeMove(lastMoveInfo.fen, lastMoveInfo.uciMove)}
                disabled={!lastMoveInfo || loading}
                title={!lastMoveInfo ? "请先走一步棋" : "对当前招法进行深度解析"}
              >
                {loading ? "分析中..." : "深度解析招法"}
              </button>
            )}
          </div>
        </div>

        {/* 棋盘下方：引擎硬核数据看板 */}
        <div className="w-full max-w-[450px] mt-6 bg-slate-800 text-white rounded-xl shadow-md p-5">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            Stockfish 引擎评估 (一二三选)
          </h3>
          
          {loading ? (
             <div className="text-center py-6 text-slate-400">引擎正在深度推演多条变例 (Multi-PV)...</div>
          ) : analysis ? (
            <div className="space-y-3">
              {analysis.engine_eval.lines.map((line, index) => (
                <div key={index} className="bg-slate-700/40 p-3 rounded-lg border border-slate-600/50 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-sky-900/50 text-sky-400 text-xs font-bold rounded">
                        #{index + 1}
                      </span>
                      <span className="text-lg font-bold text-sky-300 w-16">
                        {line.best_move}
                      </span>
                    </div>
                    <div className={`text-lg font-bold text-right ${
                      line.is_mate ? 'text-fuchsia-400' :
                      line.score > 0 ? 'text-emerald-400' : 
                      line.score < 0 ? 'text-rose-400' : 'text-slate-300'
                    }`}>
                      {line.is_mate 
                        ? `M${line.mate_score}`
                        : (line.score > 0 ? '+' : '') + line.score.toFixed(2)
                      }
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-400 line-clamp-1 truncate" title={line.pv.join(' ')}>
                    {line.pv.join(' ')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">
              {autoAnalyze ? "走棋后将自动获取客观评估数据" : "点击“深度解析招法”以获取引擎推演数据"}
            </div>
          )}
        </div>
      </div>

      {/* 右侧：AI 教练分析区 */}
      <div className="w-full lg:w-5/12 bg-amber-50/50 rounded-xl shadow-inner border border-amber-100 p-6 flex flex-col h-[500px] lg:h-[750px]">
        <h3 className="text-2xl font-bold text-amber-900 mb-4 border-b border-amber-200 pb-3 flex items-center justify-between shrink-0">
          <span className="flex items-center gap-2">🧠 战术复盘教练</span>
          <span className="text-xs font-normal px-3 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200">Powered by DeepSeek</span>
        </h3>
        
        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-amber-700 space-y-5 pt-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-t-4 border-amber-600"></div>
              <p className="font-medium animate-pulse text-lg">教练正在进行深度思考...</p>
            </div>
          ) : analysis ? (
            <div className="animate-fade-in">
              <div className="prose prose-amber prose-lg max-w-none text-gray-800 leading-loose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {analysis.explanation}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-amber-600/50 pt-32">
              <div className="text-center space-y-3">
                <div className="text-6xl mb-4">♟️</div>
                <p className="text-xl font-medium">在棋盘上走一步棋试试</p>
                <p className="text-sm">
                  {autoAnalyze 
                    ? "教练将自动用通俗易懂的语言为你解析招法的深层意图" 
                    : "点击左下方的“深度解析招法”按钮，让教练为你解析"
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* PGN 导入弹窗 */}
      {showPgnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl border border-slate-200">
            <h3 className="text-2xl font-bold text-slate-800 mb-4">📥 导入 PGN</h3>
            <p className="text-sm text-slate-600 mb-4">
              将你在 Chess.com 或 Lichess 的对局 PGN 纯文本粘贴到下方，引擎将自动为你推演整盘棋的精确度。
            </p>
            <textarea
              className="w-full h-48 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none font-mono text-sm"
              placeholder="[Event &quot;Live Chess&quot;]&#10;[Site &quot;Chess.com&quot;]&#10;...&#10;1. e4 e5 2. Nf3 Nc6..."
              value={pgnInput}
              onChange={(e) => setPgnInput(e.target.value)}
            />
            <div className="mt-6 flex justify-end gap-3">
              <button 
                className="px-5 py-2 bg-slate-200 text-slate-700 font-medium rounded-md hover:bg-slate-300 transition"
                onClick={() => setShowPgnModal(false)}
                disabled={analyzingGame}
              >
                取消
              </button>
              <button 
                className="px-5 py-2 bg-emerald-600 text-white font-medium rounded-md shadow-sm hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={handleAnalyzeGame}
                disabled={!pgnInput.trim() || analyzingGame}
              >
                {analyzingGame ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    深度推演中(需较长时间)...
                  </>
                ) : "🚀 开始深度分析"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
