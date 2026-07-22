from __future__ import annotations

import hashlib
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any, BinaryIO
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener


class StoragePolicyError(ValueError):
    pass


class _RejectRedirects(HTTPRedirectHandler):
    def redirect_request(self, *_args: object, **_kwargs: object) -> None:
        raise StoragePolicyError("Signed storage redirects are forbidden.")


@dataclass(frozen=True, slots=True)
class SignedUrlPolicy:
    allowed_hosts: tuple[str, ...]
    allowed_path_prefixes: tuple[str, ...] = (
        "/storage/v1/object/sign/",
        "/storage/v1/object/upload/sign/",
    )
    allow_local_http: bool = True

    def validate(self, value: str) -> str:
        parsed = urlparse(value)
        host = (parsed.hostname or "").lower()
        if parsed.username or parsed.password or parsed.fragment:
            raise StoragePolicyError("Signed storage URL contains forbidden authority or fragment data.")
        local = host in {"localhost", "127.0.0.1", "::1"}
        if parsed.scheme != "https" and not (self.allow_local_http and local and parsed.scheme == "http"):
            raise StoragePolicyError("Signed storage URL must use HTTPS outside local development.")
        if host not in self.allowed_hosts:
            raise StoragePolicyError("Signed storage URL host is not allow-listed.")
        if not any(parsed.path.startswith(prefix) for prefix in self.allowed_path_prefixes):
            raise StoragePolicyError("Signed storage URL path is outside the storage allow-list.")
        if not parsed.query:
            raise StoragePolicyError("Storage URL is not signed.")
        return value


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(chunk_size):
            digest.update(chunk)
    return digest.hexdigest()


class SignedStorageClient:
    def __init__(
        self,
        policy: SignedUrlPolicy,
        *,
        max_download_bytes: int,
        max_upload_bytes: int,
        timeout_seconds: float = 60.0,
        opener: Callable[..., Any] | None = None,
    ) -> None:
        self.policy = policy
        self.max_download_bytes = max_download_bytes
        self.max_upload_bytes = max_upload_bytes
        self.timeout_seconds = timeout_seconds
        self._opener = opener or build_opener(_RejectRedirects()).open

    @staticmethod
    def _copy_limited(source: BinaryIO, target: BinaryIO, limit: int) -> tuple[int, str]:
        digest = hashlib.sha256()
        total = 0
        while chunk := source.read(1024 * 1024):
            total += len(chunk)
            if total > limit:
                raise StoragePolicyError(f"Transfer exceeds the {limit}-byte limit.")
            digest.update(chunk)
            target.write(chunk)
        return total, digest.hexdigest()

    def download(self, signed_url: str, destination: Path, expected_sha256: str) -> dict[str, object]:
        self.policy.validate(signed_url)
        request = Request(signed_url, method="GET", headers={"accept": "application/octet-stream"})
        try:
            with self._opener(request, timeout=self.timeout_seconds) as response, destination.open("wb") as target:
                self.policy.validate(response.geturl())
                size, digest = self._copy_limited(response, target, self.max_download_bytes)
        except (HTTPError, URLError) as error:
            destination.unlink(missing_ok=True)
            raise RuntimeError("Signed storage download failed.") from error
        if digest != expected_sha256:
            destination.unlink(missing_ok=True)
            raise StoragePolicyError("Downloaded source hash does not match the job contract.")
        return {"bytes": size, "sha256": digest}

    def upload(self, signed_url: str, source: Path, content_type: str) -> dict[str, object]:
        self.policy.validate(signed_url)
        size = source.stat().st_size
        if size > self.max_upload_bytes:
            raise StoragePolicyError(f"Upload exceeds the {self.max_upload_bytes}-byte limit.")
        data = source.read_bytes()
        request = Request(
            signed_url,
            data=data,
            method="PUT",
            headers={"content-type": content_type, "content-length": str(size), "x-upsert": "false"},
        )
        try:
            with self._opener(request, timeout=self.timeout_seconds) as response:
                self.policy.validate(response.geturl())
                if getattr(response, "status", 200) >= 300:
                    raise RuntimeError("Signed storage upload was rejected.")
        except (HTTPError, URLError) as error:
            raise RuntimeError("Signed storage upload failed.") from error
        return {"bytes": size, "sha256": hashlib.sha256(data).hexdigest()}
