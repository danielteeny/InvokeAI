import sqlite3
from typing import Optional, cast

from invokeai.app.services.board_image_records.board_image_records_base import BoardImageRecordStorageBase
from invokeai.app.services.image_records.image_records_common import (
    ASSETS_CATEGORIES,
    IMAGE_CATEGORIES,
    ImageCategory,
    ImageRecord,
    deserialize_image_record,
)
from invokeai.app.services.shared.pagination import OffsetPaginatedResults
from invokeai.app.services.shared.sqlite.sqlite_database import SqliteDatabase


class SqliteBoardImageRecordStorage(BoardImageRecordStorageBase):
    def __init__(self, db: SqliteDatabase) -> None:
        super().__init__()
        self._db = db

    def add_image_to_board(
        self,
        board_id: str,
        image_name: str,
    ) -> None:
        with self._db.transaction() as cursor:
            cursor.execute(
                """--sql
                INSERT INTO board_images (board_id, image_name, is_seen, added_at)
                VALUES (?, ?, 0, CURRENT_TIMESTAMP)
                ON CONFLICT (image_name) DO UPDATE SET board_id = ?, is_seen = 0, added_at = CURRENT_TIMESTAMP;
                """,
                (board_id, image_name, board_id),
            )

    def remove_image_from_board(
        self,
        image_name: str,
    ) -> None:
        with self._db.transaction() as cursor:
            cursor.execute(
                """--sql
                DELETE FROM board_images
                WHERE image_name = ?;
                """,
                (image_name,),
            )

    def get_images_for_board(
        self,
        board_id: str,
        offset: int = 0,
        limit: int = 10,
    ) -> OffsetPaginatedResults[ImageRecord]:
        with self._db.transaction() as cursor:
            cursor.execute(
                """--sql
                SELECT images.*
                FROM board_images
                INNER JOIN images ON board_images.image_name = images.image_name
                WHERE board_images.board_id = ?
                ORDER BY board_images.updated_at DESC;
                """,
                (board_id,),
            )
            result = cast(list[sqlite3.Row], cursor.fetchall())
            images = [deserialize_image_record(dict(r)) for r in result]

            cursor.execute(
                """--sql
                SELECT COUNT(*) FROM images WHERE 1=1;
                """
            )
            count = cast(int, cursor.fetchone()[0])

        return OffsetPaginatedResults(items=images, offset=offset, limit=limit, total=count)

    def get_all_board_image_names_for_board(
        self,
        board_id: str,
        categories: list[ImageCategory] | None,
        is_intermediate: bool | None,
    ) -> list[str]:
        with self._db.transaction() as cursor:
            params: list[str | bool] = []

            # Base query is a join between images and board_images
            stmt = """
                    SELECT images.image_name
                    FROM images
                    LEFT JOIN board_images ON board_images.image_name = images.image_name
                    WHERE 1=1
                    """

            # Handle board_id filter
            if board_id == "none":
                stmt += """--sql
                    AND board_images.board_id IS NULL
                    """
            else:
                stmt += """--sql
                    AND board_images.board_id = ?
                    """
                params.append(board_id)

            # Add the category filter
            if categories is not None:
                # Convert the enum values to unique list of strings
                category_strings = [c.value for c in set(categories)]
                # Create the correct length of placeholders
                placeholders = ",".join("?" * len(category_strings))
                stmt += f"""--sql
                    AND images.image_category IN ( {placeholders} )
                    """

                # Unpack the included categories into the query params
                for c in category_strings:
                    params.append(c)

            # Add the is_intermediate filter
            if is_intermediate is not None:
                stmt += """--sql
                    AND images.is_intermediate = ?
                    """
                params.append(is_intermediate)

            # Put a ring on it
            stmt += ";"

            cursor.execute(stmt, params)

            result = cast(list[sqlite3.Row], cursor.fetchall())
        image_names = [r[0] for r in result]
        return image_names

    def get_board_for_image(
        self,
        image_name: str,
    ) -> Optional[str]:
        with self._db.transaction() as cursor:
            cursor.execute(
                """--sql
                    SELECT board_id
                    FROM board_images
                    WHERE image_name = ?;
                    """,
                (image_name,),
            )
            result = cursor.fetchone()
        if result is None:
            return None
        return cast(str, result[0])

    def get_image_count_for_board(self, board_id: str, recursive: bool = False) -> int:
        """Gets the number of images for a board.

        If recursive is True, includes images from all descendant boards.
        """
        with self._db.transaction() as cursor:
            # Convert the enum values to unique list of strings
            category_strings = [c.value for c in set(IMAGE_CATEGORIES)]
            # Create the correct length of placeholders for categories
            category_placeholders = ",".join("?" * len(category_strings))

            if recursive:
                # Get descendant board IDs
                descendant_ids = self.get_descendant_board_ids(board_id)
                all_board_ids = [board_id] + descendant_ids
                board_placeholders = ",".join("?" * len(all_board_ids))
                cursor.execute(
                    f"""--sql
                        SELECT COUNT(*)
                        FROM board_images
                        INNER JOIN images ON board_images.image_name = images.image_name
                        WHERE images.is_intermediate = FALSE AND images.image_category IN ( {category_placeholders} )
                        AND board_images.board_id IN ({board_placeholders});
                        """,
                    (*category_strings, *all_board_ids),
                )
            else:
                cursor.execute(
                    f"""--sql
                        SELECT COUNT(*)
                        FROM board_images
                        INNER JOIN images ON board_images.image_name = images.image_name
                        WHERE images.is_intermediate = FALSE AND images.image_category IN ( {category_placeholders} )
                        AND board_images.board_id = ?;
                        """,
                    (*category_strings, board_id),
                )
            count = cast(int, cursor.fetchone()[0])
        return count

    def get_asset_count_for_board(self, board_id: str, recursive: bool = False) -> int:
        """Gets the number of assets for a board.

        If recursive is True, includes assets from all descendant boards.
        """
        with self._db.transaction() as cursor:
            # Convert the enum values to unique list of strings
            category_strings = [c.value for c in set(ASSETS_CATEGORIES)]
            # Create the correct length of placeholders for categories
            category_placeholders = ",".join("?" * len(category_strings))

            if recursive:
                # Get descendant board IDs
                descendant_ids = self.get_descendant_board_ids(board_id)
                all_board_ids = [board_id] + descendant_ids
                board_placeholders = ",".join("?" * len(all_board_ids))
                cursor.execute(
                    f"""--sql
                        SELECT COUNT(*)
                        FROM board_images
                        INNER JOIN images ON board_images.image_name = images.image_name
                        WHERE images.is_intermediate = FALSE AND images.image_category IN ( {category_placeholders} )
                        AND board_images.board_id IN ({board_placeholders});
                        """,
                    (*category_strings, *all_board_ids),
                )
            else:
                cursor.execute(
                    f"""--sql
                        SELECT COUNT(*)
                        FROM board_images
                        INNER JOIN images ON board_images.image_name = images.image_name
                        WHERE images.is_intermediate = FALSE AND images.image_category IN ( {category_placeholders} )
                        AND board_images.board_id = ?;
                        """,
                    (*category_strings, board_id),
                )
            count = cast(int, cursor.fetchone()[0])
        return count

    # Unseen notifications methods

    def get_descendant_board_ids(self, board_id: str) -> list[str]:
        """Gets all descendant board IDs for a board (children, grandchildren, etc.)."""
        with self._db.transaction() as cursor:
            # First get the board's path
            cursor.execute(
                """--sql
                SELECT path
                FROM boards
                WHERE board_id = ?;
                """,
                (board_id,),
            )
            result = cursor.fetchone()
            if result is None:
                return []

            path = result[0] if result[0] else ""
            # Build the descendant path prefix
            descendant_path_prefix = f"{path}/{board_id}" if path else f"/{board_id}"

            # Find all boards whose path starts with this prefix
            cursor.execute(
                """--sql
                SELECT board_id
                FROM boards
                WHERE path LIKE ? || '%';
                """,
                (descendant_path_prefix,),
            )
            rows = cursor.fetchall()
        return [row[0] for row in rows]

    def get_unseen_count_for_board(self, board_id: str, recursive: bool = False) -> int:
        """Gets the number of unseen images for a board.

        If recursive is True, includes unseen images from all descendant boards.
        """
        with self._db.transaction() as cursor:
            if recursive:
                # Get descendant board IDs
                descendant_ids = self.get_descendant_board_ids(board_id)
                all_board_ids = [board_id] + descendant_ids
                placeholders = ",".join("?" * len(all_board_ids))
                cursor.execute(
                    f"""--sql
                    SELECT COUNT(*)
                    FROM board_images
                    INNER JOIN images ON board_images.image_name = images.image_name
                    WHERE board_images.board_id IN ({placeholders})
                    AND board_images.is_seen = 0
                    AND images.is_intermediate = FALSE;
                    """,
                    all_board_ids,
                )
            else:
                cursor.execute(
                    """--sql
                    SELECT COUNT(*)
                    FROM board_images
                    INNER JOIN images ON board_images.image_name = images.image_name
                    WHERE board_images.board_id = ?
                    AND board_images.is_seen = 0
                    AND images.is_intermediate = FALSE;
                    """,
                    (board_id,),
                )
            count = cast(int, cursor.fetchone()[0])
        return count

    def mark_images_as_seen(
        self,
        board_id: str | None,
        image_names: list[str] | None = None,
    ) -> None:
        """Marks images as seen.

        If image_names is provided and board_id is None, marks those specific images regardless of board.
        If image_names is None and board_id is provided, marks all images in that board as seen.
        """
        with self._db.transaction() as cursor:
            if image_names is not None:
                # Mark specific images as seen
                if len(image_names) == 0:
                    return

                placeholders = ",".join("?" * len(image_names))

                if board_id is None:
                    # Mark images regardless of which board they're in
                    cursor.execute(
                        f"""--sql
                        UPDATE board_images
                        SET is_seen = 1
                        WHERE image_name IN ({placeholders});
                        """,
                        image_names,
                    )
                else:
                    # Mark images only in the specified board
                    cursor.execute(
                        f"""--sql
                        UPDATE board_images
                        SET is_seen = 1
                        WHERE board_id = ?
                        AND image_name IN ({placeholders});
                        """,
                        (board_id, *image_names),
                    )
            elif board_id is not None:
                # Mark all images in the board as seen
                cursor.execute(
                    """--sql
                    UPDATE board_images
                    SET is_seen = 1
                    WHERE board_id = ?;
                    """,
                    (board_id,),
                )

    def mark_images_as_unseen(
        self,
        board_id: str | None,
        image_names: list[str] | None = None,
    ) -> None:
        """Marks images as unseen.

        If image_names is provided and board_id is None, marks those specific images regardless of board.
        If image_names is None and board_id is provided, marks all images in that board as unseen.
        """
        with self._db.transaction() as cursor:
            if image_names is not None:
                # Mark specific images as unseen
                if len(image_names) == 0:
                    return

                placeholders = ",".join("?" * len(image_names))

                if board_id is None:
                    # Mark images regardless of which board they're in
                    cursor.execute(
                        f"""--sql
                        UPDATE board_images
                        SET is_seen = 0
                        WHERE image_name IN ({placeholders});
                        """,
                        image_names,
                    )
                else:
                    # Mark images only in the specified board
                    cursor.execute(
                        f"""--sql
                        UPDATE board_images
                        SET is_seen = 0
                        WHERE board_id = ?
                        AND image_name IN ({placeholders});
                        """,
                        (board_id, *image_names),
                    )
            elif board_id is not None:
                # Mark all images in the board as unseen
                cursor.execute(
                    """--sql
                    UPDATE board_images
                    SET is_seen = 0
                    WHERE board_id = ?;
                    """,
                    (board_id,),
                )
