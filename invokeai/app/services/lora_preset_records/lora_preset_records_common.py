from typing import Any

from pydantic import BaseModel, Field, TypeAdapter


class LoRAPresetNotFoundError(Exception):
    """Raised when a LoRA preset is not found"""


class LoRAPresetItem(BaseModel, extra="forbid"):
    model_key: str = Field(description="The model key for the LoRA")
    weight: float = Field(description="The weight of the LoRA")
    is_enabled: bool = Field(description="Whether the LoRA is enabled")


class LoRAPresetData(BaseModel, extra="forbid"):
    loras: list[LoRAPresetItem] = Field(description="List of LoRAs in the preset")


LoRAPresetDataValidator = TypeAdapter(LoRAPresetData)


class LoRAPresetWithoutId(BaseModel):
    name: str = Field(description="The name of the LoRA preset")
    preset_data: LoRAPresetData = Field(description="The preset data containing LoRAs")


class LoRAPresetRecordDTO(LoRAPresetWithoutId):
    id: str = Field(description="The LoRA preset ID")

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "LoRAPresetRecordDTO":
        data["preset_data"] = LoRAPresetDataValidator.validate_json(data.get("preset_data", ""))
        return LoRAPresetRecordDTOValidator.validate_python(data)


LoRAPresetRecordDTOValidator = TypeAdapter(LoRAPresetRecordDTO)
