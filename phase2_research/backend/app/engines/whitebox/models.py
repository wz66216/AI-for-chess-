from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

class TreeNode(BaseModel):
    """
    Represents a node in the search tree (either Alpha-Beta or MCTS).
    Structured to be easily serialized to JSON and consumed by D3.js/ECharts.
    """
    id: str
    name: str  # e.g., "e2e4" or FEN
    value: Optional[float] = None
    node_type: str = "root"  # "root", "max", "min", "mcts"
    is_pruned: bool = False
    children: List['TreeNode'] = []
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    def dict_for_viz(self) -> dict:
        """Convert to a dictionary specifically formatted for frontend tree visualization"""
        d = {
            "id": self.id,
            "name": self.name,
            "value": self.value,
            "node_type": self.node_type,
            "is_pruned": self.is_pruned,
            "metadata": self.metadata,
        }
        if self.children:
            d["children"] = [child.dict_for_viz() for child in self.children]
        return d
