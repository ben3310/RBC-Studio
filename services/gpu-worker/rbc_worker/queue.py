from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass(frozen=True, slots=True)
class WorkerJob:
    job_id: str
    job_type: str
    attempt: int = 1
    payload: dict[str, Any] = field(default_factory=dict)


class QueueClient(Protocol):
    def claim(self, queues: tuple[str, ...]) -> WorkerJob | None: ...
    def complete(self, job: WorkerJob, result: dict[str, Any]) -> None: ...
    def fail(self, job: WorkerJob, error: str) -> None: ...


class InMemoryQueueClient:
    """Test/local spine only. Durable Supabase claims begin in Milestone 2."""

    def __init__(self, jobs: list[WorkerJob] | None = None) -> None:
        self._jobs = deque(jobs or [])
        self.completed: list[tuple[WorkerJob, dict[str, Any]]] = []
        self.failed: list[tuple[WorkerJob, str]] = []

    def claim(self, queues: tuple[str, ...]) -> WorkerJob | None:
        del queues
        return self._jobs.popleft() if self._jobs else None

    def complete(self, job: WorkerJob, result: dict[str, Any]) -> None:
        self.completed.append((job, result))

    def fail(self, job: WorkerJob, error: str) -> None:
        self.failed.append((job, error))
