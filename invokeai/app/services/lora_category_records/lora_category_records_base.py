from abc import ABC, abstractmethod

from invokeai.app.services.lora_category_records.lora_category_records_common import (
    LoraCategoryChanges,
    LoraCategoryRecord,
)


class LoraCategoryRecordStorageBase(ABC):
    """Low-level service responsible for interfacing with the LoRA category record store."""

    @abstractmethod
    def save(self, name: str, color: str, sort_order: int = 0) -> LoraCategoryRecord:
        """Creates a new LoRA category record."""
        pass

    @abstractmethod
    def get(self, category_id: str) -> LoraCategoryRecord:
        """Gets a LoRA category record by ID."""
        pass

    @abstractmethod
    def update(self, category_id: str, changes: LoraCategoryChanges) -> LoraCategoryRecord:
        """Updates a LoRA category record."""
        pass

    @abstractmethod
    def delete(self, category_id: str) -> None:
        """Deletes a LoRA category record."""
        pass

    @abstractmethod
    def get_all(self) -> list[LoraCategoryRecord]:
        """Gets all LoRA category records, ordered by sort_order."""
        pass
