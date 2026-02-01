import sqlite3

from invokeai.app.services.shared.sqlite_migrator.sqlite_migrator_common import Migration


class Migration28Callback:
    def __call__(self, cursor: sqlite3.Cursor) -> None:
        self._add_hierarchy_columns(cursor)
        self._create_hierarchy_indexes(cursor)

    def _add_hierarchy_columns(self, cursor: sqlite3.Cursor) -> None:
        """
        Adds hierarchy columns to the boards table for nested folder support.
        - parent_board_id: Reference to parent board (NULL for root-level boards)
        - position: Ordering within parent for drag-drop reordering
        - path: Materialized path for efficient hierarchy queries (e.g., '/root/child/grandchild')
        """
        # Add parent_board_id column
        cursor.execute(
            """--sql
            ALTER TABLE boards ADD COLUMN parent_board_id TEXT
            REFERENCES boards(board_id) ON DELETE SET NULL;
            """
        )

        # Add position column for ordering
        cursor.execute(
            """--sql
            ALTER TABLE boards ADD COLUMN position INTEGER DEFAULT 0;
            """
        )

        # Add path column for materialized path
        cursor.execute(
            """--sql
            ALTER TABLE boards ADD COLUMN path TEXT DEFAULT '';
            """
        )

    def _create_hierarchy_indexes(self, cursor: sqlite3.Cursor) -> None:
        """
        Creates indexes for efficient hierarchy queries.
        """
        # Index on parent_board_id for finding direct children
        cursor.execute(
            """--sql
            CREATE INDEX IF NOT EXISTS idx_boards_parent_board_id
            ON boards (parent_board_id);
            """
        )

        # Index on path for finding descendants (path prefix queries)
        cursor.execute(
            """--sql
            CREATE INDEX IF NOT EXISTS idx_boards_path
            ON boards (path);
            """
        )


def build_migration_28() -> Migration:
    """
    Build the migration from database version 27 to 28.

    This migration:
    - Adds parent_board_id column for nested folder hierarchy
    - Adds position column for ordering within parent
    - Adds path column for materialized path queries
    - Creates indexes for efficient hierarchy queries
    """
    migration_28 = Migration(
        from_version=27,
        to_version=28,
        callback=Migration28Callback(),
    )

    return migration_28
