from abc import ABC, abstractmethod

from invokeai.app.services.lora_preset_records.lora_preset_records_common import (
    LoRAPresetRecordDTO,
    LoRAPresetWithoutId,
)


class LoRAPresetRecordsStorageBase(ABC):
    """Base class for LoRA preset storage services."""

    @abstractmethod
    def get(self, lora_preset_id: str) -> LoRAPresetRecordDTO:
        """Get LoRA preset by id."""
        pass

    @abstractmethod
    def create(self, lora_preset: LoRAPresetWithoutId) -> LoRAPresetRecordDTO:
        """Creates a LoRA preset."""
        pass

    @abstractmethod
    def delete(self, lora_preset_id: str) -> None:
        """Deletes a LoRA preset."""
        pass

    @abstractmethod
    def get_many(self) -> list[LoRAPresetRecordDTO]:
        """Gets all LoRA presets."""
        pass
