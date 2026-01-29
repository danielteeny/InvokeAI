from invokeai.app.services.lora_preset_records.lora_preset_records_base import LoRAPresetRecordsStorageBase
from invokeai.app.services.lora_preset_records.lora_preset_records_common import (
    LoRAPresetNotFoundError,
    LoRAPresetRecordDTO,
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

    def create(self, lora_preset: LoRAPresetWithoutId) -> LoRAPresetRecordDTO:
        lora_preset_id = uuid_string()
        with self._db.transaction() as cursor:
            cursor.execute(
                """--sql
                INSERT OR IGNORE INTO lora_presets (
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

    def delete(self, lora_preset_id: str) -> None:
        with self._db.transaction() as cursor:
            cursor.execute(
                """--sql
                DELETE from lora_presets
                WHERE id = ?;
                """,
                (lora_preset_id,),
            )
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
