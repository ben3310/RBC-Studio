from __future__ import annotations

from fastapi import FastAPI

from . import __version__
from .config import WorkerSettings

settings = WorkerSettings.from_env()
app = FastAPI(title="RBC GPU Worker", version=__version__, docs_url=None, redoc_url=None)


@app.get("/healthz")
def healthz() -> dict[str, object]:
    return {"status": "ok", "service": "rbc-gpu-worker", "version": __version__}


@app.get("/readyz")
def readyz() -> dict[str, object]:
    return {"status": "ready", **settings.public_summary()}
