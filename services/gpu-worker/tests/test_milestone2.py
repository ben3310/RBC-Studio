from __future__ import annotations

import hashlib
import io
import threading
from datetime import UTC, datetime, timedelta
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import pytest
from PIL import Image

import rbc_worker.app as worker_app
from rbc_worker.benchmark import run_benchmark
from rbc_worker.config import WorkerSettings
from rbc_worker.cutout import CutoutJobHandler
from rbc_worker.model_registry import ModelRecord
from rbc_worker.providers import CutoutOptions, ThresholdFixtureProvider
from rbc_worker.qa import evaluate_cutout
from rbc_worker.queue import InMemoryQueueClient, LeaseLostError, WorkerJob
from rbc_worker.storage import SignedStorageClient, SignedUrlPolicy, StoragePolicyError
from rbc_worker.workspace import JobWorkspace

ROOT = Path(__file__).resolve().parents[3]
FIXTURES = ROOT / "benchmarks" / "cutout" / "fixtures"


def test_cutout_readiness_fails_with_503_while_runtime_is_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        worker_app,
        "settings",
        WorkerSettings(worker_id="offline-test", queues=("cutout",)),
    )
    response = worker_app.readyz()
    assert response.status_code == 503
    assert b'"status":"not_ready"' in response.body
    assert b"service_role" not in response.body


def test_expired_lease_is_reclaimed_once_and_old_worker_cannot_complete() -> None:
    now = [datetime(2026, 7, 22, tzinfo=UTC)]
    queue = InMemoryQueueClient(
        [WorkerJob(job_id="lease-1", job_type="cutout.v1", queue_name="cutout")],
        lease_seconds=30,
        clock=lambda: now[0],
    )
    first = queue.claim(("cutout",))
    assert first and first.attempt == 1
    now[0] += timedelta(seconds=31)
    recovered = queue.claim(("cutout",))
    assert recovered and recovered.job_id == first.job_id and recovered.attempt == 2
    assert recovered.lease_token != first.lease_token
    with pytest.raises(LeaseLostError):
        queue.complete(first, {"output_hash": "a" * 64})
    result = {"output_hash": "b" * 64}
    queue.complete(recovered, result)
    queue.complete(recovered, result)
    assert len(queue.completed) == 1
    with pytest.raises(ValueError, match="Conflicting"):
        queue.complete(recovered, {"output_hash": "c" * 64})


def test_heartbeat_observes_cancellation() -> None:
    queue = InMemoryQueueClient([WorkerJob(job_id="cancel-1", job_type="cutout.v1", queue_name="cutout")])
    job = queue.claim(("cutout",))
    assert job and queue.heartbeat(job)
    queue.request_cancel(job.job_id)
    assert queue.heartbeat(job) is False
    assert queue.cancel_requested(job)


def test_signed_url_policy_rejects_ssrf_and_unsigned_paths() -> None:
    policy = SignedUrlPolicy(("project.supabase.co",))
    valid = "https://project.supabase.co/storage/v1/object/sign/product-originals/a.png?token=signed"
    assert policy.validate(valid) == valid
    for invalid in (
        "http://project.supabase.co/storage/v1/object/sign/a?token=x",
        "https://127.0.0.1/storage/v1/object/sign/a?token=x",
        "https://project.supabase.co/auth/v1/token?token=x",
        "https://project.supabase.co/storage/v1/object/sign/a",
        "https://project.supabase.co@evil.test/storage/v1/object/sign/a?token=x",
    ):
        with pytest.raises(StoragePolicyError):
            policy.validate(invalid)


def test_signed_storage_never_follows_redirects(tmp_path: Path) -> None:
    requested_target = []

    class RedirectHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802 - required by BaseHTTPRequestHandler
            if "/target" in self.path:
                requested_target.append(self.path)
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"should-not-be-read")
                return
            self.send_response(302)
            self.send_header(
                "Location",
                f"http://127.0.0.1:{self.server.server_port}/storage/v1/object/sign/target?token=x",
            )
            self.end_headers()

        def log_message(self, *_args: object) -> None:
            pass

    server = HTTPServer(("127.0.0.1", 0), RedirectHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        client = SignedStorageClient(
            SignedUrlPolicy(("127.0.0.1",)),
            max_download_bytes=1024,
            max_upload_bytes=1024,
        )
        url = f"http://127.0.0.1:{server.server_port}/storage/v1/object/sign/source?token=x"
        with pytest.raises(StoragePolicyError, match="redirects"):
            client.download(url, tmp_path / "source", "0" * 64)
        assert requested_target == []
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def test_job_workspace_is_isolated_and_cleaned(tmp_path: Path) -> None:
    with JobWorkspace("../../job", str(tmp_path)) as workspace:
        path = workspace.file("source.bin")
        path.write_bytes(b"source")
        root = workspace.path
        with pytest.raises(ValueError):
            workspace.file("../escape")
    assert root and not root.exists()


def test_unapproved_model_record_fails_closed() -> None:
    record = ModelRecord(
        purpose="product_cutout",
        provider_id="birefnet",
        revision="PENDING_OPERATOR_APPROVAL",
        artifact_path="",
        artifact_sha256="",
        license="PENDING_REVIEW",
        license_url="https://github.com/ZhengPeng7/BiRefNet",
        commercial_use_allowed=False,
        active=False,
        production_enabled=False,
    )
    with pytest.raises(ValueError, match="not pinned"):
        record.verify(benchmark=True)


def test_rights_safe_benchmark_harness_is_deterministic_but_not_production_gate() -> None:
    manifest = ROOT / "benchmarks" / "cutout" / "manifest.json"
    first = run_benchmark(manifest, ThresholdFixtureProvider())
    second = run_benchmark(manifest, ThresholdFixtureProvider())
    assert first["fixture_count"] == 3
    assert first["acceptance_rate"] == 1.0
    assert first["production_gate_passed"] is False
    assert [(item["iou"], item["boundary_f"]) for item in first["results"]] == [
        (item["iou"], item["boundary_f"]) for item in second["results"]
    ]


class MemoryStorage:
    def __init__(self, source: bytes) -> None:
        self.source = source
        self.uploaded: dict[str, bytes] = {}

    def download(self, _url: str, destination: Path, expected_sha256: str) -> dict[str, object]:
        assert hashlib.sha256(self.source).hexdigest() == expected_sha256
        destination.write_bytes(self.source)
        return {"bytes": len(self.source), "sha256": expected_sha256}

    def upload(self, signed_url: str, source: Path, _content_type: str) -> dict[str, object]:
        payload = source.read_bytes()
        self.uploaded[signed_url] = payload
        return {"bytes": len(payload), "sha256": hashlib.sha256(payload).hexdigest()}


def test_cutout_handler_uploads_governed_bundle_and_routes_baseline_to_review(tmp_path: Path) -> None:
    encoded = io.BytesIO()
    with Image.open(FIXTURES / "thin-handle-source.pgm") as fixture:
        fixture.save(encoded, format="PNG")
    source = encoded.getvalue()
    storage = MemoryStorage(source)
    uploads = tuple(
        {"role": role, "upload_url": f"memory://{role}"}
        for role in ("cutout", "mask", "preview_light", "preview_dark", "qa")
    )
    job = WorkerJob(
        job_id="cutout-1",
        job_type="cutout.v1",
        attempt=1,
        queue_name="cutout",
        payload={
            "asset_id": "asset-1",
            "download_url": "memory://source",
            "sha256": hashlib.sha256(source).hexdigest(),
            "mime_type": "image/png",
            "bytes": len(source),
            "options": {"refine_radius": 0},
        },
        output_uploads=uploads,
        model_policy={
            "purpose": "product_cutout",
            "provider_id": "synthetic-threshold-baseline",
            "allowed_revision": "v1",
        },
    )
    handler = CutoutJobHandler(ThresholdFixtureProvider(), storage, temp_root=str(tmp_path), max_pixels=100)
    result = handler(job)
    assert result["route"] == "manual_review"
    assert result["qa"]["decision"] == "manual_review"
    assert len(storage.uploaded) == 5
    assert not list(tmp_path.iterdir())


def test_qa_rejects_dimension_mismatch() -> None:
    provider = ThresholdFixtureProvider()
    source = Image.new("RGB", (8, 8), "white")
    result = provider.cutout(source, CutoutOptions())
    result.rgba = result.rgba.resize((4, 4))
    qa = evaluate_cutout(
        "asset",
        source,
        result,
        source_sha256="a" * 64,
        output_sha256="b" * 64,
    )
    assert qa["decision"] == "reject"
