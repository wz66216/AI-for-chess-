from pydantic import BaseModel, Field
from typing import Literal
from typing import Optional, Dict, Any

class WhiteboxRequest(BaseModel):
    fen: str = Field(..., description="FEN string of the current board position")
    engine: Literal["alphabeta", "mcts"] = Field(..., description="Type of engine: 'alphabeta' or 'mcts'")
    evaluator: Literal["material", "pst", "heuristic"] = Field("heuristic", description="Alpha-Beta evaluator to use")
    
    # Alpha-Beta specific hyperparameters
    depth: int = Field(
        3,
        ge=1,
        le=8,
        description="Search depth for Alpha-Beta. Web requests are capped at 8 to keep responses interactive.",
    )
    use_move_ordering: bool = Field(True, description="Enable heuristic move ordering (MVV-LVA)")
    
    # MCTS specific hyperparameters
    mcts_iterations: int = Field(
        100,
        ge=1,
        le=50000,
        description="Number of Monte Carlo iterations. Web requests are capped at 50000.",
    )
    mcts_exploration_constant: float = Field(
        1.414,
        gt=0.0,
        le=5.0,
        description="Exploration constant (c) in UCB1 formula, capped for the interactive Search Lab.",
    )

class Candidate(BaseModel):
    move: str
    evaluation: float = Field(
        ...,
        description="White-centric candidate evaluation: positive is better for White, negative is better for Black",
    )
    nodes: int = 0

class WhiteboxResponse(BaseModel):
    best_move: Optional[str] = Field(None, description="The best move selected by the engine")
    evaluation: float = Field(
        ...,
        description="White-centric evaluation: positive is better for White, negative is better for Black",
    )
    nodes_evaluated: int = Field(..., description="Total number of nodes evaluated/expanded")
    nps: int = Field(..., description="Nodes Per Second calculation")
    time_ms: int = Field(..., description="Total calculation time in milliseconds")
    instrumentation: Optional[Dict[str, Any]] = Field(None, description="Search instrumentation data")
    tree: Dict[str, Any] = Field(..., description="JSON serialized search tree for visualization")
    candidates: list[Candidate] = Field(default_factory=list)
