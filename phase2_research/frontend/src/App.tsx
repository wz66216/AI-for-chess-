import { lazy, Suspense } from "react";
import { NavLink, Route, Routes } from "react-router-dom";

import { ChessGame } from "./components/Chessboard/ChessGame";

const SearchLabPage = lazy(() => import("./pages/SearchLabPage"));
const HealthPage = lazy(() => import("./pages/HealthPage"));

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-md px-4 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-white text-slate-900"
      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
  }`;
}

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-100 font-sans">
      <header className="flex flex-col gap-4 bg-slate-900 p-5 text-white shadow-md lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          ChessExplain
          <span className="ml-2 text-sm font-normal text-gray-400">
            国际象棋战术复盘平台
          </span>
        </h1>
        <nav className="flex flex-wrap gap-2">
          <NavLink end to="/" className={navClass}>
            分析页
          </NavLink>
          <NavLink to="/search-lab" className={navClass}>
            搜索实验室
          </NavLink>
          <NavLink to="/health" className={navClass}>
            部署自检
          </NavLink>
        </nav>
      </header>
      <main className="flex flex-grow justify-center p-6">
        <div className="w-full max-w-6xl rounded-xl bg-white p-8 shadow-lg">
          <Suspense fallback={<div className="text-slate-600">正在加载...</div>}>
            <Routes>
              <Route path="/" element={<ChessGame />} />
              <Route path="/analyze" element={<ChessGame />} />
              <Route path="/search-lab" element={<SearchLabPage />} />
              <Route path="/health" element={<HealthPage />} />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default App;
