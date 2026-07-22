from __future__ import annotations

import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class JobWorkspace:
    job_id: str
    root: str = ""
    keep_on_failure: bool = False
    path: Path | None = None
    failed: bool = False

    def __enter__(self) -> JobWorkspace:
        base = Path(self.root).resolve() if self.root else None
        if base:
            base.mkdir(parents=True, exist_ok=True)
        safe = "".join(character for character in self.job_id if character.isalnum() or character in "-_")[:40]
        self.path = Path(tempfile.mkdtemp(prefix=f"rbc-{safe or 'job'}-", dir=base))
        return self

    def file(self, name: str) -> Path:
        if self.path is None:
            raise RuntimeError("Job workspace is not active.")
        candidate = (self.path / name).resolve()
        if candidate.parent != self.path.resolve():
            raise ValueError("Workspace paths cannot escape the job directory.")
        return candidate

    def mark_failed(self) -> None:
        self.failed = True

    def __exit__(self, *_args: object) -> None:
        if self.path and not (self.failed and self.keep_on_failure):
            shutil.rmtree(self.path, ignore_errors=True)
