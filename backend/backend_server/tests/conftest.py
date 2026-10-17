import os
import tempfile

# Must be set before app.config is imported anywhere.
_tmp = tempfile.mkdtemp()
os.environ.update({
    "DATABASE_URL": f"sqlite:///{_tmp}/test.db",
    "AUTH_MODE": "dev",
    "LLM_PROVIDER": "mock",
    "SCHEDULER_ENABLED": "false",
    "ADMIN_TOKEN": "test-admin",
    "SESSION_SECRET": "test-secret",
})

import pytest
from fastapi.testclient import TestClient

from app.db import init_db
from app.main import app


@pytest.fixture(scope="session")
def client():
    init_db()
    with TestClient(app) as c:
        yield c


def hdr(uid: str, name: str | None = None) -> dict:
    return {"X-Dev-User-Id": uid, "X-Dev-User-Email": f"{uid}@test.local", "X-Dev-User-Name": name or uid.title()}


ADMIN = {"X-Admin-Token": "test-admin"}
