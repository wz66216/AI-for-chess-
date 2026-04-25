import { ChessGame } from './components/Chessboard/ChessGame';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <header className="bg-slate-900 text-white p-5 shadow-md flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">♞ ChessExplain <span className="text-sm font-normal text-gray-400 ml-2">国际象棋战术复盘平台</span></h1>
      </header>
      <main className="flex-grow p-6 flex justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-6xl">
          <ChessGame />
        </div>
      </main>
    </div>
  );
}

export default App;
