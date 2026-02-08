from abc import ABC, abstractmethod
from typing import Optional, TypedDict

from invokeai.app.services.image_records.image_records_common import ImageCategory


class BoardImageRecordStorageBase(ABC):
    """Abstract base class for the one-to-many board-image relationship record storage."""

    @abstractmethod
    def add_image_to_board(
        self,
        board_id: str,
        image_name: str,
    ) -> None:
        """Adds an image to a board."""
        pass

    @abstractmethod
    def remove_image_from_board(
        self,
        image_name: str,
    ) -> None:
        """Removes an image from a board."""
        pass

    @abstractmethod
    def get_all_board_image_names_for_board(
        self,
        board_id: str,
        categories: list[ImageCategory] | None,
        is_intermediate: bool | None,
    ) -> list[str]:
        """Gets all board images for a board, as a list of the image names."""
        pass

    @abstractmethod
    def get_board_for_image(
        self,
        image_name: str,
    ) -> Optional[str]:
        """Gets an image's board id, if it has one."""
        pass

    @abstractmethod
    def get_image_count_for_board(
        self,
        board_id: str,
        recursive: bool = False,
    ) -> int:
        """Gets the number of images for a board.

        If recursive is True, includes images from all descendant boards.
        """
        pass

    @abstractmethod
    def get_asset_count_for_board(
        self,
        board_id: str,
        recursive: bool = False,
    ) -> int:
        """Gets the number of assets for a board.

        If recursive is True, includes assets from all descendant boards.
        """
        pass

    class BoardCounts(TypedDict):
        image_count: int
        asset_count: int
        unseen_count: int

    @abstractmethod
    def get_direct_counts_for_boards(
        self,
        board_ids: list[str],
    ) -> dict[str, BoardCounts]:
        """Gets direct image, asset and unseen counts for multiple boards in a single query."""
        pass

    # Unseen notifications methods

    @abstractmethod
    def get_unseen_count_for_board(
        self,
        board_id: str,
        recursive: bool = False,
    ) -> int:
        """Gets the number of unseen images for a board.

        If recursive is True, includes unseen images from all descendant boards.
        """
        pass

    @abstractmethod
    def get_descendant_board_ids(
        self,
        board_id: str,
    ) -> list[str]:
        """Gets all descendant board IDs for a board (children, grandchildren, etc.)."""
        pass

    @abstractmethod
    def mark_images_as_seen(
        self,
        board_id: str | None,
        image_names: list[str] | None = None,
    ) -> None:
        """Marks images as seen.

        If image_names is provided and board_id is None, marks those specific images regardless of board.
        If image_names is None and board_id is provided, marks all images in that board as seen.
        """
        pass

    @abstractmethod
    def mark_images_as_unseen(
        self,
        board_id: str | None,
        image_names: list[str] | None = None,
    ) -> None:
        """Marks images as unseen.

        If image_names is provided and board_id is None, marks those specific images regardless of board.
        If image_names is None and board_id is provided, marks all images in that board as unseen.
        """
        pass
