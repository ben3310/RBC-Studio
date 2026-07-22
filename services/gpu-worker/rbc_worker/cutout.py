from __future__ import annotations

import hashlib
import json
import re
import time
from pathlib import Path
from typing import Protocol

from PIL import Image, ImageOps

from .providers import CutoutOptions, CutoutProvider, CutoutResult
from .qa import evaluate_cutout, hash_bundle, refine_alpha, save_cutout_bundle
from .queue import WorkerJob
from .workspace import JobWorkspace


class StorageClient(Protocol):
    def download(self, signed_url: str, destination: Path, expected_sha256: str) -> dict[str, object]: ...
    def upload(self, signed_url: str, source: Path, content_type: str) -> dict[str, object]: ...


class CutoutJobHandler:
    def __init__(
        self,
        provider: CutoutProvider,
        storage: StorageClient,
        *,
        temp_root: str = "",
        max_pixels: int = 50_000_000,
    ) -> None:
        self.provider = provider
        self.storage = storage
        self.temp_root = temp_root
        self.max_pixels = max_pixels

    def __call__(self, job: WorkerJob) -> dict[str, object]:
        if job.job_type != "cutout.v1":
            raise ValueError(f"Cutout handler cannot process {job.job_type}")
        payload = job.payload
        asset_id = str(payload.get("asset_id") or "")
        source_url = str(payload.get("download_url") or "")
        source_hash = str(payload.get("sha256") or "")
        mime_type = str(payload.get("mime_type") or "")
        expected_bytes = int(payload.get("bytes") or 0)
        allowed_mimes = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}
        if not asset_id or not re.fullmatch(r"[0-9a-f]{64}", source_hash):
            raise ValueError("Cutout job is missing its asset identity or source hash.")
        if mime_type not in allowed_mimes or expected_bytes <= 0:
            raise ValueError("Cutout job has an invalid source MIME type or byte count.")
        policy = job.model_policy
        if policy.get("purpose") != "product_cutout":
            raise ValueError("Cutout job has the wrong model purpose.")
        if policy.get("allowed_revision") != self.provider.revision:
            raise ValueError("Cutout provider revision does not match the job policy.")
        allowed_provider = policy.get("provider_id")
        if allowed_provider and allowed_provider != self.provider.provider_id:
            raise ValueError("Cutout provider is not allowed by the job policy.")

        started = time.perf_counter()
        with JobWorkspace(job.job_id, self.temp_root) as workspace:
            source_path = workspace.file("source")
            downloaded = self.storage.download(source_url, source_path, source_hash)
            if int(downloaded.get("bytes") or 0) != expected_bytes:
                raise ValueError("Downloaded source byte count does not match the job contract.")
            Image.MAX_IMAGE_PIXELS = self.max_pixels
            with Image.open(source_path) as opened:
                if opened.format != allowed_mimes[mime_type]:
                    raise ValueError("Decoded source format does not match the job MIME type.")
                if opened.width * opened.height > self.max_pixels:
                    raise ValueError("Source image exceeds the configured pixel limit.")
                opened.load()
                source = ImageOps.exif_transpose(opened).convert("RGB")
            options_payload = payload.get("options") or {}
            options = CutoutOptions(
                refine_radius=max(0, min(2, int(options_payload.get("refine_radius", 1)))),
                preserve_shadow=bool(options_payload.get("preserve_shadow", False)),
            )
            raw = self.provider.cutout(source, options)
            alpha = refine_alpha(raw.alpha, options.refine_radius)
            rgba = raw.rgba.convert("RGBA")
            rgba.putalpha(alpha)
            result = CutoutResult(
                rgba=rgba,
                alpha=alpha,
                provider_id=raw.provider_id,
                revision=raw.revision,
                confidence=raw.confidence,
                warnings=raw.warnings,
            )
            bundle = save_cutout_bundle(result, workspace.file("outputs"))
            cutout_sha256 = hashlib.sha256(bundle["cutout"].read_bytes()).hexdigest()
            qa = evaluate_cutout(
                asset_id,
                source,
                result,
                source_sha256=source_hash,
                output_sha256=cutout_sha256,
            )
            qa_path = workspace.file("outputs") / "qa.json"
            qa_path.write_text(json.dumps(qa, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            bundle["qa"] = qa_path
            upload_by_role = {str(item.get("role")): str(item.get("upload_url")) for item in job.output_uploads}
            required = {"cutout", "mask", "preview_light", "preview_dark", "qa"}
            missing = required - upload_by_role.keys()
            if missing:
                raise ValueError(f"Cutout job is missing signed uploads for: {', '.join(sorted(missing))}")
            uploads: dict[str, object] = {}
            for role, path in bundle.items():
                content_type = "application/json" if role == "qa" else "image/png"
                uploads[role] = self.storage.upload(upload_by_role[role], path, content_type)
            output_hash = hash_bundle({role: path for role, path in bundle.items() if role != "qa"})
            duration_ms = round((time.perf_counter() - started) * 1000)
            return {
                "schema_version": 1,
                "job_id": job.job_id,
                "asset_id": asset_id,
                "provider_id": result.provider_id,
                "model_revision": result.revision,
                "source_sha256": source_hash,
                "output_hash": output_hash,
                "duration_ms": duration_ms,
                "qa": qa,
                "uploads": uploads,
                "route": qa["decision"],
            }
