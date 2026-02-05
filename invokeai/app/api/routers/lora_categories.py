from typing import Optional

from fastapi import Body, HTTPException, Path
from fastapi.routing import APIRouter
from pydantic import BaseModel, Field

from invokeai.app.api.dependencies import ApiDependencies
from invokeai.app.services.lora_category_records.lora_category_defaults import DEFAULT_LORA_CATEGORIES
from invokeai.app.services.lora_category_records.lora_category_records_common import (
    LoraCategoryChanges,
    LoraCategoryRecord,
    LoraCategoryRecordDuplicateException,
    LoraCategoryRecordNotFoundException,
)

lora_categories_router = APIRouter(prefix="/v1/lora_categories", tags=["lora_categories"])


class LoraCategoryDTO(BaseModel):
    """LoRA category data transfer object."""

    id: str = Field(description="The unique ID of the category.")
    name: str = Field(description="The display name of the category.")
    color: str = Field(description="The color scheme for the category.")
    sort_order: int = Field(default=0, description="The sort order of the category.")
    is_default: bool = Field(default=False, description="Whether this is a default category.")


class CreateLoraCategoryRequest(BaseModel):
    """Request body for creating a new LoRA category."""

    name: str = Field(description="The display name of the category.", max_length=100)
    color: str = Field(description="The color scheme for the category.", max_length=50)
    sort_order: Optional[int] = Field(default=None, description="The sort order of the category.")


def _record_to_dto(record: LoraCategoryRecord, is_default: bool = False) -> LoraCategoryDTO:
    """Convert a LoraCategoryRecord to a LoraCategoryDTO."""
    return LoraCategoryDTO(
        id=record.id,
        name=record.name,
        color=record.color,
        sort_order=record.sort_order,
        is_default=is_default,
    )


@lora_categories_router.get(
    "/",
    operation_id="list_lora_categories",
    response_model=list[LoraCategoryDTO],
)
async def list_lora_categories() -> list[LoraCategoryDTO]:
    """Gets all LoRA categories (defaults + custom), sorted by sort_order."""
    try:
        # Get custom categories from the database
        custom_records = ApiDependencies.invoker.services.lora_category_records.get_all()

        # Build the result list with defaults first
        result: list[LoraCategoryDTO] = []

        # Add default categories
        for default_cat in DEFAULT_LORA_CATEGORIES:
            result.append(
                LoraCategoryDTO(
                    id=default_cat["id"],
                    name=default_cat["name"],
                    color=default_cat["color"],
                    sort_order=default_cat["sort_order"],
                    is_default=True,
                )
            )

        # Add custom categories (with sort_order offset to come after defaults)
        for record in custom_records:
            result.append(_record_to_dto(record, is_default=False))

        # Sort by is_default (defaults first), then sort_order
        result.sort(key=lambda x: (not x.is_default, x.sort_order, x.name))

        return result
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to list LoRA categories")


@lora_categories_router.post(
    "/",
    operation_id="create_lora_category",
    responses={
        201: {"description": "The category was created successfully"},
    },
    status_code=201,
    response_model=LoraCategoryDTO,
)
async def create_lora_category(
    body: CreateLoraCategoryRequest = Body(description="The category to create"),
) -> LoraCategoryDTO:
    """Creates a new LoRA category."""
    try:
        # Check if name conflicts with a default category
        for default_cat in DEFAULT_LORA_CATEGORIES:
            if default_cat["name"].lower() == body.name.lower():
                raise HTTPException(status_code=409, detail="A default category with this name already exists")

        # Calculate sort_order if not provided
        sort_order = body.sort_order
        if sort_order is None:
            # Place after all existing custom categories
            custom_records = ApiDependencies.invoker.services.lora_category_records.get_all()
            if custom_records:
                sort_order = max(r.sort_order for r in custom_records) + 1
            else:
                sort_order = 100  # Start custom categories at 100

        record = ApiDependencies.invoker.services.lora_category_records.save(
            name=body.name,
            color=body.color,
            sort_order=sort_order,
        )
        return _record_to_dto(record, is_default=False)
    except LoraCategoryRecordDuplicateException:
        raise HTTPException(status_code=409, detail="A category with this name already exists")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create LoRA category")


@lora_categories_router.patch(
    "/i/{category_id}",
    operation_id="update_lora_category",
    responses={
        200: {"description": "The category was updated successfully"},
    },
    response_model=LoraCategoryDTO,
)
async def update_lora_category(
    category_id: str = Path(description="The ID of the category to update"),
    changes: LoraCategoryChanges = Body(description="The changes to apply to the category"),
) -> LoraCategoryDTO:
    """Updates a LoRA category."""
    # Check if trying to update a default category
    for default_cat in DEFAULT_LORA_CATEGORIES:
        if default_cat["id"] == category_id:
            raise HTTPException(status_code=403, detail="Cannot modify default categories")

    try:
        record = ApiDependencies.invoker.services.lora_category_records.update(
            category_id=category_id,
            changes=changes,
        )
        return _record_to_dto(record, is_default=False)
    except LoraCategoryRecordNotFoundException:
        raise HTTPException(status_code=404, detail="Category not found")
    except LoraCategoryRecordDuplicateException:
        raise HTTPException(status_code=409, detail="A category with this name already exists")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to update LoRA category")


@lora_categories_router.delete(
    "/i/{category_id}",
    operation_id="delete_lora_category",
    responses={
        200: {"description": "The category was deleted successfully"},
    },
)
async def delete_lora_category(
    category_id: str = Path(description="The ID of the category to delete"),
) -> dict:
    """Deletes a LoRA category. LoRAs with this category will show as 'Unknown'."""
    # Check if trying to delete a default category
    for default_cat in DEFAULT_LORA_CATEGORIES:
        if default_cat["id"] == category_id:
            raise HTTPException(status_code=403, detail="Cannot delete default categories")

    try:
        ApiDependencies.invoker.services.lora_category_records.delete(category_id=category_id)
        return {"deleted": category_id}
    except LoraCategoryRecordNotFoundException:
        raise HTTPException(status_code=404, detail="Category not found")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to delete LoRA category")
