from pydantic import BaseModel, Field
from typing import Literal
from typing import Optional, Dict, Any

class WhiteboxRequest(BaseModel):
    fen: str = Field(..., description="FEN string of the current board position")
    engine: Literal["alphabeta", "mcts"] = Field(..., description="Type of engine: 'alphabeta' or 'mcts'")
    evaluator: Literal["material", "pst", "heuristic"] = Field("material", description="Alpha-Beta evaluator to use")
    
    # Alpha-Beta specific hyperparameters
    depth: int = Field(3, ge=1, le=30, description="Search depth for Alpha-Beta")
    use_move_ordering: bool = Field(True, description="Enable heuristic move ordering (MVV-LVA)")
    
    # MCTS specific hyperparameters
    mcts_iterations: int = Field(100, ge=1, le=100000, description="Number of Monte Carlo iterations")
    mcts_exploration_constant: float = Field(1.414, gt=0.0, le=10.0, description="Exploration constant (c) in UCB1 formula")

class Candidate(BaseModel):
    move: str
    evaluation: float
    nodes: int = 0

class WhiteboxResponse(BaseModel):
    best_move: Optional[str] = Field(None, description="The best move selected by the engine in UCI format")
    evaluation: float = Field(..., description="Evaluation score of the position")
    nodes_evaluated: int = Field(..., description="Total number of nodes evaluated/expanded")
    nps: int = Field(..., description="Nodes Per Second calculation")
    time_ms: int = Field(..., description="Total calculation time in milliseconds")
    instrumentation: Optional[Dict[str, Any]] = Field(None, description="Search instrumentation data")
    tree: Dict[str, Any] = Field(..., description="JSON serialized search tree for visualization")
    candidates: list[Candidate] = Field(default_factory=list)
