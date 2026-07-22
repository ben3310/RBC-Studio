from __future__ import annotations

import hashlib
from collections import deque
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from PIL import Image, ImageFilter

from .providers import CutoutResult


@dataclass(frozen=True, slots=True)
class ComponentStats:
    count: int
    largest_ratio: float
    small_ratio: float


def _values(image: Image.Image) -> list[int]:
    getter = getattr(image, "get_flattened_data", None)
    return list(getter() if getter else image.getdata())


def refine_alpha(alpha: Image.Image, radius: int = 1) -> Image.Image:
    mask = alpha.convert("L")
    if radius <= 0:
        return mask
    # A small median pass removes isolated one-pixel noise without morphology
    # that would close genuine handle/chain holes.
    size = min(5, radius * 2 + 1)
    if size % 2 == 0:
        size += 1
    return mask.filter(ImageFilter.MedianFilter(size=size))


def _binary(alpha: Image.Image, max_side: int = 512) -> tuple[list[int], int, int]:
    mask = alpha.convert("L")
    if max(mask.size) > max_side:
        ratio = max_side / max(mask.size)
        size = (max(1, round(mask.width * ratio)), max(1, round(mask.height * ratio)))
        mask = mask.resize(size, Image.Resampling.NEAREST)
    return [1 if value >= 128 else 0 for value in _values(mask)], mask.width, mask.height


def component_stats(alpha: Image.Image) -> ComponentStats:
    pixels, width, height = _binary(alpha)
    seen = bytearray(len(pixels))
    areas: list[int] = []
    for start, value in enumerate(pixels):
        if not value or seen[start]:
            continue
        seen[start] = 1
        queue = deque([start])
        area = 0
        while queue:
            index = queue.popleft()
            area += 1
            x, y = index % width, index // width
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < width and 0 <= ny < height:
                    neighbor = ny * width + nx
                    if pixels[neighbor] and not seen[neighbor]:
                        seen[neighbor] = 1
                        queue.append(neighbor)
        areas.append(area)
    total = sum(areas)
    if not total:
        return ComponentStats(0, 0.0, 0.0)
    return ComponentStats(len(areas), max(areas) / total, sum(area for area in areas if area <= 4) / total)


def interior_holes(alpha: Image.Image) -> int:
    pixels, width, height = _binary(alpha)
    transparent = [not value for value in pixels]
    seen = bytearray(len(pixels))
    queue: deque[int] = deque()
    for x in range(width):
        queue.extend((x, (height - 1) * width + x))
    for y in range(height):
        queue.extend((y * width, y * width + width - 1))
    while queue:
        index = queue.popleft()
        if seen[index] or not transparent[index]:
            continue
        seen[index] = 1
        x, y = index % width, index // width
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                queue.append(ny * width + nx)
    holes = 0
    for index, is_transparent in enumerate(transparent):
        if not is_transparent or seen[index]:
            continue
        holes += 1
        seen[index] = 1
        queue.append(index)
        while queue:
            current = queue.popleft()
            x, y = current % width, current // width
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < width and 0 <= ny < height:
                    neighbor = ny * width + nx
                    if transparent[neighbor] and not seen[neighbor]:
                        seen[neighbor] = 1
                        queue.append(neighbor)
    return holes


def evaluate_cutout(
    asset_id: str,
    source: Image.Image,
    result: CutoutResult,
    *,
    source_sha256: str,
    output_sha256: str,
) -> dict[str, object]:
    alpha = result.alpha.convert("L")
    histogram = alpha.histogram()
    total = max(1, alpha.width * alpha.height)
    foreground = sum(histogram[128:]) / total
    soft = sum(histogram[1:255]) / total
    bbox = alpha.point(lambda value: 255 if value >= 128 else 0).getbbox()
    if bbox:
        left, top, right, bottom = bbox
        margins = (
            left / alpha.width,
            top / alpha.height,
            (alpha.width - right) / alpha.width,
            (alpha.height - bottom) / alpha.height,
        )
    else:
        margins = (0.0, 0.0, 0.0, 0.0)
    border = _values(alpha.crop((0, 0, alpha.width, 1)))
    border += _values(alpha.crop((0, alpha.height - 1, alpha.width, alpha.height)))
    border += _values(alpha.crop((0, 0, 1, alpha.height)))
    border += _values(alpha.crop((alpha.width - 1, 0, alpha.width, alpha.height)))
    border_contact = sum(value >= 128 for value in border) / max(1, len(border))
    components = component_stats(alpha)
    holes = interior_holes(alpha)
    dimension_match = source.size == result.rgba.size == alpha.size

    signals = [
        {"name": "foreground_coverage", "value": round(foreground, 6), "passed": 0.02 <= foreground <= 0.95},
        {"name": "minimum_bbox_margin", "value": round(min(margins), 6), "passed": min(margins) >= 0.005},
        {"name": "border_contact", "value": round(border_contact, 6), "passed": border_contact <= 0.2},
        {"name": "component_count", "value": float(components.count), "passed": components.count <= 20},
        {
            "name": "largest_component_ratio",
            "value": round(components.largest_ratio, 6),
            "passed": components.largest_ratio >= 0.75,
        },
        {
            "name": "small_component_ratio",
            "value": round(components.small_ratio, 6),
            "passed": components.small_ratio <= 0.05,
        },
        {"name": "interior_hole_count", "value": float(holes), "passed": holes <= 20},
        {"name": "soft_alpha_ratio", "value": round(soft, 6), "passed": soft <= 0.35},
        {"name": "dimension_match", "value": 1.0 if dimension_match else 0.0, "passed": dimension_match},
    ]
    score = sum(1.0 for signal in signals if signal["passed"]) / len(signals)
    if not dimension_match or foreground < 0.01 or foreground > 0.98:
        decision = "reject"
    elif border_contact > 0.35 or components.count > 30:
        decision = "fallback"
    elif score < 0.89 or result.warnings:
        decision = "manual_review"
    else:
        decision = "accept"
    return {
        "schema_version": 1,
        "asset_id": asset_id,
        "model_id": result.provider_id,
        "model_revision": result.revision,
        "provider_confidence": result.confidence,
        "source_sha256": source_sha256,
        "output_sha256": output_sha256,
        "source_dimensions": [source.width, source.height],
        "output_dimensions": [result.rgba.width, result.rgba.height],
        "score": round(score, 6),
        "decision": decision,
        "signals": signals,
        "warnings": list(result.warnings),
        "created_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
    }


def save_cutout_bundle(result: CutoutResult, target: Path) -> dict[str, Path]:
    target.mkdir(parents=True, exist_ok=True)
    alpha = result.alpha.convert("L")
    rgba = result.rgba.convert("RGBA")
    cutout = target / "cutout.png"
    mask = target / "mask.png"
    light = target / "preview-light.png"
    dark = target / "preview-dark.png"
    rgba.save(cutout, format="PNG", compress_level=9, optimize=False)
    alpha.save(mask, format="PNG", compress_level=9, optimize=False)
    for color, path in (((245, 241, 236, 255), light), ((39, 38, 33, 255), dark)):
        canvas = Image.new("RGBA", rgba.size, color)
        canvas.alpha_composite(rgba)
        canvas.convert("RGB").save(path, format="PNG", compress_level=9, optimize=False)
    return {"cutout": cutout, "mask": mask, "preview_light": light, "preview_dark": dark}


def hash_bundle(paths: dict[str, Path]) -> str:
    digest = hashlib.sha256()
    for role, path in sorted(paths.items()):
        digest.update(role.encode())
        digest.update(bytes.fromhex(hashlib.sha256(path.read_bytes()).hexdigest()))
    return digest.hexdigest()
