from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class WhiteboxRequest(BaseModel):
    fen: str = Field(..., description="FEN string of the current board position")
    engine: str = Field(..., description="Type of engine: 'alphabeta' or 'mcts'")
    
    # Alpha-Beta specific hyperparameters
    depth: int = Field(3, description="Search depth for Alpha-Beta")
    use_move_ordering: bool = Field(True, description="Enable heuristic move ordering (MVV-LVA)")
    
    # MCTS specific hyperparameters
    mcts_iterations: int = Field(100, description="Number of Monte Carlo iterations")
    mcts_exploration_constant: float = Field(1.414, description="Exploration constant (c) in UCB1 formula")

class WhiteboxResponse(BaseModel):
    best_move: Optional[str] = Field(None, description="The best move selected by the engine in UCI format")
    evaluation: float = Field(..., description="Evaluation score of the position")
    nodes_evaluated: int = Field(..., description="Total number of nodes evaluated/expanded")
    nps: int = Field(..., description="Nodes Per Second calculation")
    time_ms: int = Field(..., description="Total calculation time in milliseconds")
    tree: Dict[str, Any] = Field(..., description="JSON serialized search tree for visualization")
