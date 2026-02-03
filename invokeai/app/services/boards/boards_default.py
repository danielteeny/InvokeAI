from typing import Optional

from invokeai.app.services.board_records.board_records_common import BoardChanges, BoardRecord, BoardRecordOrderBy
from invokeai.app.services.boards.boards_base import BoardServiceABC
from invokeai.app.services.boards.boards_common import BoardDTO, board_record_to_dto
from invokeai.app.services.invoker import Invoker
from invokeai.app.services.shared.pagination import OffsetPaginatedResults
from invokeai.app.services.shared.sqlite.sqlite_common import SQLiteDirection


class BoardService(BoardServiceABC):
    __invoker: Invoker

    def start(self, invoker: Invoker) -> None:
        self.__invoker = invoker

    def create(
        self,
        board_name: str,
        parent_board_id: Optional[str] = None,
    ) -> BoardDTO:
        board_record = self.__invoker.services.board_records.save(board_name, parent_board_id)
        return board_record_to_dto(board_record, None, 0, 0, 0, 0, 0, 0)

    def get_dto(self, board_id: str) -> BoardDTO:
        board_record = self.__invoker.services.board_records.get(board_id)
        cover_image = self.__invoker.services.image_records.get_most_recent_image_for_board(board_record.board_id)
        if cover_image:
            cover_image_name = cover_image.image_name
        else:
            cover_image_name = None
        image_count = self.__invoker.services.board_image_records.get_image_count_for_board(board_id, recursive=False)
        asset_count = self.__invoker.services.board_image_records.get_asset_count_for_board(board_id, recursive=False)
        image_count_recursive = self.__invoker.services.board_image_records.get_image_count_for_board(board_id, recursive=True)
        asset_count_recursive = self.__invoker.services.board_image_records.get_asset_count_for_board(board_id, recursive=True)
        unseen_count = self.__invoker.services.board_image_records.get_unseen_count_for_board(board_id, recursive=False)
        unseen_count_recursive = self.__invoker.services.board_image_records.get_unseen_count_for_board(board_id, recursive=True)
        return board_record_to_dto(board_record, cover_image_name, image_count, asset_count, image_count_recursive, asset_count_recursive, unseen_count, unseen_count_recursive)

    def update(
        self,
        board_id: str,
        changes: BoardChanges,
    ) -> BoardDTO:
        board_record = self.__invoker.services.board_records.update(board_id, changes)
        cover_image = self.__invoker.services.image_records.get_most_recent_image_for_board(board_record.board_id)
        if cover_image:
            cover_image_name = cover_image.image_name
        else:
            cover_image_name = None

        image_count = self.__invoker.services.board_image_records.get_image_count_for_board(board_id, recursive=False)
        asset_count = self.__invoker.services.board_image_records.get_asset_count_for_board(board_id, recursive=False)
        image_count_recursive = self.__invoker.services.board_image_records.get_image_count_for_board(board_id, recursive=True)
        asset_count_recursive = self.__invoker.services.board_image_records.get_asset_count_for_board(board_id, recursive=True)
        unseen_count = self.__invoker.services.board_image_records.get_unseen_count_for_board(board_id, recursive=False)
        unseen_count_recursive = self.__invoker.services.board_image_records.get_unseen_count_for_board(board_id, recursive=True)
        return board_record_to_dto(board_record, cover_image_name, image_count, asset_count, image_count_recursive, asset_count_recursive, unseen_count, unseen_count_recursive)

    def delete(self, board_id: str) -> None:
        self.__invoker.services.board_records.delete(board_id)

    def get_many(
        self,
        order_by: BoardRecordOrderBy,
        direction: SQLiteDirection,
        offset: int = 0,
        limit: int = 10,
        include_archived: bool = False,
    ) -> OffsetPaginatedResults[BoardDTO]:
        board_records = self.__invoker.services.board_records.get_many(
            order_by, direction, offset, limit, include_archived
        )
        board_dtos = []
        for r in board_records.items:
            cover_image = self.__invoker.services.image_records.get_most_recent_image_for_board(r.board_id)
            if cover_image:
                cover_image_name = cover_image.image_name
            else:
                cover_image_name = None

            image_count = self.__invoker.services.board_image_records.get_image_count_for_board(r.board_id, recursive=False)
            asset_count = self.__invoker.services.board_image_records.get_asset_count_for_board(r.board_id, recursive=False)
            image_count_recursive = self.__invoker.services.board_image_records.get_image_count_for_board(r.board_id, recursive=True)
            asset_count_recursive = self.__invoker.services.board_image_records.get_asset_count_for_board(r.board_id, recursive=True)
            unseen_count = self.__invoker.services.board_image_records.get_unseen_count_for_board(r.board_id, recursive=False)
            unseen_count_recursive = self.__invoker.services.board_image_records.get_unseen_count_for_board(r.board_id, recursive=True)
            board_dtos.append(board_record_to_dto(r, cover_image_name, image_count, asset_count, image_count_recursive, asset_count_recursive, unseen_count, unseen_count_recursive))

        return OffsetPaginatedResults[BoardDTO](items=board_dtos, offset=offset, limit=limit, total=len(board_dtos))

    def get_all(
        self, order_by: BoardRecordOrderBy, direction: SQLiteDirection, include_archived: bool = False
    ) -> list[BoardDTO]:
        board_records = self.__invoker.services.board_records.get_all(order_by, direction, include_archived)
        board_dtos = []
        for r in board_records:
            cover_image = self.__invoker.services.image_records.get_most_recent_image_for_board(r.board_id)
            if cover_image:
                cover_image_name = cover_image.image_name
            else:
                cover_image_name = None

            image_count = self.__invoker.services.board_image_records.get_image_count_for_board(r.board_id, recursive=False)
            asset_count = self.__invoker.services.board_image_records.get_asset_count_for_board(r.board_id, recursive=False)
            image_count_recursive = self.__invoker.services.board_image_records.get_image_count_for_board(r.board_id, recursive=True)
            asset_count_recursive = self.__invoker.services.board_image_records.get_asset_count_for_board(r.board_id, recursive=True)
            unseen_count = self.__invoker.services.board_image_records.get_unseen_count_for_board(r.board_id, recursive=False)
            unseen_count_recursive = self.__invoker.services.board_image_records.get_unseen_count_for_board(r.board_id, recursive=True)
            board_dtos.append(board_record_to_dto(r, cover_image_name, image_count, asset_count, image_count_recursive, asset_count_recursive, unseen_count, unseen_count_recursive))

        return board_dtos

    # Hierarchy methods for nested folder support

    def _board_record_to_dto(self, board_record: BoardRecord) -> BoardDTO:
        """Helper to convert a board record to a DTO with cover image and counts."""
        cover_image = self.__invoker.services.image_records.get_most_recent_image_for_board(board_record.board_id)
        cover_image_name = cover_image.image_name if cover_image else None
        image_count = self.__invoker.services.board_image_records.get_image_count_for_board(board_record.board_id, recursive=False)
        asset_count = self.__invoker.services.board_image_records.get_asset_count_for_board(board_record.board_id, recursive=False)
        image_count_recursive = self.__invoker.services.board_image_records.get_image_count_for_board(board_record.board_id, recursive=True)
        asset_count_recursive = self.__invoker.services.board_image_records.get_asset_count_for_board(board_record.board_id, recursive=True)
        unseen_count = self.__invoker.services.board_image_records.get_unseen_count_for_board(board_record.board_id, recursive=False)
        unseen_count_recursive = self.__invoker.services.board_image_records.get_unseen_count_for_board(board_record.board_id, recursive=True)
        return board_record_to_dto(board_record, cover_image_name, image_count, asset_count, image_count_recursive, asset_count_recursive, unseen_count, unseen_count_recursive)

    def get_children(self, parent_id: Optional[str]) -> list[BoardDTO]:
        """Gets direct children of a board. Pass None to get root-level boards."""
        board_records = self.__invoker.services.board_records.get_children(parent_id)
        return [self._board_record_to_dto(r) for r in board_records]

    def get_descendants(self, board_id: str) -> list[BoardDTO]:
        """Gets all descendants of a board (children, grandchildren, etc.)."""
        board_records = self.__invoker.services.board_records.get_descendants(board_id)
        return [self._board_record_to_dto(r) for r in board_records]

    def get_ancestors(self, board_id: str) -> list[BoardDTO]:
        """Gets all ancestors of a board (parent, grandparent, etc.) in order from root to immediate parent."""
        board_records = self.__invoker.services.board_records.get_ancestors(board_id)
        return [self._board_record_to_dto(r) for r in board_records]

    def move_board(self, board_id: str, new_parent_id: Optional[str], position: Optional[int] = None) -> BoardDTO:
        """Moves a board to a new parent with optional position. Pass None for new_parent_id to move to root level."""
        board_record = self.__invoker.services.board_records.move_board(board_id, new_parent_id, position)
        return self._board_record_to_dto(board_record)
