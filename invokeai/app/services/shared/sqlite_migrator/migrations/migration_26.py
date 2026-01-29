import sqlite3

from invokeai.app.services.shared.sqlite_migrator.sqlite_migrator_common import Migration


class Migration26Callback:
    def __call__(self, cursor: sqlite3.Cursor) -> None:
        self._create_lora_presets(cursor)

    def _create_lora_presets(self, cursor: sqlite3.Cursor) -> None:
        """Create the table used to store LoRA presets."""
        tables = [
            """--sql
            CREATE TABLE IF NOT EXISTS lora_presets (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL,
                preset_data TEXT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
                -- Updated via trigger
                updated_at DATETIME NOT NULL DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW'))
            );
            """
        ]

        # Add trigger for `updated_at`.
        triggers = [
            """--sql
            CREATE TRIGGER IF NOT EXISTS lora_presets_updated_at
            AFTER UPDATE
            ON lora_presets FOR EACH ROW
            BEGIN
                UPDATE lora_presets SET updated_at = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')
                    WHERE id = old.id;
            END;
            """
        ]

        # Add indexes for searchable fields
        indices = [
            "CREATE INDEX IF NOT EXISTS idx_lora_presets_name ON lora_presets(name);",
        ]

        for stmt in tables + indices + triggers:
            cursor.execute(stmt)


def build_migration_26() -> Migration:
    """
    Build the migration from database version 25 to 26.

    This migration does the following:
    - Create the table used to store LoRA presets.
    """
    migration_26 = Migration(
        from_version=25,
        to_version=26,
        callback=Migration26Callback(),
    )

    return migration_26
