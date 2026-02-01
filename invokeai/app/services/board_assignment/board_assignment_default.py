"""Default implementation of board assignment service using SQLite."""

import json
import sqlite3
from typing import Any, Optional, Union, cast

from invokeai.app.services.board_assignment.board_assignment_base import BoardAssignmentServiceBase
from invokeai.app.services.board_assignment.board_assignment_common import (
    BoardAssignmentRule,
    BoardAssignmentRuleCreate,
    BoardAssignmentRuleUpdate,
    ConditionOperator,
    ConditionType,
    ConflictResolutionStrategy,
    EvaluationResult,
    RuleCondition,
    deserialize_rule,
    serialize_conditions,
)
from invokeai.app.services.shared.sqlite.sqlite_database import SqliteDatabase
from invokeai.app.util.misc import uuid_string


class BoardAssignmentRuleNotFoundException(Exception):
    """Raised when a rule is not found."""

    def __init__(self, message="Board assignment rule not found"):
        super().__init__(message)


class BoardAssignmentService(BoardAssignmentServiceBase):
    """Default implementation of board assignment service using SQLite."""

    def __init__(self, db: SqliteDatabase) -> None:
        self._db = db

    def create_rule(self, rule: BoardAssignmentRuleCreate) -> BoardAssignmentRule:
        """Create a new assignment rule."""
        rule_id = uuid_string()
        conditions_json = serialize_conditions(rule.conditions)

        with self._db.transaction() as cursor:
            cursor.execute(
                """--sql
                INSERT INTO board_assignment_rules
                (rule_id, rule_name, target_board_id, priority, is_enabled, conditions, match_all)
                VALUES (?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    rule_id,
                    rule.rule_name,
                    rule.target_board_id,
                    rule.priority,
                    1 if rule.is_enabled else 0,
                    conditions_json,
                    1 if rule.match_all else 0,
                ),
            )

        return self.get_rule(rule_id)

    def get_rule(self, rule_id: str) -> BoardAssignmentRule:
        """Get a rule by ID."""
        with self._db.transaction() as cursor:
            cursor.execute(
                """--sql
                SELECT * FROM board_assignment_rules WHERE rule_id = ?;
                """,
                (rule_id,),
            )
            result = cast(Union[sqlite3.Row, None], cursor.fetchone())

        if result is None:
            raise BoardAssignmentRuleNotFoundException()

        return deserialize_rule(dict(result))

    def update_rule(self, rule_id: str, changes: BoardAssignmentRuleUpdate) -> BoardAssignmentRule:
        """Update an existing rule."""
        # First verify the rule exists
        self.get_rule(rule_id)

        with self._db.transaction() as cursor:
            if changes.rule_name is not None:
                cursor.execute(
                    "UPDATE board_assignment_rules SET rule_name = ?, updated_at = CURRENT_TIMESTAMP WHERE rule_id = ?;",
                    (changes.rule_name, rule_id),
                )

            if changes.target_board_id is not None:
                cursor.execute(
                    "UPDATE board_assignment_rules SET target_board_id = ?, updated_at = CURRENT_TIMESTAMP WHERE rule_id = ?;",
                    (changes.target_board_id, rule_id),
                )

            if changes.priority is not None:
                cursor.execute(
                    "UPDATE board_assignment_rules SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE rule_id = ?;",
                    (changes.priority, rule_id),
                )

            if changes.is_enabled is not None:
                cursor.execute(
                    "UPDATE board_assignment_rules SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE rule_id = ?;",
                    (1 if changes.is_enabled else 0, rule_id),
                )

            if changes.conditions is not None:
                conditions_json = serialize_conditions(changes.conditions)
                cursor.execute(
                    "UPDATE board_assignment_rules SET conditions = ?, updated_at = CURRENT_TIMESTAMP WHERE rule_id = ?;",
                    (conditions_json, rule_id),
                )

            if changes.match_all is not None:
                cursor.execute(
                    "UPDATE board_assignment_rules SET match_all = ?, updated_at = CURRENT_TIMESTAMP WHERE rule_id = ?;",
                    (1 if changes.match_all else 0, rule_id),
                )

        return self.get_rule(rule_id)

    def delete_rule(self, rule_id: str) -> None:
        """Delete a rule."""
        with self._db.transaction() as cursor:
            cursor.execute(
                "DELETE FROM board_assignment_rules WHERE rule_id = ?;",
                (rule_id,),
            )

    def get_all_rules(self, enabled_only: bool = False) -> list[BoardAssignmentRule]:
        """Get all rules, optionally filtered to enabled only."""
        with self._db.transaction() as cursor:
            if enabled_only:
                cursor.execute(
                    """--sql
                    SELECT * FROM board_assignment_rules
                    WHERE is_enabled = 1
                    ORDER BY priority DESC, created_at;
                    """
                )
            else:
                cursor.execute(
                    """--sql
                    SELECT * FROM board_assignment_rules
                    ORDER BY priority DESC, created_at;
                    """
                )
            results = cast(list[sqlite3.Row], cursor.fetchall())

        return [deserialize_rule(dict(r)) for r in results]

    def get_rules_for_board(self, board_id: str) -> list[BoardAssignmentRule]:
        """Get all rules targeting a specific board."""
        with self._db.transaction() as cursor:
            cursor.execute(
                """--sql
                SELECT * FROM board_assignment_rules
                WHERE target_board_id = ?
                ORDER BY priority DESC, created_at;
                """,
                (board_id,),
            )
            results = cast(list[sqlite3.Row], cursor.fetchall())

        return [deserialize_rule(dict(r)) for r in results]

    def reorder_rules(self, rule_ids: list[str]) -> list[BoardAssignmentRule]:
        """Reorder rules by setting priorities based on position in list."""
        with self._db.transaction() as cursor:
            # Set priority based on position (first = highest priority)
            for i, rule_id in enumerate(rule_ids):
                priority = len(rule_ids) - i  # Reverse so first item has highest priority
                cursor.execute(
                    "UPDATE board_assignment_rules SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE rule_id = ?;",
                    (priority, rule_id),
                )

        return self.get_all_rules()

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
        if metadata is None:
            return EvaluationResult(matched_board_id=None, matched_rule_id=None, matched_rule_name=None, all_matches=[])

        rules = self.get_all_rules(enabled_only=True)
        all_matches: list[dict[str, Any]] = []

        for rule in rules:
            if self._evaluate_rule(rule, metadata):
                match_info = {
                    "rule_id": rule.rule_id,
                    "rule_name": rule.rule_name,
                    "target_board_id": rule.target_board_id,
                    "priority": rule.priority,
                    "condition_count": len(rule.conditions),
                }
                all_matches.append(match_info)

        if not all_matches:
            return EvaluationResult(
                matched_board_id=None, matched_rule_id=None, matched_rule_name=None, all_matches=[], has_conflict=False
            )

        has_conflict = len(all_matches) > 1

        # Select the best match based on strategy
        best_match = self._resolve_conflict(all_matches, strategy)

        # If strategy is MANUAL_ONLY and there are multiple matches, return None for matched_board_id
        # to signal that the user should be prompted to choose
        if strategy == ConflictResolutionStrategy.MANUAL_ONLY and has_conflict:
            return EvaluationResult(
                matched_board_id=None,
                matched_rule_id=None,
                matched_rule_name=None,
                all_matches=all_matches,
                has_conflict=True,
            )

        return EvaluationResult(
            matched_board_id=best_match["target_board_id"],
            matched_rule_id=best_match["rule_id"],
            matched_rule_name=best_match["rule_name"],
            all_matches=all_matches,
            has_conflict=has_conflict,
        )

    def _resolve_conflict(
        self, matches: list[dict[str, Any]], strategy: ConflictResolutionStrategy
    ) -> dict[str, Any]:
        """
        Resolve a conflict between multiple matching rules based on the given strategy.
        """
        if len(matches) == 1:
            return matches[0]

        if strategy == ConflictResolutionStrategy.PRIORITY_BASED:
            # Highest priority wins (rules are already sorted by priority DESC)
            return matches[0]

        elif strategy == ConflictResolutionStrategy.MOST_SPECIFIC:
            # Rule with most conditions wins
            return max(matches, key=lambda m: m.get("condition_count", 0))

        elif strategy == ConflictResolutionStrategy.FIRST_MATCH:
            # First matching rule wins (same as priority-based for now since rules are sorted)
            return matches[0]

        elif strategy == ConflictResolutionStrategy.MANUAL_ONLY:
            # Return the first match, but the caller should check all_matches
            # and prompt the user if there are multiple
            return matches[0]

        # Default to first match
        return matches[0]

    def evaluate_single_rule(self, rule_id: str, metadata: Optional[dict[str, Any]]) -> bool:
        """Evaluate a single rule against metadata. Returns True if it matches."""
        if metadata is None:
            return False

        rule = self.get_rule(rule_id)
        return self._evaluate_rule(rule, metadata)

    def _evaluate_rule(self, rule: BoardAssignmentRule, metadata: dict[str, Any]) -> bool:
        """Evaluate a rule against metadata."""
        if not rule.conditions:
            return False

        results = [self._evaluate_condition(cond, metadata) for cond in rule.conditions]

        if rule.match_all:
            return all(results)
        else:
            return any(results)

    def _evaluate_condition(self, condition: RuleCondition, metadata: dict[str, Any]) -> bool:
        """Evaluate a single condition against metadata."""
        try:
            condition_type = condition.condition_type
            operator = condition.operator
            value = condition.value
            case_sensitive = condition.case_sensitive

            # Extract relevant data from metadata based on condition type
            if condition_type == ConditionType.MODEL_NAME:
                # Check main model name
                model_info = metadata.get("model", {})
                if isinstance(model_info, dict):
                    model_name = model_info.get("name", "") or model_info.get("key", "")
                else:
                    model_name = str(model_info) if model_info else ""
                return self._match_string(model_name, operator, value, case_sensitive)

            elif condition_type == ConditionType.MODEL_BASE:
                # Check model base type (e.g., "flux", "sdxl", "sd-1")
                model_info = metadata.get("model", {})
                if isinstance(model_info, dict):
                    model_base = model_info.get("base", "")
                else:
                    model_base = ""
                return self._match_string(model_base, operator, value, case_sensitive)

            elif condition_type == ConditionType.LORA_PRESENT:
                # Check if any LoRA is used
                loras = metadata.get("loras", [])
                return len(loras) > 0 if operator == ConditionOperator.ANY else False

            elif condition_type == ConditionType.LORA_NAME:
                # Check if a specific LoRA is used
                loras = metadata.get("loras", [])
                for lora in loras:
                    lora_name = ""
                    if isinstance(lora, dict):
                        lora_name = lora.get("name", "") or lora.get("key", "") or lora.get("model_name", "")
                    elif isinstance(lora, str):
                        lora_name = lora
                    if self._match_string(lora_name, operator, value, case_sensitive):
                        return True
                return False

            elif condition_type == ConditionType.LORA_CATEGORY:
                # Check if any LoRA belongs to a specific category
                loras = metadata.get("loras", [])
                for lora in loras:
                    if isinstance(lora, dict):
                        lora_category = lora.get("category", "")
                        if self._match_string(lora_category, operator, value, case_sensitive):
                            return True
                return False

            elif condition_type == ConditionType.PROMPT_CONTAINS:
                # Check prompt text
                prompt = metadata.get("positive_prompt", "") or metadata.get("prompt", "")
                return self._match_string(prompt, operator, value, case_sensitive)

            elif condition_type == ConditionType.WIDTH_MIN:
                width = metadata.get("width", 0)
                return self._match_number(width, ConditionOperator.GREATER_THAN, value)

            elif condition_type == ConditionType.WIDTH_MAX:
                width = metadata.get("width", 0)
                return self._match_number(width, ConditionOperator.LESS_THAN, value)

            elif condition_type == ConditionType.HEIGHT_MIN:
                height = metadata.get("height", 0)
                return self._match_number(height, ConditionOperator.GREATER_THAN, value)

            elif condition_type == ConditionType.HEIGHT_MAX:
                height = metadata.get("height", 0)
                return self._match_number(height, ConditionOperator.LESS_THAN, value)

            return False

        except Exception:
            # If evaluation fails, don't match
            return False

    def _match_string(
        self, actual: str, operator: ConditionOperator, expected: Optional[Union[str, int, float, bool]], case_sensitive: bool
    ) -> bool:
        """Match a string value against an operator and expected value."""
        if expected is None:
            return False

        expected_str = str(expected)

        if not case_sensitive:
            actual = actual.lower()
            expected_str = expected_str.lower()

        if operator == ConditionOperator.EQUALS:
            return actual == expected_str
        elif operator == ConditionOperator.CONTAINS:
            return expected_str in actual
        elif operator == ConditionOperator.STARTS_WITH:
            return actual.startswith(expected_str)
        elif operator == ConditionOperator.ENDS_WITH:
            return actual.endswith(expected_str)
        elif operator == ConditionOperator.ANY:
            return bool(actual)

        return False

    def _match_number(
        self, actual: Union[int, float], operator: ConditionOperator, expected: Optional[Union[str, int, float, bool]]
    ) -> bool:
        """Match a numeric value against an operator and expected value."""
        if expected is None:
            return False

        try:
            expected_num = float(expected)
        except (ValueError, TypeError):
            return False

        if operator == ConditionOperator.EQUALS:
            return actual == expected_num
        elif operator == ConditionOperator.GREATER_THAN:
            return actual >= expected_num  # Using >= for "min" checks
        elif operator == ConditionOperator.LESS_THAN:
            return actual <= expected_num  # Using <= for "max" checks

        return False
