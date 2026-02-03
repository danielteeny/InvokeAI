import sqlite3

from invokeai.app.services.shared.sqlite_migrator.sqlite_migrator_common import Migration


class Migration31Callback:
    def __call__(self, cursor: sqlite3.Cursor) -> None:
        self._add_unique_constraint_to_lora_presets(cursor)

    def _add_unique_constraint_to_lora_presets(self, cursor: sqlite3.Cursor) -> None:
        """
        Adds a UNIQUE constraint on the name column in lora_presets table.

        SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so we need to:
        1. Create a new table with the constraint
        2. Copy data from old table
        3. Drop old table
        4. Rename new table
        """
        # Create new table with UNIQUE constraint on name
        cursor.execute(
            """--sql
            CREATE TABLE IF NOT EXISTS lora_presets_new (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                preset_data TEXT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
                updated_at DATETIME NOT NULL DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW'))
            );
            """
        )

        # Copy data from old table to new table
        # In case of duplicate names, only keep the first one (by id)
        cursor.execute(
            """--sql
            INSERT OR IGNORE INTO lora_presets_new (id, name, preset_data, created_at, updated_at)
            SELECT id, name, preset_data, created_at, updated_at
            FROM lora_presets
            ORDER BY created_at ASC;
            """
        )

        # Drop old table
        cursor.execute("DROP TABLE lora_presets;")

        # Rename new table
        cursor.execute("ALTER TABLE lora_presets_new RENAME TO lora_presets;")

        # Recreate the index on name
        cursor.execute(
            """--sql
            CREATE INDEX IF NOT EXISTS idx_lora_presets_name ON lora_presets(name);
            """
        )

        # Recreate the updated_at trigger
        cursor.execute(
            """--sql
            CREATE TRIGGER IF NOT EXISTS lora_presets_updated_at
            AFTER UPDATE
            ON lora_presets FOR EACH ROW
            BEGIN
                UPDATE lora_presets SET updated_at = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')
                    WHERE id = old.id;
            END;
            """
        )


def build_migration_31() -> Migration:
    """
    Build the migration from database version 30 to 31.

    This migration:
    - Adds a UNIQUE constraint on the name column in lora_presets table
    - Handles existing duplicate names by keeping only the first entry
    """
    migration_31 = Migration(
        from_version=30,
        to_version=31,
        callback=Migration31Callback(),
    )

    return migration_31
