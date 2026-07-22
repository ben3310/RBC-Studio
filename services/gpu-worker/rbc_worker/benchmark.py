from __future__ import annotations

import argparse
import hashlib
import json
import statistics
import time
from pathlib import Path
from typing import Any

from PIL import Image

from .providers import CutoutOptions, CutoutProvider, ThresholdFixtureProvider


def _hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_manifest(path: str | Path) -> tuple[Path, dict[str, Any]]:
    manifest_path = Path(path).resolve()
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    if payload.get("schema_version") != 1 or payload.get("privacy") not in {"public-safe", "private"}:
        raise ValueError("Unsupported benchmark manifest.")
    root = manifest_path.parent
    ids: set[str] = set()
    for item in payload.get("items", []):
        if item["id"] in ids:
            raise ValueError(f"Duplicate benchmark id: {item['id']}")
        ids.add(item["id"])
        for key, hash_key in (("source", "source_sha256"), ("reference_mask", "mask_sha256")):
            candidate = (root / item[key]).resolve()
            if root not in candidate.parents or not candidate.is_file():
                raise ValueError(f"Benchmark path escapes the manifest or is missing: {item[key]}")
            if _hash(candidate) != item[hash_key]:
                raise ValueError(f"Benchmark hash mismatch: {item[key]}")
        if not item.get("rights") or not item.get("strata"):
            raise ValueError(f"Benchmark item lacks rights/strata evidence: {item['id']}")
    if not ids:
        raise ValueError("Benchmark manifest is empty.")
    return root, payload


def _bits(mask: Image.Image) -> tuple[set[tuple[int, int]], int, int]:
    image = mask.convert("L")
    points = {(x, y) for y in range(image.height) for x in range(image.width) if image.getpixel((x, y)) >= 128}
    return points, image.width, image.height


def intersection_over_union(reference: Image.Image, predicted: Image.Image) -> float:
    expected, width, height = _bits(reference)
    actual, actual_width, actual_height = _bits(predicted)
    if (width, height) != (actual_width, actual_height):
        return 0.0
    union = expected | actual
    return len(expected & actual) / len(union) if union else 1.0


def _boundary(points: set[tuple[int, int]], width: int, height: int) -> set[tuple[int, int]]:
    return {
        (x, y)
        for x, y in points
        if any((nx, ny) not in points for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
        or x in {0, width - 1}
        or y in {0, height - 1}
    }


def boundary_f_score(reference: Image.Image, predicted: Image.Image, tolerance: int = 1) -> float:
    expected, width, height = _bits(reference)
    actual, actual_width, actual_height = _bits(predicted)
    if (width, height) != (actual_width, actual_height):
        return 0.0
    expected_edge = _boundary(expected, width, height)
    actual_edge = _boundary(actual, width, height)

    def matched(source: set[tuple[int, int]], target: set[tuple[int, int]]) -> int:
        return sum(
            any(
                (x + dx, y + dy) in target
                for dx in range(-tolerance, tolerance + 1)
                for dy in range(-tolerance, tolerance + 1)
            )
            for x, y in source
        )

    precision = matched(actual_edge, expected_edge) / len(actual_edge) if actual_edge else float(not expected_edge)
    recall = matched(expected_edge, actual_edge) / len(expected_edge) if expected_edge else float(not actual_edge)
    return 2 * precision * recall / (precision + recall) if precision + recall else 0.0


def run_benchmark(manifest: str | Path, provider: CutoutProvider) -> dict[str, Any]:
    root, payload = load_manifest(manifest)
    results: list[dict[str, Any]] = []
    for item in payload["items"]:
        with Image.open(root / item["source"]) as source_image, Image.open(root / item["reference_mask"]) as reference:
            source = source_image.convert("RGB")
            started = time.perf_counter()
            output = provider.cutout(source, CutoutOptions(refine_radius=0))
            latency_ms = (time.perf_counter() - started) * 1000
            iou = intersection_over_union(reference, output.alpha)
            boundary = boundary_f_score(reference, output.alpha)
        accepted = iou >= 0.98 and boundary >= 0.95
        results.append(
            {
                "id": item["id"],
                "strata": item["strata"],
                "iou": round(iou, 6),
                "boundary_f": round(boundary, 6),
                "latency_ms": round(latency_ms, 3),
                "zero_correction_proxy": accepted,
            }
        )
    accepted_count = sum(bool(item["zero_correction_proxy"]) for item in results)
    latencies = [float(item["latency_ms"]) for item in results]
    return {
        "schema_version": 1,
        "provider_id": provider.provider_id,
        "model_revision": provider.revision,
        "fixture_count": len(results),
        "representative_private_count": 0 if payload["privacy"] == "public-safe" else len(results),
        "acceptance_rate": round(accepted_count / len(results), 6),
        "median_latency_ms": round(statistics.median(latencies), 3),
        "p95_latency_ms": round(sorted(latencies)[max(0, round(0.95 * len(latencies)) - 1)], 3),
        "production_gate_passed": len(results) >= 100 and accepted_count / len(results) >= 0.95,
        "results": results,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate and run the rights-safe RBC cutout benchmark harness.")
    parser.add_argument("--manifest", default="benchmarks/cutout/manifest.json")
    parser.add_argument("--output")
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    if args.validate_only:
        _, payload = load_manifest(args.manifest)
        report = {
            "schema_version": 1,
            "valid": True,
            "privacy": payload["privacy"],
            "fixture_count": len(payload["items"]),
        }
    else:
        report = run_benchmark(args.manifest, ThresholdFixtureProvider())
    rendered = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if args.output:
        Path(args.output).write_text(rendered, encoding="utf-8")
    print(rendered, end="")


if __name__ == "__main__":
    main()
