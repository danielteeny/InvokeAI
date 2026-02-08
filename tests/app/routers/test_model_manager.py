import os
import pathlib
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient

from invokeai.app.api.dependencies import ApiDependencies
from invokeai.app.api_app import app


@pytest.fixture(autouse=True, scope="module")
def client(invokeai_root_dir: Path) -> TestClient:
    os.environ["INVOKEAI_ROOT"] = invokeai_root_dir.as_posix()
    return TestClient(app)


class MockApiDependencies(ApiDependencies):
    invoker: Any

    def __init__(self, invoker: Any) -> None:
        self.invoker = invoker


def _patch_model_manager_dependencies(monkeypatch: Any, models_path: Path) -> None:
    invoker = SimpleNamespace(
        services=SimpleNamespace(
            configuration=SimpleNamespace(models_path=models_path),
            model_manager=SimpleNamespace(store=SimpleNamespace(search_by_attr=lambda *_, **__: [])),
        )
    )
    monkeypatch.setattr("invokeai.app.api.routers.model_manager.ApiDependencies", MockApiDependencies(invoker))


def test_scan_folder_returns_name_modified_at_and_sorted_paths(
    monkeypatch: Any, client: TestClient, tmp_path: Path
) -> None:
    models_path = tmp_path / "models"
    models_path.mkdir()
    _patch_model_manager_dependencies(monkeypatch, models_path)

    scan_dir = tmp_path / "scan"
    scan_dir.mkdir()
    model_b = scan_dir / "zulu.safetensors"
    model_a = scan_dir / "alpha.safetensors"
    model_b.write_bytes(b"b")
    model_a.write_bytes(b"a")

    response = client.get("/api/v2/models/scan_folder", params={"scan_path": scan_dir.as_posix()})

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 2

    expected_paths = sorted([str(model_a.resolve()), str(model_b.resolve())])
    assert [item["path"] for item in payload] == expected_paths

    for item in payload:
        assert item["name"] == pathlib.Path(item["path"]).name
        assert item["modified_at"] is not None
        parsed = datetime.fromisoformat(item["modified_at"].replace("Z", "+00:00"))
        assert parsed.tzinfo is not None


def test_scan_folder_uses_null_modified_at_when_stat_fails(
    monkeypatch: Any, client: TestClient, tmp_path: Path
) -> None:
    models_path = tmp_path / "models"
    models_path.mkdir()
    _patch_model_manager_dependencies(monkeypatch, models_path)

    scan_dir = tmp_path / "scan"
    scan_dir.mkdir()
    bad_model = scan_dir / "bad-stat.safetensors"
    bad_model.write_bytes(b"x")
    bad_model_resolved = bad_model.resolve()

    original_path_stat = pathlib.Path.stat

    def mocked_path_stat(self: pathlib.Path, *args: Any, **kwargs: Any):
        if self.as_posix() == bad_model_resolved.as_posix():
            raise OSError("stat failure")
        return original_path_stat(self, *args, **kwargs)

    monkeypatch.setattr(pathlib.Path, "stat", mocked_path_stat)

    response = client.get("/api/v2/models/scan_folder", params={"scan_path": scan_dir.as_posix()})

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["name"] == "bad-stat.safetensors"
    assert payload[0]["modified_at"] is None
