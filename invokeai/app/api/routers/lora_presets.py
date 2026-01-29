from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel, Field

from invokeai.app.api.dependencies import ApiDependencies
from invokeai.app.services.lora_preset_records.lora_preset_records_common import (
    LoRAPresetData,
    LoRAPresetNotFoundError,
    LoRAPresetRecordDTO,
    LoRAPresetWithoutId,
)


class CreateLoRAPresetBody(BaseModel):
    name: str = Field(description="The name of the LoRA preset")
    preset_data: LoRAPresetData = Field(description="The preset data containing LoRAs")


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


@lora_presets_router.post(
    "/",
    operation_id="create_lora_preset",
    responses={
        200: {"model": LoRAPresetRecordDTO},
    },
)
async def create_lora_preset(
    body: CreateLoRAPresetBody,
) -> LoRAPresetRecordDTO:
    """Creates a LoRA preset"""
    lora_preset = LoRAPresetWithoutId(name=body.name, preset_data=body.preset_data)
    return ApiDependencies.invoker.services.lora_preset_records.create(lora_preset=lora_preset)


@lora_presets_router.delete(
    "/i/{lora_preset_id}",
    operation_id="delete_lora_preset",
)
async def delete_lora_preset(
    lora_preset_id: str = Path(description="The LoRA preset to delete"),
) -> None:
    """Deletes a LoRA preset"""
    try:
        ApiDependencies.invoker.services.lora_preset_records.delete(lora_preset_id)
    except LoRAPresetNotFoundError:
        raise HTTPException(status_code=404, detail="LoRA preset not found")
