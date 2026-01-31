import sqlite3
from typing import Union, cast

from invokeai.app.services.lora_category_records.lora_category_records_base import LoraCategoryRecordStorageBase
from invokeai.app.services.lora_category_records.lora_category_records_common import (
    LoraCategoryChanges,
    LoraCategoryRecord,
    LoraCategoryRecordDeleteException,
    LoraCategoryRecordDuplicateException,
    LoraCategoryRecordNotFoundException,
    LoraCategoryRecordSaveException,
    deserialize_lora_category_record,
)
from invokeai.app.services.shared.sqlite.sqlite_database import SqliteDatabase
from invokeai.app.util.misc import uuid_string


class SqliteLoraCategoryRecordStorage(LoraCategoryRecordStorageBase):
    def __init__(self, db: SqliteDatabase) -> None:
        super().__init__()
        self._db = db

    def save(self, name: str, color: str, sort_order: int = 0) -> LoraCategoryRecord:
        with self._db.transaction() as cursor:
            try:
                category_id = uuid_string()
                cursor.execute(
                    """--sql
                    INSERT INTO lora_categories (id, name, color, sort_order)
                    VALUES (?, ?, ?, ?);
                    """,
                    (category_id, name, color, sort_order),
                )
            except sqlite3.IntegrityError as e:
                if "UNIQUE constraint failed" in str(e):
                    raise LoraCategoryRecordDuplicateException from e
                raise LoraCategoryRecordSaveException from e
            except sqlite3.Error as e:
                raise LoraCategoryRecordSaveException from e
        return self.get(category_id)

    def get(self, category_id: str) -> LoraCategoryRecord:
        with self._db.transaction() as cursor:
            try:
                cursor.execute(
                    """--sql
                    SELECT *
                    FROM lora_categories
                    WHERE id = ?;
                    """,
                    (category_id,),
                )
                result = cast(Union[sqlite3.Row, None], cursor.fetchone())
            except sqlite3.Error as e:
                raise LoraCategoryRecordNotFoundException from e
        if result is None:
            raise LoraCategoryRecordNotFoundException
        return deserialize_lora_category_record(dict(result))

    def update(self, category_id: str, changes: LoraCategoryChanges) -> LoraCategoryRecord:
        # First verify the record exists
        self.get(category_id)

        with self._db.transaction() as cursor:
            try:
                if changes.name is not None:
                    cursor.execute(
                        """--sql
                        UPDATE lora_categories
                        SET name = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?;
                        """,
                        (changes.name, category_id),
                    )

                if changes.color is not None:
                    cursor.execute(
                        """--sql
                        UPDATE lora_categories
                        SET color = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?;
                        """,
                        (changes.color, category_id),
                    )

                if changes.sort_order is not None:
                    cursor.execute(
                        """--sql
                        UPDATE lora_categories
                        SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?;
                        """,
                        (changes.sort_order, category_id),
                    )
            except sqlite3.IntegrityError as e:
                if "UNIQUE constraint failed" in str(e):
                    raise LoraCategoryRecordDuplicateException from e
                raise LoraCategoryRecordSaveException from e
            except sqlite3.Error as e:
                raise LoraCategoryRecordSaveException from e
        return self.get(category_id)

    def delete(self, category_id: str) -> None:
        # First verify the record exists
        self.get(category_id)

        with self._db.transaction() as cursor:
            try:
                cursor.execute(
                    """--sql
                    DELETE FROM lora_categories
                    WHERE id = ?;
                    """,
                    (category_id,),
                )
            except sqlite3.Error as e:
                raise LoraCategoryRecordDeleteException from e

    def get_all(self) -> list[LoraCategoryRecord]:
        with self._db.transaction() as cursor:
            cursor.execute(
                """--sql
                SELECT *
                FROM lora_categories
                ORDER BY sort_order ASC, name ASC;
                """
            )
            result = cast(list[sqlite3.Row], cursor.fetchall())
        return [deserialize_lora_category_record(dict(r)) for r in result]
