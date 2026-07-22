from __future__ import annotations

import os
import re
import socket
from collections.abc import Mapping
from dataclasses import dataclass, field
from urllib.parse import urlparse

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
    model_registry_path: str = ""
    cutout_provider: str = "disabled"
    cutout_revision: str = ""
    cutout_runner: str = ""
    temp_dir: str = ""
    allowed_storage_hosts: tuple[str, ...] = ()
    lease_seconds: int = 300
    heartbeat_seconds: int = 60
    max_input_bytes: int = 40 * 1024 * 1024
    max_output_bytes: int = 80 * 1024 * 1024
    max_pixels: int = 50_000_000

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
        lease_seconds = int(env.get("RBC_WORKER_LEASE_SECONDS", "300"))
        heartbeat_seconds = int(env.get("RBC_WORKER_HEARTBEAT_SECONDS", "60"))
        if not 30 <= lease_seconds <= 900 or not 5 <= heartbeat_seconds < lease_seconds:
            raise ValueError("Worker heartbeat must be at least 5 seconds and shorter than a 30-900 second lease.")
        default_host = urlparse(supabase_url).hostname or ""
        hosts = tuple(
            dict.fromkeys(
                host.strip().lower()
                for host in (default_host, *env.get("RBC_STORAGE_ALLOWED_HOSTS", "").split(","))
                if host.strip()
            )
        )
        max_input_bytes = int(env.get("RBC_MAX_INPUT_BYTES", str(40 * 1024 * 1024)))
        max_output_bytes = int(env.get("RBC_MAX_OUTPUT_BYTES", str(80 * 1024 * 1024)))
        max_pixels = int(env.get("RBC_MAX_IMAGE_PIXELS", "50000000"))
        if min(max_input_bytes, max_output_bytes, max_pixels) <= 0:
            raise ValueError("Worker byte and pixel limits must be positive.")
        return cls(
            worker_id=env.get("RBC_WORKER_ID", "").strip() or f"{socket.gethostname()}-spine",
            remote_enabled=remote_enabled,
            queues=queues,
            log_level=env.get("RBC_LOG_LEVEL", "INFO").strip().upper() or "INFO",
            supabase_url=supabase_url,
            service_role_key=service_role_key,
            model_cache_dir=env.get("RBC_MODEL_CACHE_DIR", "").strip(),
            model_registry_path=env.get("RBC_MODEL_REGISTRY_PATH", "").strip(),
            cutout_provider=env.get("RBC_CUTOUT_PROVIDER", "disabled").strip() or "disabled",
            cutout_revision=env.get("RBC_CUTOUT_REVISION", "").strip(),
            cutout_runner=env.get("RBC_CUTOUT_RUNNER", "").strip(),
            temp_dir=env.get("RBC_WORKER_TEMP_DIR", "").strip(),
            allowed_storage_hosts=hosts,
            lease_seconds=lease_seconds,
            heartbeat_seconds=heartbeat_seconds,
            max_input_bytes=max_input_bytes,
            max_output_bytes=max_output_bytes,
            max_pixels=max_pixels,
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
            "cutout_provider": self.cutout_provider,
            "lease_seconds": self.lease_seconds,
        }
