from abc import ABC, abstractmethod
from typing import Optional

from invokeai.app.services.board_records.board_records_common import BoardChanges, BoardRecordOrderBy
from invokeai.app.services.boards.boards_common import BoardDTO
from invokeai.app.services.shared.pagination import OffsetPaginatedResults
from invokeai.app.services.shared.sqlite.sqlite_common import SQLiteDirection


class BoardServiceABC(ABC):
    """High-level service for board management."""

    @abstractmethod
    def create(
        self,
        board_name: str,
    ) -> BoardDTO:
        """Creates a board."""
        pass

    @abstractmethod
    def get_dto(
        self,
        board_id: str,
    ) -> BoardDTO:
        """Gets a board."""
        pass

    @abstractmethod
    def update(
        self,
        board_id: str,
        changes: BoardChanges,
    ) -> BoardDTO:
        """Updates a board."""
        pass

    @abstractmethod
    def delete(
        self,
        board_id: str,
    ) -> None:
        """Deletes a board."""
        pass

    @abstractmethod
    def get_many(
        self,
        order_by: BoardRecordOrderBy,
        direction: SQLiteDirection,
        offset: int = 0,
        limit: int = 10,
        include_archived: bool = False,
    ) -> OffsetPaginatedResults[BoardDTO]:
        """Gets many boards."""
        pass

    @abstractmethod
    def get_all(
        self, order_by: BoardRecordOrderBy, direction: SQLiteDirection, include_archived: bool = False
    ) -> list[BoardDTO]:
        """Gets all boards."""
        pass

    # Hierarchy methods for nested folder support

    @abstractmethod
    def get_children(self, parent_id: Optional[str]) -> list[BoardDTO]:
        """Gets direct children of a board. Pass None to get root-level boards."""
        pass

    @abstractmethod
    def get_descendants(self, board_id: str) -> list[BoardDTO]:
        """Gets all descendants of a board (children, grandchildren, etc.)."""
        pass

    @abstractmethod
    def get_ancestors(self, board_id: str) -> list[BoardDTO]:
        """Gets all ancestors of a board (parent, grandparent, etc.) in order from root to immediate parent."""
        pass

    @abstractmethod
    def move_board(self, board_id: str, new_parent_id: Optional[str], position: Optional[int] = None) -> BoardDTO:
        """Moves a board to a new parent with optional position. Pass None for new_parent_id to move to root level."""
        pass
