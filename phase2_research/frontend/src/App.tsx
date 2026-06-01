import { NavLink, Route, Routes } from 'react-router-dom';

import { ChessGame } from './components/Chessboard/ChessGame';
import SearchLabPage from './pages/SearchLabPage';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <header className="bg-slate-900 text-white p-5 shadow-md flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">♞ ChessExplain <span className="text-sm font-normal text-gray-400 ml-2">国际象棋战术复盘平台</span></h1>
        <nav className="flex gap-2">
          <NavLink end to="/" className={({ isActive }) => `px-4 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}>
            分析页
          </NavLink>
          <NavLink to="/search-lab" className={({ isActive }) => `px-4 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}>
            搜索实验室
          </NavLink>
        </nav>
      </header>
      <main className="flex-grow p-6 flex justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-6xl">
          <Routes>
            <Route path="/" element={<ChessGame />} />
            <Route path="/search-lab" element={<SearchLabPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
