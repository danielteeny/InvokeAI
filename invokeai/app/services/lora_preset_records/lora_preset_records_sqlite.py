import sqlite3

from invokeai.app.services.lora_preset_records.lora_preset_records_base import LoRAPresetRecordsStorageBase
from invokeai.app.services.lora_preset_records.lora_preset_records_common import (
    LoRAPresetDuplicateNameError,
    LoRAPresetNotFoundError,
    LoRAPresetRecordDTO,
    LoRAPresetUpdate,
    LoRAPresetWithoutId,
)
from invokeai.app.services.shared.sqlite.sqlite_database import SqliteDatabase
from invokeai.app.util.misc import uuid_string


class SqliteLoRAPresetRecordsStorage(LoRAPresetRecordsStorageBase):
    def __init__(self, db: SqliteDatabase) -> None:
        super().__init__()
        self._db = db

    def get(self, lora_preset_id: str) -> LoRAPresetRecordDTO:
        """Gets a LoRA preset by ID."""
        with self._db.transaction() as cursor:
            cursor.execute(
                """--sql
                SELECT *
                FROM lora_presets
                WHERE id = ?;
                """,
                (lora_preset_id,),
            )
            row = cursor.fetchone()
        if row is None:
            raise LoRAPresetNotFoundError(f"LoRA preset with id {lora_preset_id} not found")
        return LoRAPresetRecordDTO.from_dict(dict(row))

    def _check_duplicate_name(self, cursor: sqlite3.Cursor, name: str, exclude_id: str | None = None) -> None:
        """Check if a preset with the given name already exists."""
        if exclude_id:
            cursor.execute(
                """--sql
                SELECT id FROM lora_presets WHERE name = ? AND id != ?;
                """,
                (name, exclude_id),
            )
        else:
            cursor.execute(
                """--sql
                SELECT id FROM lora_presets WHERE name = ?;
                """,
                (name,),
            )
        if cursor.fetchone() is not None:
            raise LoRAPresetDuplicateNameError(f"A LoRA preset with name '{name}' already exists")

    def create(self, lora_preset: LoRAPresetWithoutId) -> LoRAPresetRecordDTO:
        lora_preset_id = uuid_string()
        with self._db.transaction() as cursor:
            # Check for duplicate name
            self._check_duplicate_name(cursor, lora_preset.name)

            cursor.execute(
                """--sql
                INSERT INTO lora_presets (
                    id,
                    name,
                    preset_data
                )
                VALUES (?, ?, ?);
                """,
                (
                    lora_preset_id,
                    lora_preset.name,
                    lora_preset.preset_data.model_dump_json(),
                ),
            )
        return self.get(lora_preset_id)

    def update(self, lora_preset_id: str, changes: LoRAPresetUpdate) -> LoRAPresetRecordDTO:
        """Updates a LoRA preset."""
        # First verify the preset exists
        self.get(lora_preset_id)

        with self._db.transaction() as cursor:
            # Check for duplicate name if name is being changed
            if changes.name is not None:
                self._check_duplicate_name(cursor, changes.name, exclude_id=lora_preset_id)

            # Build dynamic update query based on provided fields
            updates: list[str] = []
            values: list[str | None] = []

            if changes.name is not None:
                updates.append("name = ?")
                values.append(changes.name)

            if changes.preset_data is not None:
                updates.append("preset_data = ?")
                values.append(changes.preset_data.model_dump_json())

            if updates:
                values.append(lora_preset_id)
                cursor.execute(
                    f"""--sql
                    UPDATE lora_presets
                    SET {", ".join(updates)}
                    WHERE id = ?;
                    """,
                    tuple(values),
                )

        return self.get(lora_preset_id)

    def delete(self, lora_preset_id: str) -> None:
        with self._db.transaction() as cursor:
            cursor.execute(
                """--sql
                DELETE from lora_presets
                WHERE id = ?;
                """,
                (lora_preset_id,),
            )
            if cursor.rowcount == 0:
                raise LoRAPresetNotFoundError(f"LoRA preset with id {lora_preset_id} not found")
        return None

    def get_many(self) -> list[LoRAPresetRecordDTO]:
        with self._db.transaction() as cursor:
            cursor.execute(
                """--sql
                SELECT *
                FROM lora_presets
                ORDER BY LOWER(name) ASC
                """
            )
            rows = cursor.fetchall()
        lora_presets = [LoRAPresetRecordDTO.from_dict(dict(row)) for row in rows]
        return lora_presets
