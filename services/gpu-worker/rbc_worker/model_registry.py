from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class ModelRecord:
    purpose: str
    provider_id: str
    revision: str
    artifact_path: str
    artifact_sha256: str
    license: str
    license_url: str
    commercial_use_allowed: bool
    active: bool
    production_enabled: bool

    def verify(self, *, benchmark: bool = False) -> Path:
        if not self.revision or self.revision.startswith("PENDING_"):
            raise ValueError("Model revision is not pinned.")
        if not self.license or not self.license_url:
            raise ValueError("Model license evidence is incomplete.")
        if not self.commercial_use_allowed:
            raise ValueError("Model is not approved for commercial use.")
        if not benchmark and (not self.active or not self.production_enabled):
            raise ValueError("Model is not production-enabled.")
        path = Path(self.artifact_path).expanduser().resolve()
        if not path.is_file():
            raise ValueError("Pinned model artifact is not present locally; implicit downloads are forbidden.")
        digest = hashlib.sha256()
        with path.open("rb") as stream:
            while chunk := stream.read(1024 * 1024):
                digest.update(chunk)
        if digest.hexdigest() != self.artifact_sha256:
            raise ValueError("Pinned model artifact hash does not match the registry.")
        return path


class ModelRegistry:
    def __init__(self, records: tuple[ModelRecord, ...]) -> None:
        self.records = records

    @classmethod
    def load(cls, path: str | Path) -> ModelRegistry:
        source = Path(path)
        payload = json.loads(source.read_text(encoding="utf-8"))
        records = tuple(ModelRecord(**item) for item in payload.get("models", []))
        return cls(records)

    def require(self, purpose: str, provider_id: str, revision: str) -> ModelRecord:
        matches = [
            record
            for record in self.records
            if record.purpose == purpose and record.provider_id == provider_id and record.revision == revision
        ]
        if len(matches) != 1:
            raise ValueError("Requested provider/revision is absent or ambiguous in the model registry.")
        return matches[0]
