import sqlite3

from invokeai.app.services.shared.sqlite_migrator.sqlite_migrator_common import Migration


class Migration29Callback:
    def __call__(self, cursor: sqlite3.Cursor) -> None:
        self._create_board_assignment_rules_table(cursor)
        self._create_indexes(cursor)

    def _create_board_assignment_rules_table(self, cursor: sqlite3.Cursor) -> None:
        """
        Creates the board_assignment_rules table for storing auto-assignment rules.
        Rules define conditions that automatically assign generated images to specific boards.
        """
        cursor.execute(
            """--sql
            CREATE TABLE IF NOT EXISTS board_assignment_rules (
                rule_id TEXT PRIMARY KEY,
                rule_name TEXT NOT NULL,
                target_board_id TEXT NOT NULL REFERENCES boards(board_id) ON DELETE CASCADE,
                priority INTEGER DEFAULT 0,
                is_enabled INTEGER DEFAULT 1,
                conditions TEXT NOT NULL,
                match_all INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

    def _create_indexes(self, cursor: sqlite3.Cursor) -> None:
        """Creates indexes for efficient rule queries."""
        # Index for finding rules by target board
        cursor.execute(
            """--sql
            CREATE INDEX IF NOT EXISTS idx_board_assignment_rules_target_board
            ON board_assignment_rules (target_board_id);
            """
        )

        # Index for ordering by priority
        cursor.execute(
            """--sql
            CREATE INDEX IF NOT EXISTS idx_board_assignment_rules_priority
            ON board_assignment_rules (priority DESC, created_at);
            """
        )

        # Index for filtering enabled rules
        cursor.execute(
            """--sql
            CREATE INDEX IF NOT EXISTS idx_board_assignment_rules_enabled
            ON board_assignment_rules (is_enabled);
            """
        )


def build_migration_29() -> Migration:
    """
    Build the migration from database version 28 to 29.

    This migration:
    - Creates the board_assignment_rules table for auto-assignment rules
    - Creates indexes for efficient rule queries
    """
    migration_29 = Migration(
        from_version=28,
        to_version=29,
        callback=Migration29Callback(),
    )

    return migration_29
