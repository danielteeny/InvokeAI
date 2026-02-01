"""API router for board assignment rules."""

from typing import Any, Optional

from fastapi import Body, HTTPException, Path, Query
from fastapi.routing import APIRouter
from pydantic import BaseModel, Field

from invokeai.app.api.dependencies import ApiDependencies
from invokeai.app.services.board_assignment.board_assignment_common import (
    BoardAssignmentRule,
    BoardAssignmentRuleCreate,
    BoardAssignmentRuleUpdate,
    ConflictResolutionStrategy,
    EvaluationResult,
    ReorderRequest,
)
from invokeai.app.services.board_assignment.board_assignment_default import BoardAssignmentRuleNotFoundException

board_assignment_router = APIRouter(prefix="/v1/board_assignment", tags=["board_assignment"])


class RetroactiveApplyRequest(BaseModel):
    """Request to apply rules retroactively to existing images."""

    board_id: Optional[str] = Field(default=None, description="Only process images in this board (None for all)")
    dry_run: bool = Field(default=True, description="If True, only preview changes without applying")


class RetroactiveApplyResult(BaseModel):
    """Result of retroactive rule application."""

    total_images: int = Field(description="Total images processed")
    matches: list[dict[str, Any]] = Field(description="List of matches (image_name, current_board, target_board)")
    applied: bool = Field(description="Whether changes were actually applied (False for dry_run)")


@board_assignment_router.get(
    "/rules",
    operation_id="list_board_assignment_rules",
    response_model=list[BoardAssignmentRule],
)
async def list_rules(
    enabled_only: bool = Query(default=False, description="Only return enabled rules"),
) -> list[BoardAssignmentRule]:
    """Get all board assignment rules."""
    return ApiDependencies.invoker.services.board_assignment.get_all_rules(enabled_only=enabled_only)


@board_assignment_router.get(
    "/rules/{rule_id}",
    operation_id="get_board_assignment_rule",
    response_model=BoardAssignmentRule,
)
async def get_rule(
    rule_id: str = Path(description="The ID of the rule to get"),
) -> BoardAssignmentRule:
    """Get a specific board assignment rule."""
    try:
        return ApiDependencies.invoker.services.board_assignment.get_rule(rule_id)
    except BoardAssignmentRuleNotFoundException:
        raise HTTPException(status_code=404, detail="Rule not found")


@board_assignment_router.post(
    "/rules",
    operation_id="create_board_assignment_rule",
    status_code=201,
    response_model=BoardAssignmentRule,
)
async def create_rule(
    rule: BoardAssignmentRuleCreate = Body(description="The rule to create"),
) -> BoardAssignmentRule:
    """Create a new board assignment rule."""
    try:
        return ApiDependencies.invoker.services.board_assignment.create_rule(rule)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create rule")


@board_assignment_router.patch(
    "/rules/{rule_id}",
    operation_id="update_board_assignment_rule",
    response_model=BoardAssignmentRule,
)
async def update_rule(
    rule_id: str = Path(description="The ID of the rule to update"),
    changes: BoardAssignmentRuleUpdate = Body(description="The changes to apply"),
) -> BoardAssignmentRule:
    """Update an existing board assignment rule."""
    try:
        return ApiDependencies.invoker.services.board_assignment.update_rule(rule_id, changes)
    except BoardAssignmentRuleNotFoundException:
        raise HTTPException(status_code=404, detail="Rule not found")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to update rule")


@board_assignment_router.delete(
    "/rules/{rule_id}",
    operation_id="delete_board_assignment_rule",
    status_code=204,
)
async def delete_rule(
    rule_id: str = Path(description="The ID of the rule to delete"),
) -> None:
    """Delete a board assignment rule."""
    try:
        ApiDependencies.invoker.services.board_assignment.delete_rule(rule_id)
    except BoardAssignmentRuleNotFoundException:
        raise HTTPException(status_code=404, detail="Rule not found")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to delete rule")


@board_assignment_router.post(
    "/rules/reorder",
    operation_id="reorder_board_assignment_rules",
    response_model=list[BoardAssignmentRule],
)
async def reorder_rules(
    request: ReorderRequest = Body(description="The new order of rule IDs"),
) -> list[BoardAssignmentRule]:
    """Reorder board assignment rules by priority."""
    try:
        return ApiDependencies.invoker.services.board_assignment.reorder_rules(request.rule_ids)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to reorder rules")


class EvaluateRequest(BaseModel):
    """Request to evaluate rules against metadata."""

    metadata: dict[str, Any] = Field(description="The metadata to evaluate against rules")
    strategy: ConflictResolutionStrategy = Field(
        default=ConflictResolutionStrategy.PRIORITY_BASED,
        description="Strategy for resolving conflicts when multiple rules match",
    )


@board_assignment_router.post(
    "/evaluate",
    operation_id="evaluate_board_assignment_rules",
    response_model=EvaluationResult,
)
async def evaluate_rules(
    request: EvaluateRequest = Body(description="The evaluation request"),
) -> EvaluationResult:
    """Evaluate board assignment rules against provided metadata."""
    return ApiDependencies.invoker.services.board_assignment.evaluate(request.metadata, request.strategy)


@board_assignment_router.post(
    "/evaluate/{rule_id}",
    operation_id="evaluate_single_board_assignment_rule",
    response_model=bool,
)
async def evaluate_single_rule(
    rule_id: str = Path(description="The ID of the rule to evaluate"),
    metadata: dict[str, Any] = Body(description="The metadata to evaluate against the rule"),
) -> bool:
    """Evaluate a single board assignment rule against provided metadata."""
    try:
        return ApiDependencies.invoker.services.board_assignment.evaluate_single_rule(rule_id, metadata)
    except BoardAssignmentRuleNotFoundException:
        raise HTTPException(status_code=404, detail="Rule not found")


@board_assignment_router.get(
    "/boards/{board_id}/rules",
    operation_id="get_rules_for_board",
    response_model=list[BoardAssignmentRule],
)
async def get_rules_for_board(
    board_id: str = Path(description="The ID of the board to get rules for"),
) -> list[BoardAssignmentRule]:
    """Get all assignment rules targeting a specific board."""
    return ApiDependencies.invoker.services.board_assignment.get_rules_for_board(board_id)
