"""Common models and types for board assignment rules."""

import json
from datetime import datetime
from enum import Enum
from typing import Any, Optional, Union

from pydantic import BaseModel, Field

from invokeai.app.util.misc import get_iso_timestamp


class ConditionType(str, Enum):
    """Types of conditions that can be used in assignment rules."""

    MODEL_NAME = "model_name"
    MODEL_BASE = "model_base"
    LORA_PRESENT = "lora_present"
    LORA_NAME = "lora_name"
    LORA_CATEGORY = "lora_category"
    PROMPT_CONTAINS = "prompt_contains"
    WIDTH_MIN = "width_min"
    WIDTH_MAX = "width_max"
    HEIGHT_MIN = "height_min"
    HEIGHT_MAX = "height_max"


class ConditionOperator(str, Enum):
    """Operators for condition matching."""

    EQUALS = "equals"
    CONTAINS = "contains"
    STARTS_WITH = "starts_with"
    ENDS_WITH = "ends_with"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    ANY = "any"  # For checking if any value is present (e.g., any LoRA)


class RuleCondition(BaseModel):
    """A single condition in a rule."""

    condition_type: ConditionType = Field(description="The type of condition to check")
    operator: ConditionOperator = Field(description="The operator to use for matching")
    value: Optional[Union[str, int, float, bool]] = Field(
        default=None, description="The value to compare against (not needed for 'any' operator)"
    )
    case_sensitive: bool = Field(default=False, description="Whether string comparisons are case-sensitive")


class BoardAssignmentRule(BaseModel):
    """A rule for automatically assigning images to boards."""

    rule_id: str = Field(description="Unique identifier for the rule")
    rule_name: str = Field(description="Human-readable name for the rule")
    target_board_id: str = Field(description="The board to assign images to when this rule matches")
    priority: int = Field(default=0, description="Priority for rule ordering (higher = checked first)")
    is_enabled: bool = Field(default=True, description="Whether the rule is active")
    conditions: list[RuleCondition] = Field(description="Conditions that must match for the rule to apply")
    match_all: bool = Field(default=True, description="If True, all conditions must match (AND). If False, any condition (OR)")
    created_at: Union[datetime, str] = Field(description="When the rule was created")
    updated_at: Union[datetime, str] = Field(description="When the rule was last updated")


class BoardAssignmentRuleCreate(BaseModel):
    """Request to create a new assignment rule."""

    rule_name: str = Field(description="Human-readable name for the rule", max_length=300)
    target_board_id: str = Field(description="The board to assign images to")
    priority: int = Field(default=0, description="Priority for rule ordering")
    is_enabled: bool = Field(default=True, description="Whether the rule is active")
    conditions: list[RuleCondition] = Field(description="Conditions that must match")
    match_all: bool = Field(default=True, description="Whether all conditions must match")


class BoardAssignmentRuleUpdate(BaseModel):
    """Request to update an existing assignment rule."""

    rule_name: Optional[str] = Field(default=None, description="New name for the rule", max_length=300)
    target_board_id: Optional[str] = Field(default=None, description="New target board")
    priority: Optional[int] = Field(default=None, description="New priority")
    is_enabled: Optional[bool] = Field(default=None, description="New enabled status")
    conditions: Optional[list[RuleCondition]] = Field(default=None, description="New conditions")
    match_all: Optional[bool] = Field(default=None, description="New match_all setting")


class EvaluationResult(BaseModel):
    """Result of evaluating rules against metadata."""

    matched_board_id: Optional[str] = Field(description="The board ID that matched (if any)")
    matched_rule_id: Optional[str] = Field(description="The rule ID that matched (if any)")
    matched_rule_name: Optional[str] = Field(description="The rule name that matched (if any)")
    all_matches: list[dict[str, Any]] = Field(
        default_factory=list,
        description="All rules that matched (for conflict resolution)"
    )
    has_conflict: bool = Field(default=False, description="Whether multiple rules matched (requires resolution)")

    @property
    def conflict_count(self) -> int:
        """Return the number of matching rules."""
        return len(self.all_matches)


class ConflictResolutionStrategy(str, Enum):
    """Strategies for handling conflicts when multiple rules match."""

    PRIORITY_BASED = "priority_based"  # Highest priority rule wins (default)
    MOST_SPECIFIC = "most_specific"  # Rule with most conditions wins
    FIRST_MATCH = "first_match"  # First matching rule wins
    MANUAL_ONLY = "manual_only"  # Prompt user on conflict


class ReorderRequest(BaseModel):
    """Request to reorder rule priorities."""

    rule_ids: list[str] = Field(description="Rule IDs in desired priority order (first = highest priority)")


def serialize_conditions(conditions: list[RuleCondition]) -> str:
    """Serialize conditions to JSON for storage."""
    return json.dumps([c.model_dump() for c in conditions])


def deserialize_conditions(conditions_json: str) -> list[RuleCondition]:
    """Deserialize conditions from JSON storage."""
    data = json.loads(conditions_json)
    return [RuleCondition(**c) for c in data]


def deserialize_rule(rule_dict: dict) -> BoardAssignmentRule:
    """Deserialize a rule from database row."""
    return BoardAssignmentRule(
        rule_id=rule_dict.get("rule_id", "unknown"),
        rule_name=rule_dict.get("rule_name", "unknown"),
        target_board_id=rule_dict.get("target_board_id", "unknown"),
        priority=rule_dict.get("priority", 0),
        is_enabled=bool(rule_dict.get("is_enabled", True)),
        conditions=deserialize_conditions(rule_dict.get("conditions", "[]")),
        match_all=bool(rule_dict.get("match_all", True)),
        created_at=rule_dict.get("created_at", get_iso_timestamp()),
        updated_at=rule_dict.get("updated_at", get_iso_timestamp()),
    )
