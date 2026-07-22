from __future__ import annotations

import importlib
import logging
import signal
from collections.abc import Callable

from PIL import Image

from .config import WorkerSettings
from .cutout import CutoutJobHandler
from .model_registry import ModelRegistry
from .providers import BiRefNetProvider
from .queue import SupabaseQueueClient
from .storage import SignedStorageClient, SignedUrlPolicy
from .worker import Worker


def load_runner(entrypoint: str) -> Callable[[Image.Image, str], Image.Image]:
    module_name, separator, function_name = entrypoint.partition(":")
    if not separator or not module_name or not function_name:
        raise ValueError("RBC_CUTOUT_RUNNER must use module:function syntax.")
    function = getattr(importlib.import_module(module_name), function_name, None)
    if not callable(function):
        raise ValueError("Configured cutout runner is not callable.")
    return function


def build_worker(settings: WorkerSettings) -> Worker:
    if not settings.remote_enabled:
        raise ValueError("Durable worker runtime requires explicit RBC_REMOTE_FACTORY=true.")
    if settings.cutout_provider != "birefnet":
        raise ValueError("No production cutout provider is approved.")
    if not settings.model_registry_path or not settings.cutout_revision or not settings.cutout_runner:
        raise ValueError("Pinned registry, revision, and local runner are required.")
    record = ModelRegistry.load(settings.model_registry_path).require(
        "product_cutout", settings.cutout_provider, settings.cutout_revision
    )
    provider = BiRefNetProvider(record, runner=load_runner(settings.cutout_runner))
    if not settings.allowed_storage_hosts:
        raise ValueError("At least one signed-storage host must be allow-listed.")
    storage = SignedStorageClient(
        SignedUrlPolicy(settings.allowed_storage_hosts),
        max_download_bytes=settings.max_input_bytes,
        max_upload_bytes=settings.max_output_bytes,
    )
    queue = SupabaseQueueClient(
        settings.supabase_url,
        settings.service_role_key,
        settings.worker_id,
        lease_seconds=settings.lease_seconds,
    )
    handler = CutoutJobHandler(
        provider,
        storage,
        temp_root=settings.temp_dir,
        max_pixels=settings.max_pixels,
    )
    return Worker(settings, queue, handlers={"cutout.v1": handler})


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    worker = build_worker(WorkerSettings.from_env())
    signal.signal(signal.SIGINT, lambda *_args: worker.stop())
    signal.signal(signal.SIGTERM, lambda *_args: worker.stop())
    worker.run_forever()
