from datetime import datetime
from typing import Optional, Union

from pydantic import BaseModel, Field

from invokeai.app.util.misc import get_iso_timestamp
from invokeai.app.util.model_exclude_null import BaseModelExcludeNull


class LoraCategoryRecord(BaseModelExcludeNull):
    """Deserialized LoRA category record."""

    id: str = Field(description="The unique ID of the category.")
    name: str = Field(description="The display name of the category.")
    color: str = Field(description="The color scheme for the category.")
    sort_order: int = Field(default=0, description="The sort order of the category.")
    created_at: Union[datetime, str] = Field(description="The created timestamp of the category.")
    updated_at: Union[datetime, str] = Field(description="The updated timestamp of the category.")


def deserialize_lora_category_record(record_dict: dict) -> LoraCategoryRecord:
    """Deserializes a LoRA category record from a database row."""
    return LoraCategoryRecord(
        id=record_dict.get("id", "unknown"),
        name=record_dict.get("name", "Unknown"),
        color=record_dict.get("color", "base"),
        sort_order=record_dict.get("sort_order", 0),
        created_at=record_dict.get("created_at", get_iso_timestamp()),
        updated_at=record_dict.get("updated_at", get_iso_timestamp()),
    )


class LoraCategoryChanges(BaseModel, extra="forbid"):
    """Changes to apply to a LoRA category record."""

    name: Optional[str] = Field(default=None, description="The new display name.", max_length=100)
    color: Optional[str] = Field(default=None, description="The new color scheme.", max_length=50)
    sort_order: Optional[int] = Field(default=None, description="The new sort order.")


class LoraCategoryRecordNotFoundException(Exception):
    """Raised when a LoRA category record is not found."""

    def __init__(self, message: str = "LoRA category record not found"):
        super().__init__(message)


class LoraCategoryRecordSaveException(Exception):
    """Raised when a LoRA category record cannot be saved."""

    def __init__(self, message: str = "LoRA category record not saved"):
        super().__init__(message)


class LoraCategoryRecordDeleteException(Exception):
    """Raised when a LoRA category record cannot be deleted."""

    def __init__(self, message: str = "LoRA category record not deleted"):
        super().__init__(message)


class LoraCategoryRecordDuplicateException(Exception):
    """Raised when attempting to create a duplicate category."""

    def __init__(self, message: str = "A category with this name already exists"):
        super().__init__(message)
