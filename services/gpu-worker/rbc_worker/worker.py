from __future__ import annotations

import logging
import threading
from collections.abc import Callable
from typing import Any

from .config import WorkerSettings
from .queue import LeaseLostError, QueueClient, WorkerJob

JobHandler = Callable[[WorkerJob], dict[str, Any]]


class RetryableJobError(RuntimeError):
    pass


class JobCancelled(RuntimeError):
    pass


def noop_handler(job: WorkerJob) -> dict[str, Any]:
    if job.job_type != "noop.v1":
        raise ValueError(f"Unsupported job type: {job.job_type}")
    return {"job_id": job.job_id, "status": "complete", "handler": "noop.v1", "input": job.payload}


class LeaseHeartbeat:
    def __init__(self, queue: QueueClient, job: WorkerJob, interval_seconds: int) -> None:
        self.queue = queue
        self.job = job
        self.interval_seconds = interval_seconds
        self.stopped = threading.Event()
        self.lost = threading.Event()
        self.thread = threading.Thread(target=self._run, name=f"heartbeat-{job.job_id}", daemon=True)

    def _beat(self) -> None:
        try:
            if not self.queue.heartbeat(self.job):
                self.lost.set()
        except Exception:
            self.lost.set()

    def _run(self) -> None:
        while not self.stopped.wait(self.interval_seconds):
            self._beat()
            if self.lost.is_set():
                return

    def __enter__(self) -> LeaseHeartbeat:
        self._beat()
        if not self.lost.is_set():
            self.thread.start()
        return self

    def __exit__(self, *_args: object) -> None:
        self.stopped.set()
        if self.thread.is_alive():
            self.thread.join(timeout=max(1, min(self.interval_seconds, 5)))


class Worker:
    def __init__(
        self,
        settings: WorkerSettings,
        queue: QueueClient,
        handlers: dict[str, JobHandler] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self.settings = settings
        self.queue = queue
        self.handlers = {"noop.v1": noop_handler, **(handlers or {})}
        self.logger = logger or logging.getLogger("rbc_worker")
        self._stop = threading.Event()

    def stop(self) -> None:
        self._stop.set()

    def run_forever(self, idle_seconds: float = 2.0) -> None:
        while not self._stop.is_set():
            if not self.run_once():
                self._stop.wait(idle_seconds)

    def run_once(self) -> bool:
        if self._stop.is_set():
            return False
        job = self.queue.claim(self.settings.queues)
        if job is None:
            return False
        handler = self.handlers.get(job.job_type)
        if handler is None:
            error = f"No handler registered for {job.job_type}"
            self.queue.fail(job, error)
            self.logger.error(
                "job_failed",
                extra={"context": {"job_id": job.job_id, "job_type": job.job_type, "error_class": "unsupported_job"}},
            )
            return True
        try:
            with LeaseHeartbeat(self.queue, job, self.settings.heartbeat_seconds) as heartbeat:
                if heartbeat.lost.is_set() or self.queue.cancel_requested(job):
                    raise JobCancelled("Job was cancelled or its lease was lost before execution.")
                result = handler(job)
                if heartbeat.lost.is_set() or self.queue.cancel_requested(job):
                    raise JobCancelled("Job was cancelled or its lease was lost during execution.")
            self.queue.complete(job, result)
            self.logger.info(
                "job_completed",
                extra={"context": {"job_id": job.job_id, "job_type": job.job_type, "outcome": "complete"}},
            )
        except JobCancelled:
            self._safe_fail(job, "cancelled", retryable=False)
            self.logger.warning(
                "job_cancelled",
                extra={"context": {"job_id": job.job_id, "job_type": job.job_type, "error_class": "cancelled"}},
            )
        except RetryableJobError as error:
            self._safe_fail(job, type(error).__name__, retryable=True)
            self._log_failure(job, error)
        except Exception as error:
            self._safe_fail(job, type(error).__name__, retryable=False)
            self._log_failure(job, error)
        return True

    def _safe_fail(self, job: WorkerJob, error: str, *, retryable: bool) -> None:
        try:
            self.queue.fail(job, error, retryable=retryable)
        except LeaseLostError:
            pass

    def _log_failure(self, job: WorkerJob, error: Exception) -> None:
        self.logger.exception(
            "job_failed",
            extra={
                "context": {
                    "job_id": job.job_id,
                    "job_type": job.job_type,
                    "error_class": type(error).__name__,
                }
            },
        )
