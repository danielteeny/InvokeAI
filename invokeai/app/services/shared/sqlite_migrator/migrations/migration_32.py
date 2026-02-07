import sqlite3

from invokeai.app.services.shared.sqlite_migrator.sqlite_migrator_common import Migration


class Migration32Callback:
    """Drop redundant tg_board_images_updated_at trigger.

    This trigger was updating updated_at on board_images rows after every UPDATE,
    but it's redundant since the UPDATE itself can set updated_at. The trigger
    causes 2x database writes for mark_seen operations, leading to UI freezes
    when marking many images as seen.
    """

    def __call__(self, cursor: sqlite3.Cursor) -> None:
        self._drop_trigger(cursor)

    def _drop_trigger(self, cursor: sqlite3.Cursor) -> None:
        cursor.execute("DROP TRIGGER IF EXISTS tg_board_images_updated_at;")


def build_migration_32() -> Migration:
    """
    Build the migration from database version 31 to 32.

    This migration drops the redundant tg_board_images_updated_at trigger
    which was causing performance issues during mark_seen operations.
    """
    migration_32 = Migration(
        from_version=31,
        to_version=32,
        callback=Migration32Callback(),
    )

    return migration_32
