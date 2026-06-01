from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict


@dataclass(slots=True)
class AlphaBetaInstrumentation:
    evaluator_name: str | None = None
    nodes_visited: int = 0
    leaf_evaluations: int = 0
    cutoffs: int = 0
    generated_children: int = 0
    remaining_depth_counts: Dict[int, int] = field(default_factory=dict)
    children_by_remaining_depth: Dict[int, int] = field(default_factory=dict)

    def record_visit(self, depth: int) -> None:
        self.nodes_visited += 1
        self.remaining_depth_counts[depth] = self.remaining_depth_counts.get(depth, 0) + 1

    def record_leaf(self, depth: int) -> None:
        self.leaf_evaluations += 1

    def record_children(self, depth: int, count: int) -> None:
        self.generated_children += count
        self.children_by_remaining_depth[depth] = self.children_by_remaining_depth.get(depth, 0) + count

    def record_cutoff(self) -> None:
        self.cutoffs += 1

    def to_dict(self) -> dict:
        return {
            "evaluator_name": self.evaluator_name,
            "nodes_visited": self.nodes_visited,
            "leaf_evaluations": self.leaf_evaluations,
            "cutoffs": self.cutoffs,
            "generated_children": self.generated_children,
            "remaining_depth_counts": dict(self.remaining_depth_counts),
            "children_by_remaining_depth": dict(self.children_by_remaining_depth),
        }
