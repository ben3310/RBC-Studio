from __future__ import annotations

import json
import secrets
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass, field, replace
from datetime import UTC, datetime, timedelta
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def utc_now() -> datetime:
    return datetime.now(UTC)


@dataclass(frozen=True, slots=True)
class WorkerJob:
    job_id: str
    job_type: str
    attempt: int = 0
    payload: dict[str, Any] = field(default_factory=dict)
    queue_name: str = "noop"
    lease_token: str = ""
    lease_expires_at: datetime | None = None
    output_uploads: tuple[dict[str, Any], ...] = ()
    model_policy: dict[str, Any] = field(default_factory=dict)


class QueueClient(Protocol):
    def claim(self, queues: tuple[str, ...]) -> WorkerJob | None: ...
    def heartbeat(self, job: WorkerJob) -> bool: ...
    def complete(self, job: WorkerJob, result: dict[str, Any]) -> None: ...
    def fail(self, job: WorkerJob, error: str, *, retryable: bool = False) -> None: ...
    def cancel_requested(self, job: WorkerJob) -> bool: ...


class LeaseLostError(RuntimeError):
    pass


class InMemoryQueueClient:
    """Deterministic lease queue used by unit tests and offline development."""

    def __init__(
        self,
        jobs: list[WorkerJob] | None = None,
        *,
        lease_seconds: int = 300,
        clock: Callable[[], datetime] = utc_now,
    ) -> None:
        self._jobs = deque(jobs or [])
        self._leased: dict[str, WorkerJob] = {}
        self._cancelled: set[str] = set()
        self._results: dict[str, dict[str, Any]] = {}
        self._lease_seconds = lease_seconds
        self._clock = clock
        self.completed: list[tuple[WorkerJob, dict[str, Any]]] = []
        self.failed: list[tuple[WorkerJob, str]] = []

    def _lease(self, job: WorkerJob) -> WorkerJob:
        leased = replace(
            job,
            attempt=job.attempt + 1,
            lease_token=secrets.token_hex(16),
            lease_expires_at=self._clock() + timedelta(seconds=self._lease_seconds),
        )
        self._leased[job.job_id] = leased
        return leased

    def claim(self, queues: tuple[str, ...]) -> WorkerJob | None:
        now = self._clock()
        for job_id, job in tuple(self._leased.items()):
            if job.lease_expires_at and job.lease_expires_at <= now and job_id not in self._cancelled:
                return self._lease(job)
        for _ in range(len(self._jobs)):
            job = self._jobs.popleft()
            if job.job_id in self._cancelled:
                continue
            if job.queue_name in queues:
                return self._lease(job)
            self._jobs.append(job)
        return None

    def _owned(self, job: WorkerJob) -> WorkerJob:
        current = self._leased.get(job.job_id)
        if current is None or current.lease_token != job.lease_token:
            raise LeaseLostError(f"Lease lost for {job.job_id}")
        if current.lease_expires_at and current.lease_expires_at <= self._clock():
            raise LeaseLostError(f"Lease expired for {job.job_id}")
        return current

    def heartbeat(self, job: WorkerJob) -> bool:
        if job.job_id in self._cancelled:
            return False
        current = self._owned(job)
        self._leased[job.job_id] = replace(
            current,
            lease_expires_at=self._clock() + timedelta(seconds=self._lease_seconds),
        )
        return True

    def complete(self, job: WorkerJob, result: dict[str, Any]) -> None:
        if job.job_id in self._results:
            if self._results[job.job_id] != result:
                raise ValueError(f"Conflicting duplicate completion for {job.job_id}")
            return
        self._owned(job)
        if job.job_id in self._cancelled:
            raise LeaseLostError(f"Job {job.job_id} was cancelled")
        self._results[job.job_id] = result
        self._leased.pop(job.job_id, None)
        self.completed.append((job, result))

    def fail(self, job: WorkerJob, error: str, *, retryable: bool = False) -> None:
        self._owned(job)
        self._leased.pop(job.job_id, None)
        self.failed.append((job, error))
        if retryable and job.job_id not in self._cancelled:
            self._jobs.append(job)

    def cancel_requested(self, job: WorkerJob) -> bool:
        return job.job_id in self._cancelled

    def request_cancel(self, job_id: str) -> None:
        self._cancelled.add(job_id)

    def state(self, job_id: str) -> str:
        if job_id in self._cancelled:
            return "cancelled"
        if job_id in self._results:
            return "succeeded"
        if job_id in self._leased:
            return "leased"
        if any(job.job_id == job_id for job in self._jobs):
            return "queued"
        return "unknown"


class SupabaseQueueClient:
    """Outbound-only PostgREST RPC client. The service-role key is never logged."""

    def __init__(
        self,
        base_url: str,
        service_role_key: str,
        worker_id: str,
        *,
        lease_seconds: int = 300,
        timeout_seconds: float = 20.0,
        opener: Callable[..., Any] = urlopen,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self._key = service_role_key
        self.worker_id = worker_id
        self.lease_seconds = lease_seconds
        self.timeout_seconds = timeout_seconds
        self._opener = opener

    def _rpc(self, name: str, body: dict[str, Any]) -> Any:
        request = Request(
            f"{self.base_url}/rest/v1/rpc/{name}",
            data=json.dumps(body, separators=(",", ":")).encode(),
            method="POST",
            headers={
                "apikey": self._key,
                "authorization": f"Bearer {self._key}",
                "content-type": "application/json",
            },
        )
        try:
            with self._opener(request, timeout=self.timeout_seconds) as response:
                payload = response.read()
        except HTTPError as error:
            raise RuntimeError(f"Queue RPC {name} failed with HTTP {error.code}") from error
        except URLError as error:
            raise RuntimeError(f"Queue RPC {name} was unreachable") from error
        return json.loads(payload or b"null")

    def claim(self, queues: tuple[str, ...]) -> WorkerJob | None:
        data = self._rpc(
            "worker_claim_job",
            {"p_queues": list(queues), "p_worker": self.worker_id, "p_lease_seconds": self.lease_seconds},
        )
        if not data:
            return None
        expires = datetime.fromisoformat(str(data["lease_expires_at"]).replace("Z", "+00:00"))
        return WorkerJob(
            job_id=str(data["job_id"]),
            job_type=str(data["job_type"]),
            attempt=int(data["attempt"]),
            payload=dict(data.get("input") or {}),
            queue_name=str(data.get("queue_name") or "cutout"),
            lease_token=str(data["lease_token"]),
            lease_expires_at=expires,
            output_uploads=tuple(data.get("output_uploads") or ()),
            model_policy=dict(data.get("model_policy") or {}),
        )

    def heartbeat(self, job: WorkerJob) -> bool:
        data = self._rpc(
            "worker_heartbeat_job",
            {
                "p_job": job.job_id,
                "p_worker": self.worker_id,
                "p_lease_token": job.lease_token,
                "p_lease_seconds": self.lease_seconds,
            },
        )
        return bool(data and data.get("ok") and not data.get("cancelled"))

    def complete(self, job: WorkerJob, result: dict[str, Any]) -> None:
        self._rpc(
            "worker_complete_job",
            {
                "p_job": job.job_id,
                "p_worker": self.worker_id,
                "p_lease_token": job.lease_token,
                "p_result": result,
                "p_output_hash": result.get("output_hash"),
            },
        )

    def fail(self, job: WorkerJob, error: str, *, retryable: bool = False) -> None:
        self._rpc(
            "worker_fail_job",
            {
                "p_job": job.job_id,
                "p_worker": self.worker_id,
                "p_lease_token": job.lease_token,
                "p_error_class": error[:120],
                "p_error_redacted": "Worker processing failed.",
                "p_retryable": retryable,
            },
        )

    def cancel_requested(self, job: WorkerJob) -> bool:
        data = self._rpc(
            "worker_heartbeat_job",
            {
                "p_job": job.job_id,
                "p_worker": self.worker_id,
                "p_lease_token": job.lease_token,
                "p_lease_seconds": self.lease_seconds,
            },
        )
        return bool(data and data.get("cancelled"))
