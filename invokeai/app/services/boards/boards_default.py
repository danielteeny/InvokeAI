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

    def _build_descendants_map(self, board_records: list[BoardRecord]) -> dict[str, list[str]]:
        """Build a descendants lookup map from materialized paths."""
        board_ids = [r.board_id for r in board_records]
        path_by_id = {r.board_id: (r.path or "") for r in board_records}
        descendants_by_board_id: dict[str, list[str]] = {board_id: [] for board_id in board_ids}

        for board_id in board_ids:
            board_path = path_by_id[board_id]
            prefix = f"{board_path}/{board_id}" if board_path else f"/{board_id}"
            prefix_with_separator = f"{prefix}/"
            descendants_by_board_id[board_id] = [
                candidate_id
                for candidate_id, candidate_path in path_by_id.items()
                if candidate_id != board_id and (candidate_path == prefix or candidate_path.startswith(prefix_with_separator))
            ]

        return descendants_by_board_id

    def _get_counts_maps(
        self,
        board_records: list[BoardRecord],
    ) -> tuple[
        dict[str, dict[str, int]],
        dict[str, dict[str, int]],
    ]:
        """Gets direct and recursive counts for all boards with batched queries."""
        board_ids = [r.board_id for r in board_records]
        if len(board_ids) == 0:
            return {}, {}

        direct_counts = self.__invoker.services.board_image_records.get_direct_counts_for_boards(board_ids)
        descendants_by_board_id = self._build_descendants_map(board_records)

        recursive_counts: dict[str, dict[str, int]] = {}
        for board_id in board_ids:
            direct = direct_counts.get(board_id, {"image_count": 0, "asset_count": 0, "unseen_count": 0})
            recursive = {
                "image_count": int(direct["image_count"]),
                "asset_count": int(direct["asset_count"]),
                "unseen_count": int(direct["unseen_count"]),
            }
            for descendant_id in descendants_by_board_id.get(board_id, []):
                descendant_counts = direct_counts.get(
                    descendant_id,
                    {"image_count": 0, "asset_count": 0, "unseen_count": 0},
                )
                recursive["image_count"] += int(descendant_counts["image_count"])
                recursive["asset_count"] += int(descendant_counts["asset_count"])
                recursive["unseen_count"] += int(descendant_counts["unseen_count"])

            recursive_counts[board_id] = recursive

        normalized_direct_counts: dict[str, dict[str, int]] = {
            board_id: {
                "image_count": int(values["image_count"]),
                "asset_count": int(values["asset_count"]),
                "unseen_count": int(values["unseen_count"]),
            }
            for board_id, values in direct_counts.items()
        }

        return normalized_direct_counts, recursive_counts

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
        direct_counts, recursive_counts = self._get_counts_maps(board_records.items)
        board_dtos = []
        for r in board_records.items:
            cover_image = self.__invoker.services.image_records.get_most_recent_image_for_board(r.board_id)
            if cover_image:
                cover_image_name = cover_image.image_name
            else:
                cover_image_name = None

            direct = direct_counts.get(r.board_id, {"image_count": 0, "asset_count": 0, "unseen_count": 0})
            recursive = recursive_counts.get(r.board_id, direct)
            board_dtos.append(
                board_record_to_dto(
                    r,
                    cover_image_name,
                    direct["image_count"],
                    direct["asset_count"],
                    recursive["image_count"],
                    recursive["asset_count"],
                    direct["unseen_count"],
                    recursive["unseen_count"],
                )
            )

        return OffsetPaginatedResults[BoardDTO](items=board_dtos, offset=offset, limit=limit, total=len(board_dtos))

    def get_all(
        self, order_by: BoardRecordOrderBy, direction: SQLiteDirection, include_archived: bool = False
    ) -> list[BoardDTO]:
        board_records = self.__invoker.services.board_records.get_all(order_by, direction, include_archived)
        direct_counts, recursive_counts = self._get_counts_maps(board_records)
        board_dtos = []
        for r in board_records:
            cover_image = self.__invoker.services.image_records.get_most_recent_image_for_board(r.board_id)
            if cover_image:
                cover_image_name = cover_image.image_name
            else:
                cover_image_name = None

            direct = direct_counts.get(r.board_id, {"image_count": 0, "asset_count": 0, "unseen_count": 0})
            recursive = recursive_counts.get(r.board_id, direct)
            board_dtos.append(
                board_record_to_dto(
                    r,
                    cover_image_name,
                    direct["image_count"],
                    direct["asset_count"],
                    recursive["image_count"],
                    recursive["asset_count"],
                    direct["unseen_count"],
                    recursive["unseen_count"],
                )
            )

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
