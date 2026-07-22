from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol

from PIL import Image

from .model_registry import ModelRecord


@dataclass(frozen=True, slots=True)
class CutoutOptions:
    refine_radius: int = 1
    preserve_shadow: bool = False


@dataclass(slots=True)
class CutoutResult:
    rgba: Image.Image
    alpha: Image.Image
    provider_id: str
    revision: str
    confidence: float | None = None
    warnings: tuple[str, ...] = ()


class CutoutProvider(Protocol):
    provider_id: str
    revision: str

    def cutout(self, image: Image.Image, options: CutoutOptions) -> CutoutResult: ...


class BiRefNetProvider:
    """Fail-closed adapter: inference is injected only after a pinned runtime is approved."""

    provider_id = "birefnet"

    def __init__(
        self,
        record: ModelRecord,
        *,
        runner: Callable[[Image.Image, str], Image.Image] | None = None,
        benchmark: bool = False,
    ) -> None:
        if record.provider_id != self.provider_id or record.purpose != "product_cutout":
            raise ValueError("BiRefNet registry record has the wrong provider or purpose.")
        self.revision = record.revision
        self.artifact = record.verify(benchmark=benchmark)
        self._runner = runner

    def cutout(self, image: Image.Image, options: CutoutOptions) -> CutoutResult:
        del options
        if self._runner is None:
            raise RuntimeError("BiRefNet runtime is not installed; automatic model downloads are forbidden.")
        rgb = image.convert("RGB")
        alpha = self._runner(rgb, str(self.artifact)).convert("L")
        if alpha.size != rgb.size:
            raise ValueError("BiRefNet runner returned an alpha mask with the wrong dimensions.")
        rgba = rgb.convert("RGBA")
        rgba.putalpha(alpha)
        return CutoutResult(rgba=rgba, alpha=alpha, provider_id=self.provider_id, revision=self.revision)


class ThresholdFixtureProvider:
    """Rights-safe synthetic benchmark baseline; never eligible for production."""

    provider_id = "synthetic-threshold-baseline"
    revision = "v1"

    def __init__(self, threshold: int = 220) -> None:
        self.threshold = threshold

    def cutout(self, image: Image.Image, options: CutoutOptions) -> CutoutResult:
        del options
        rgb = image.convert("RGB")
        gray = rgb.convert("L")
        alpha = gray.point(lambda value: 255 if value < self.threshold else 0, mode="L")
        rgba = rgb.convert("RGBA")
        rgba.putalpha(alpha)
        return CutoutResult(
            rgba=rgba,
            alpha=alpha,
            provider_id=self.provider_id,
            revision=self.revision,
            confidence=None,
            warnings=("Synthetic fixture baseline only; not a production matting provider.",),
        )
