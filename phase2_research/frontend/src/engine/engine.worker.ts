import { alphabetaSearch } from "./alphabeta";
import { mctsSearch } from "./mcts";
import { SearchConfig } from "./types";

self.onmessage = (e: MessageEvent<{ fen: string; config: SearchConfig }>) => {
  const { fen, config } = e.data;
  try {
    const result = config.engine === "alphabeta"
      ? alphabetaSearch(fen, config)
      : mctsSearch(fen, config);
    self.postMessage({ type: "result", result });
  } catch (err) {
    self.postMessage({ type: "error", error: String(err) });
  }
};
