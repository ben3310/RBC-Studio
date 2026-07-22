from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from .config import WorkerSettings
from .queue import QueueClient, WorkerJob

JobHandler = Callable[[WorkerJob], dict[str, Any]]


def noop_handler(job: WorkerJob) -> dict[str, Any]:
    if job.job_type != "noop.v1":
        raise ValueError(f"Unsupported Milestone 0 job type: {job.job_type}")
    return {"job_id": job.job_id, "status": "complete", "handler": "noop.v1", "input": job.payload}


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

    def run_once(self) -> bool:
        job = self.queue.claim(self.settings.queues)
        if job is None:
            return False
        handler = self.handlers.get(job.job_type)
        if handler is None:
            error = f"No handler registered for {job.job_type}"
            self.queue.fail(job, error)
            context = {
                "job_id": job.job_id,
                "job_type": job.job_type,
                "error_class": "unsupported_job",
            }
            self.logger.error("job_failed", extra={"context": context})
            return True
        try:
            result = handler(job)
            self.queue.complete(job, result)
            context = {"job_id": job.job_id, "job_type": job.job_type, "outcome": "complete"}
            self.logger.info("job_completed", extra={"context": context})
        except Exception as error:  # queue boundary records failures; retry policy comes later
            self.queue.fail(job, type(error).__name__)
            context = {
                "job_id": job.job_id,
                "job_type": job.job_type,
                "error_class": type(error).__name__,
            }
            self.logger.exception("job_failed", extra={"context": context})
        return True
