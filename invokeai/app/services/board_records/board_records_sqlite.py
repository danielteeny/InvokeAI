import sqlite3
from typing import Optional, Union, cast

from invokeai.app.services.board_records.board_records_base import BoardRecordStorageBase
from invokeai.app.services.board_records.board_records_common import (
    BoardChanges,
    BoardRecord,
    BoardRecordDeleteException,
    BoardRecordNotFoundException,
    BoardRecordOrderBy,
    BoardRecordSaveException,
    deserialize_board_record,
)
from invokeai.app.services.shared.pagination import OffsetPaginatedResults
from invokeai.app.services.shared.sqlite.sqlite_common import SQLiteDirection
from invokeai.app.services.shared.sqlite.sqlite_database import SqliteDatabase
from invokeai.app.util.misc import uuid_string


class BoardRecordCircularReferenceException(Exception):
    """Raised when moving a board would create a circular reference."""

    def __init__(self, message="Cannot move a board to be a descendant of itself"):
        super().__init__(message)


class SqliteBoardRecordStorage(BoardRecordStorageBase):
    def __init__(self, db: SqliteDatabase) -> None:
        super().__init__()
        self._db = db

    def delete(self, board_id: str) -> None:
        with self._db.transaction() as cursor:
            try:
                cursor.execute(
                    """--sql
                    DELETE FROM boards
                    WHERE board_id = ?;
                    """,
                    (board_id,),
                )
            except Exception as e:
                raise BoardRecordDeleteException from e

    def save(
        self,
        board_name: str,
    ) -> BoardRecord:
        with self._db.transaction() as cursor:
            try:
                board_id = uuid_string()
                cursor.execute(
                    """--sql
                    INSERT OR IGNORE INTO boards (board_id, board_name)
                    VALUES (?, ?);
                    """,
                    (board_id, board_name),
                )
            except sqlite3.Error as e:
                raise BoardRecordSaveException from e
        return self.get(board_id)

    def get(
        self,
        board_id: str,
    ) -> BoardRecord:
        with self._db.transaction() as cursor:
            try:
                cursor.execute(
                    """--sql
                    SELECT *
                    FROM boards
                    WHERE board_id = ?;
                    """,
                    (board_id,),
                )

                result = cast(Union[sqlite3.Row, None], cursor.fetchone())
            except sqlite3.Error as e:
                raise BoardRecordNotFoundException from e
        if result is None:
            raise BoardRecordNotFoundException
        return BoardRecord(**dict(result))

    def update(
        self,
        board_id: str,
        changes: BoardChanges,
    ) -> BoardRecord:
        with self._db.transaction() as cursor:
            try:
                # Change the name of a board
                if changes.board_name is not None:
                    cursor.execute(
                        """--sql
                        UPDATE boards
                        SET board_name = ?
                        WHERE board_id = ?;
                        """,
                        (changes.board_name, board_id),
                    )

                # Change the cover image of a board
                if changes.cover_image_name is not None:
                    cursor.execute(
                        """--sql
                        UPDATE boards
                        SET cover_image_name = ?
                        WHERE board_id = ?;
                        """,
                        (changes.cover_image_name, board_id),
                    )

                # Change the archived status of a board
                if changes.archived is not None:
                    cursor.execute(
                        """--sql
                        UPDATE boards
                        SET archived = ?
                        WHERE board_id = ?;
                        """,
                        (changes.archived, board_id),
                    )

            except sqlite3.Error as e:
                raise BoardRecordSaveException from e
        return self.get(board_id)

    def get_many(
        self,
        order_by: BoardRecordOrderBy,
        direction: SQLiteDirection,
        offset: int = 0,
        limit: int = 10,
        include_archived: bool = False,
    ) -> OffsetPaginatedResults[BoardRecord]:
        with self._db.transaction() as cursor:
            # Build base query
            base_query = """
                    SELECT *
                    FROM boards
                    {archived_filter}
                    ORDER BY {order_by} {direction}
                    LIMIT ? OFFSET ?;
                """

            # Determine archived filter condition
            archived_filter = "" if include_archived else "WHERE archived = 0"

            final_query = base_query.format(
                archived_filter=archived_filter, order_by=order_by.value, direction=direction.value
            )

            # Execute query to fetch boards
            cursor.execute(final_query, (limit, offset))

            result = cast(list[sqlite3.Row], cursor.fetchall())
            boards = [deserialize_board_record(dict(r)) for r in result]

            # Determine count query
            if include_archived:
                count_query = """
                        SELECT COUNT(*)
                        FROM boards;
                    """
            else:
                count_query = """
                        SELECT COUNT(*)
                        FROM boards
                        WHERE archived = 0;
                    """

            # Execute count query
            cursor.execute(count_query)

            count = cast(int, cursor.fetchone()[0])

        return OffsetPaginatedResults[BoardRecord](items=boards, offset=offset, limit=limit, total=count)

    def get_all(
        self, order_by: BoardRecordOrderBy, direction: SQLiteDirection, include_archived: bool = False
    ) -> list[BoardRecord]:
        with self._db.transaction() as cursor:
            if order_by == BoardRecordOrderBy.Name:
                base_query = """
                        SELECT *
                        FROM boards
                        {archived_filter}
                        ORDER BY LOWER(board_name) {direction}
                    """
            else:
                base_query = """
                        SELECT *
                        FROM boards
                        {archived_filter}
                        ORDER BY {order_by} {direction}
                    """

            archived_filter = "" if include_archived else "WHERE archived = 0"

            final_query = base_query.format(
                archived_filter=archived_filter, order_by=order_by.value, direction=direction.value
            )

            cursor.execute(final_query)

            result = cast(list[sqlite3.Row], cursor.fetchall())
        boards = [deserialize_board_record(dict(r)) for r in result]

        return boards

    # Hierarchy methods for nested folder support

    def get_children(self, board_id: Optional[str]) -> list[BoardRecord]:
        """Gets direct children of a board. Pass None to get root-level boards."""
        with self._db.transaction() as cursor:
            if board_id is None:
                # Get root-level boards (no parent)
                cursor.execute(
                    """--sql
                    SELECT *
                    FROM boards
                    WHERE parent_board_id IS NULL
                    ORDER BY position, created_at;
                    """
                )
            else:
                cursor.execute(
                    """--sql
                    SELECT *
                    FROM boards
                    WHERE parent_board_id = ?
                    ORDER BY position, created_at;
                    """,
                    (board_id,),
                )

            result = cast(list[sqlite3.Row], cursor.fetchall())
        return [deserialize_board_record(dict(r)) for r in result]

    def get_descendants(self, board_id: str) -> list[BoardRecord]:
        """Gets all descendants of a board (children, grandchildren, etc.)."""
        # First get the board's path
        board = self.get(board_id)

        with self._db.transaction() as cursor:
            # Find all boards whose path starts with this board's path + board_id
            # The path format is: /parent1/parent2/...
            # So descendants have paths starting with current_path + / + board_id
            descendant_path_prefix = f"{board.path}/{board_id}" if board.path else f"/{board_id}"

            cursor.execute(
                """--sql
                SELECT *
                FROM boards
                WHERE path LIKE ? || '%'
                ORDER BY path, position;
                """,
                (descendant_path_prefix,),
            )

            result = cast(list[sqlite3.Row], cursor.fetchall())
        return [deserialize_board_record(dict(r)) for r in result]

    def get_ancestors(self, board_id: str) -> list[BoardRecord]:
        """Gets all ancestors of a board (parent, grandparent, etc.) in order from root to immediate parent."""
        board = self.get(board_id)

        if not board.path:
            return []

        # Parse the path to get ancestor IDs
        # Path format: /ancestor1/ancestor2/...
        ancestor_ids = [aid for aid in board.path.split("/") if aid]

        if not ancestor_ids:
            return []

        ancestors = []
        for ancestor_id in ancestor_ids:
            try:
                ancestor = self.get(ancestor_id)
                ancestors.append(ancestor)
            except BoardRecordNotFoundException:
                # Ancestor was deleted, skip it
                pass

        return ancestors

    def move_board(self, board_id: str, new_parent_id: Optional[str], position: Optional[int] = None) -> BoardRecord:
        """Moves a board to a new parent with optional position. Pass None for new_parent_id to move to root level."""
        board = self.get(board_id)

        # Validate that new_parent_id is not the board itself or a descendant
        if new_parent_id is not None:
            if new_parent_id == board_id:
                raise BoardRecordCircularReferenceException("Cannot move a board to be its own child")

            # Check if new_parent_id is a descendant of board_id
            descendants = self.get_descendants(board_id)
            descendant_ids = {d.board_id for d in descendants}
            if new_parent_id in descendant_ids:
                raise BoardRecordCircularReferenceException()

        # Calculate new path
        if new_parent_id is None:
            new_path = ""
        else:
            parent = self.get(new_parent_id)
            new_path = f"{parent.path}/{new_parent_id}" if parent.path else f"/{new_parent_id}"

        # Get siblings to determine position if not specified
        with self._db.transaction() as cursor:
            if position is None:
                # Append at the end
                if new_parent_id is None:
                    cursor.execute(
                        """--sql
                        SELECT COALESCE(MAX(position), -1) + 1 as next_pos
                        FROM boards
                        WHERE parent_board_id IS NULL;
                        """
                    )
                else:
                    cursor.execute(
                        """--sql
                        SELECT COALESCE(MAX(position), -1) + 1 as next_pos
                        FROM boards
                        WHERE parent_board_id = ?;
                        """,
                        (new_parent_id,),
                    )
                position = cast(int, cursor.fetchone()[0])

            # Update the board's parent, position, and path
            cursor.execute(
                """--sql
                UPDATE boards
                SET parent_board_id = ?, position = ?, path = ?
                WHERE board_id = ?;
                """,
                (new_parent_id, position, new_path, board_id),
            )

            # Update paths of all descendants
            old_path = board.path
            old_descendant_prefix = f"{old_path}/{board_id}" if old_path else f"/{board_id}"
            new_descendant_prefix = f"{new_path}/{board_id}"

            # Replace the old path prefix with the new one for all descendants
            cursor.execute(
                """--sql
                UPDATE boards
                SET path = ? || SUBSTR(path, LENGTH(?) + 1)
                WHERE path LIKE ? || '%';
                """,
                (new_descendant_prefix, old_descendant_prefix, old_descendant_prefix),
            )

        return self.get(board_id)
