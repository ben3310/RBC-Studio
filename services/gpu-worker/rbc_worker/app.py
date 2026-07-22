from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from . import __version__
from .config import WorkerSettings
from .model_registry import ModelRegistry
from .runtime import load_runner

settings = WorkerSettings.from_env()
app = FastAPI(title="RBC GPU Worker", version=__version__, docs_url=None, redoc_url=None)


@app.get("/healthz")
def healthz() -> dict[str, object]:
    return {"status": "ok", "service": "rbc-gpu-worker", "version": __version__}


@app.get("/readyz", response_model=None)
def readyz() -> dict[str, object] | JSONResponse:
    summary = settings.public_summary()
    if "cutout" in settings.queues:
        try:
            if (
                not settings.remote_enabled
                or settings.cutout_provider == "disabled"
                or not settings.model_registry_path
                or not settings.cutout_revision
                or not settings.cutout_runner
                or not settings.allowed_storage_hosts
            ):
                raise ValueError(
                    "Cutout remote mode, storage host, provider, registry, revision, and runner are required."
                )
            record = ModelRegistry.load(settings.model_registry_path).require(
                "product_cutout", settings.cutout_provider, settings.cutout_revision
            )
            record.verify()
            load_runner(settings.cutout_runner)
        except (ImportError, OSError, ValueError) as error:
            return JSONResponse(
                status_code=503,
                content={"status": "not_ready", "reason": str(error), **summary},
            )
    return {"status": "ready", **summary}
