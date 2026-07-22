from __future__ import annotations

import json
import logging

import pytest

from rbc_worker.app import app, healthz, readyz
from rbc_worker.config import WorkerSettings
from rbc_worker.logging import JsonFormatter
from rbc_worker.queue import InMemoryQueueClient, WorkerJob
from rbc_worker.worker import Worker


def test_settings_default_to_local_spine_without_secrets() -> None:
    settings = WorkerSettings.from_env({})
    assert settings.mode == "local-spine"
    assert settings.queues == ("noop",)
    assert "service_role_key" not in repr(settings)


def test_remote_settings_fail_closed() -> None:
    with pytest.raises(ValueError, match="service-role"):
        WorkerSettings.from_env({"RBC_REMOTE_FACTORY": "true", "RBC_SUPABASE_URL": "https://project.supabase.co"})
    with pytest.raises(ValueError, match="queue name"):
        WorkerSettings.from_env({"RBC_WORKER_QUEUES": "valid,../invalid"})


def test_health_and_readiness_endpoints() -> None:
    paths = {route.path for route in app.routes}
    assert {"/healthz", "/readyz"}.issubset(paths)
    assert healthz()["status"] == "ok"
    ready = readyz()
    assert ready["status"] == "ready"
    assert ready["mode"] == "local-spine"


def test_noop_job_completes_without_network() -> None:
    queue = InMemoryQueueClient([WorkerJob(job_id="job-1", job_type="noop.v1", payload={"proof": True})])
    worker = Worker(WorkerSettings.from_env({}), queue)
    assert worker.run_once() is True
    assert worker.run_once() is False
    assert queue.failed == []
    assert queue.completed[0][1]["handler"] == "noop.v1"


def test_unknown_job_fails_without_execution() -> None:
    queue = InMemoryQueueClient([WorkerJob(job_id="job-2", job_type="cutout.v1")])
    worker = Worker(WorkerSettings.from_env({}), queue)
    assert worker.run_once() is True
    assert queue.completed == []
    assert queue.failed[0][1] == "No handler registered for cutout.v1"


def test_structured_logging_redacts_secret_context() -> None:
    formatter = JsonFormatter()
    record = logging.LogRecord("rbc_worker", logging.INFO, __file__, 1, "event", (), None)
    record.context = {"job_id": "job-3", "token": "do-not-log"}
    payload = json.loads(formatter.format(record))
    assert payload["job_id"] == "job-3"
    assert payload["token"] == "[REDACTED]"
