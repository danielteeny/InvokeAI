from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel, Field

from invokeai.app.api.dependencies import ApiDependencies
from invokeai.app.services.lora_preset_records.lora_preset_records_common import (
    LoRAPresetData,
    LoRAPresetDuplicateNameError,
    LoRAPresetNotFoundError,
    LoRAPresetRecordDTO,
    LoRAPresetUpdate,
    LoRAPresetWithoutId,
)


class CreateLoRAPresetBody(BaseModel):
    name: str = Field(min_length=1, max_length=100, description="The name of the LoRA preset")
    preset_data: LoRAPresetData = Field(description="The preset data containing LoRAs")


class UpdateLoRAPresetBody(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100, description="The new name of the LoRA preset")
    preset_data: LoRAPresetData | None = Field(default=None, description="The new preset data")


lora_presets_router = APIRouter(prefix="/v1/lora_presets", tags=["lora_presets"])


@lora_presets_router.get(
    "/",
    operation_id="list_lora_presets",
    responses={
        200: {"model": list[LoRAPresetRecordDTO]},
    },
)
async def list_lora_presets() -> list[LoRAPresetRecordDTO]:
    """Gets all LoRA presets"""
    return ApiDependencies.invoker.services.lora_preset_records.get_many()


@lora_presets_router.get(
    "/i/{lora_preset_id}",
    operation_id="get_lora_preset",
    responses={
        200: {"model": LoRAPresetRecordDTO},
        404: {"description": "LoRA preset not found"},
    },
)
async def get_lora_preset(
    lora_preset_id: str = Path(description="The LoRA preset to get"),
) -> LoRAPresetRecordDTO:
    """Gets a LoRA preset by ID"""
    try:
        return ApiDependencies.invoker.services.lora_preset_records.get(lora_preset_id)
    except LoRAPresetNotFoundError:
        raise HTTPException(status_code=404, detail="LoRA preset not found")


@lora_presets_router.post(
    "/",
    operation_id="create_lora_preset",
    responses={
        200: {"model": LoRAPresetRecordDTO},
        409: {"description": "A preset with this name already exists"},
    },
)
async def create_lora_preset(
    body: CreateLoRAPresetBody,
) -> LoRAPresetRecordDTO:
    """Creates a LoRA preset"""
    try:
        lora_preset = LoRAPresetWithoutId(name=body.name, preset_data=body.preset_data)
        return ApiDependencies.invoker.services.lora_preset_records.create(lora_preset=lora_preset)
    except LoRAPresetDuplicateNameError:
        raise HTTPException(status_code=409, detail="A preset with this name already exists")


@lora_presets_router.patch(
    "/i/{lora_preset_id}",
    operation_id="update_lora_preset",
    responses={
        200: {"model": LoRAPresetRecordDTO},
        404: {"description": "LoRA preset not found"},
        409: {"description": "A preset with this name already exists"},
    },
)
async def update_lora_preset(
    body: UpdateLoRAPresetBody,
    lora_preset_id: str = Path(description="The LoRA preset to update"),
) -> LoRAPresetRecordDTO:
    """Updates a LoRA preset"""
    try:
        changes = LoRAPresetUpdate(name=body.name, preset_data=body.preset_data)
        return ApiDependencies.invoker.services.lora_preset_records.update(lora_preset_id, changes)
    except LoRAPresetNotFoundError:
        raise HTTPException(status_code=404, detail="LoRA preset not found")
    except LoRAPresetDuplicateNameError:
        raise HTTPException(status_code=409, detail="A preset with this name already exists")


@lora_presets_router.delete(
    "/i/{lora_preset_id}",
    operation_id="delete_lora_preset",
    responses={
        204: {"description": "LoRA preset deleted successfully"},
        404: {"description": "LoRA preset not found"},
    },
)
async def delete_lora_preset(
    lora_preset_id: str = Path(description="The LoRA preset to delete"),
) -> None:
    """Deletes a LoRA preset"""
    try:
        ApiDependencies.invoker.services.lora_preset_records.delete(lora_preset_id)
    except LoRAPresetNotFoundError:
        raise HTTPException(status_code=404, detail="LoRA preset not found")
