import sqlite3

from invokeai.app.services.shared.sqlite_migrator.sqlite_migrator_common import Migration


class Migration30Callback:
    def __call__(self, cursor: sqlite3.Cursor) -> None:
        self._add_unseen_columns(cursor)
        self._create_indexes(cursor)

    def _column_exists(self, cursor: sqlite3.Cursor, table: str, column: str) -> bool:
        """Check if a column exists in a table."""
        cursor.execute(f"PRAGMA table_info({table});")
        columns = [row[1] for row in cursor.fetchall()]
        return column in columns

    def _add_unseen_columns(self, cursor: sqlite3.Cursor) -> None:
        """
        Adds columns to board_images for tracking unseen (new) images.
        - is_seen: Whether the user has viewed this image in this board
        - added_at: When the image was added to the board
        """
        # Add is_seen column (constant default - OK) if it doesn't exist
        if not self._column_exists(cursor, "board_images", "is_seen"):
            cursor.execute(
                """--sql
                ALTER TABLE board_images ADD COLUMN is_seen INTEGER DEFAULT 0;
                """
            )

        # Add added_at column WITHOUT default (SQLite doesn't allow CURRENT_TIMESTAMP as default)
        if not self._column_exists(cursor, "board_images", "added_at"):
            cursor.execute(
                """--sql
                ALTER TABLE board_images ADD COLUMN added_at DATETIME;
                """
            )

        # Set existing rows to current timestamp
        cursor.execute(
            """--sql
            UPDATE board_images SET added_at = CURRENT_TIMESTAMP WHERE added_at IS NULL;
            """
        )

    def _create_indexes(self, cursor: sqlite3.Cursor) -> None:
        """Creates indexes for efficient unseen image queries."""
        # Index for finding unseen images in a board
        cursor.execute(
            """--sql
            CREATE INDEX IF NOT EXISTS idx_board_images_unseen
            ON board_images (board_id, is_seen);
            """
        )


def build_migration_30() -> Migration:
    """
    Build the migration from database version 29 to 30.

    This migration:
    - Adds is_seen column to track whether user has viewed image in board
    - Adds added_at column to track when image was added to board
    - Creates index for efficient unseen image queries
    """
    migration_30 = Migration(
        from_version=29,
        to_version=30,
        callback=Migration30Callback(),
    )

    return migration_30
