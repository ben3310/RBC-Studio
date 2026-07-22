from __future__ import annotations

import os
import re
import socket
from collections.abc import Mapping
from dataclasses import dataclass, field

TRUE_VALUES = {"1", "true", "yes", "on"}
QUEUE_PATTERN = re.compile(r"^[a-z][a-z0-9_]{1,63}$")


def _enabled(value: str | bool | None) -> bool:
    return value is True or str(value or "").strip().lower() in TRUE_VALUES


@dataclass(frozen=True, slots=True)
class WorkerSettings:
    worker_id: str
    remote_enabled: bool = False
    queues: tuple[str, ...] = ("noop",)
    log_level: str = "INFO"
    supabase_url: str = ""
    service_role_key: str = field(default="", repr=False)
    model_cache_dir: str = ""

    @classmethod
    def from_env(cls, source: Mapping[str, str] | None = None) -> WorkerSettings:
        env = os.environ if source is None else source
        queues = tuple(part.strip() for part in env.get("RBC_WORKER_QUEUES", "noop").split(",") if part.strip())
        if not queues or any(not QUEUE_PATTERN.fullmatch(queue) for queue in queues):
            raise ValueError("RBC_WORKER_QUEUES contains an invalid queue name.")
        remote_enabled = _enabled(env.get("RBC_REMOTE_FACTORY"))
        supabase_url = env.get("RBC_SUPABASE_URL", "").strip()
        service_role_key = env.get("RBC_SUPABASE_SERVICE_ROLE_KEY", "").strip()
        local_urls = ("http://127.0.0.1", "http://localhost")
        if remote_enabled and (not supabase_url.startswith(("https://", *local_urls)) or not service_role_key):
            raise ValueError("Remote worker mode requires a secure Supabase URL and service-role key.")
        return cls(
            worker_id=env.get("RBC_WORKER_ID", "").strip() or f"{socket.gethostname()}-spine",
            remote_enabled=remote_enabled,
            queues=queues,
            log_level=env.get("RBC_LOG_LEVEL", "INFO").strip().upper() or "INFO",
            supabase_url=supabase_url,
            service_role_key=service_role_key,
            model_cache_dir=env.get("RBC_MODEL_CACHE_DIR", "").strip(),
        )

    @property
    def mode(self) -> str:
        return "remote" if self.remote_enabled else "local-spine"

    def public_summary(self) -> dict[str, object]:
        return {
            "worker_id": self.worker_id,
            "mode": self.mode,
            "queues": list(self.queues),
            "log_level": self.log_level,
        }
