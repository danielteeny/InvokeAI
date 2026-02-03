from abc import ABC, abstractmethod
from typing import Optional

from invokeai.app.services.board_records.board_records_common import BoardChanges, BoardRecord, BoardRecordOrderBy
from invokeai.app.services.shared.pagination import OffsetPaginatedResults
from invokeai.app.services.shared.sqlite.sqlite_common import SQLiteDirection


class BoardRecordStorageBase(ABC):
    """Low-level service responsible for interfacing with the board record store."""

    @abstractmethod
    def delete(self, board_id: str) -> None:
        """Deletes a board record."""
        pass

    @abstractmethod
    def save(
        self,
        board_name: str,
        parent_board_id: Optional[str] = None,
    ) -> BoardRecord:
        """Saves a board record. Optionally specify a parent board to create as a subfolder."""
        pass

    @abstractmethod
    def get(
        self,
        board_id: str,
    ) -> BoardRecord:
        """Gets a board record."""
        pass

    @abstractmethod
    def update(
        self,
        board_id: str,
        changes: BoardChanges,
    ) -> BoardRecord:
        """Updates a board record."""
        pass

    @abstractmethod
    def get_many(
        self,
        order_by: BoardRecordOrderBy,
        direction: SQLiteDirection,
        offset: int = 0,
        limit: int = 10,
        include_archived: bool = False,
    ) -> OffsetPaginatedResults[BoardRecord]:
        """Gets many board records."""
        pass

    @abstractmethod
    def get_all(
        self, order_by: BoardRecordOrderBy, direction: SQLiteDirection, include_archived: bool = False
    ) -> list[BoardRecord]:
        """Gets all board records."""
        pass

    # Hierarchy methods for nested folder support

    @abstractmethod
    def get_children(self, board_id: Optional[str]) -> list[BoardRecord]:
        """Gets direct children of a board. Pass None to get root-level boards."""
        pass

    @abstractmethod
    def get_descendants(self, board_id: str) -> list[BoardRecord]:
        """Gets all descendants of a board (children, grandchildren, etc.)."""
        pass

    @abstractmethod
    def get_ancestors(self, board_id: str) -> list[BoardRecord]:
        """Gets all ancestors of a board (parent, grandparent, etc.) in order from root to immediate parent."""
        pass

    @abstractmethod
    def move_board(self, board_id: str, new_parent_id: Optional[str], position: Optional[int] = None) -> BoardRecord:
        """Moves a board to a new parent with optional position. Pass None for new_parent_id to move to root level."""
        pass
