"""Abstract base class for board assignment service."""

from abc import ABC, abstractmethod
from typing import Any, Optional

from invokeai.app.services.board_assignment.board_assignment_common import (
    BoardAssignmentRule,
    BoardAssignmentRuleCreate,
    BoardAssignmentRuleUpdate,
    ConflictResolutionStrategy,
    EvaluationResult,
)


class BoardAssignmentServiceBase(ABC):
    """Abstract base class for board assignment rules service."""

    @abstractmethod
    def create_rule(self, rule: BoardAssignmentRuleCreate) -> BoardAssignmentRule:
        """Create a new assignment rule."""
        pass

    @abstractmethod
    def get_rule(self, rule_id: str) -> BoardAssignmentRule:
        """Get a rule by ID."""
        pass

    @abstractmethod
    def update_rule(self, rule_id: str, changes: BoardAssignmentRuleUpdate) -> BoardAssignmentRule:
        """Update an existing rule."""
        pass

    @abstractmethod
    def delete_rule(self, rule_id: str) -> None:
        """Delete a rule."""
        pass

    @abstractmethod
    def get_all_rules(self, enabled_only: bool = False) -> list[BoardAssignmentRule]:
        """Get all rules, optionally filtered to enabled only."""
        pass

    @abstractmethod
    def get_rules_for_board(self, board_id: str) -> list[BoardAssignmentRule]:
        """Get all rules targeting a specific board."""
        pass

    @abstractmethod
    def reorder_rules(self, rule_ids: list[str]) -> list[BoardAssignmentRule]:
        """Reorder rules by setting priorities based on position in list."""
        pass

    @abstractmethod
    def evaluate(
        self,
        metadata: Optional[dict[str, Any]],
        strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.PRIORITY_BASED,
    ) -> EvaluationResult:
        """
        Evaluate all enabled rules against the given metadata.
        Returns the board ID to assign (if any rule matches) and all matching rules.
        The strategy parameter determines how conflicts are resolved when multiple rules match.
        """
        pass

    @abstractmethod
    def evaluate_single_rule(self, rule_id: str, metadata: Optional[dict[str, Any]]) -> bool:
        """Evaluate a single rule against metadata. Returns True if it matches."""
        pass
