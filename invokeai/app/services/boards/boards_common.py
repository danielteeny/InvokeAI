from typing import Optional

from pydantic import Field

from invokeai.app.services.board_records.board_records_common import BoardRecord


class BoardDTO(BoardRecord):
    """Deserialized board record with cover image URL and image count."""

    cover_image_name: Optional[str] = Field(description="The name of the board's cover image.")
    """The URL of the thumbnail of the most recent image in the board."""
    image_count: int = Field(description="The number of images directly in this board.")
    """The number of images directly in this board."""
    asset_count: int = Field(description="The number of assets directly in this board.")
    """The number of assets directly in this board."""
    image_count_recursive: int = Field(default=0, description="The number of images including all descendant boards.")
    """The number of images including all descendant boards."""
    asset_count_recursive: int = Field(default=0, description="The number of assets including all descendant boards.")
    """The number of assets including all descendant boards."""
    unseen_count: int = Field(default=0, description="The number of unseen images directly in this board.")
    """The number of unseen (new) images directly in this board."""
    unseen_count_recursive: int = Field(default=0, description="The number of unseen images including all descendant boards.")
    """The number of unseen images including all descendant boards (for parent folders)."""


def board_record_to_dto(
    board_record: BoardRecord,
    cover_image_name: Optional[str],
    image_count: int,
    asset_count: int,
    image_count_recursive: int = 0,
    asset_count_recursive: int = 0,
    unseen_count: int = 0,
    unseen_count_recursive: int = 0,
) -> BoardDTO:
    """Converts a board record to a board DTO."""
    return BoardDTO(
        **board_record.model_dump(exclude={"cover_image_name"}),
        cover_image_name=cover_image_name,
        image_count=image_count,
        asset_count=asset_count,
        image_count_recursive=image_count_recursive,
        asset_count_recursive=asset_count_recursive,
        unseen_count=unseen_count,
        unseen_count_recursive=unseen_count_recursive,
    )
