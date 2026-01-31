import sqlite3

from invokeai.app.services.shared.sqlite_migrator.sqlite_migrator_common import Migration


class Migration27Callback:
    def __call__(self, cursor: sqlite3.Cursor) -> None:
        self._create_lora_categories_table(cursor)

    def _create_lora_categories_table(self, cursor: sqlite3.Cursor) -> None:
        """
        Creates the lora_categories table for storing custom LoRA categories.
        """
        cursor.execute(
            """--sql
            CREATE TABLE IF NOT EXISTS lora_categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                color TEXT NOT NULL,
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        # Create an index on sort_order for efficient ordering
        cursor.execute(
            """--sql
            CREATE INDEX IF NOT EXISTS idx_lora_categories_sort_order
            ON lora_categories (sort_order);
            """
        )


def build_migration_27() -> Migration:
    """
    Build the migration from database version 26 to 27.

    This migration:
    - Creates the lora_categories table for storing custom LoRA categories
    """
    migration_27 = Migration(
        from_version=26,
        to_version=27,
        callback=Migration27Callback(),
    )

    return migration_27
