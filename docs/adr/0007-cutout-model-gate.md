# ADR 0007: fail-closed cutout model and benchmark gate

Status: Accepted for Milestone 2 infrastructure; production provider pending
Date: 2026-07-22

## Decision

The worker may implement provider adapters and benchmark tooling before weights
are downloaded, but it may not implicitly fetch a model or mark one active.
BiRefNet is represented as a candidate behind a registry record and an injected
local runner. Starting the durable cutout worker requires an exact revision,
artifact SHA-256, license reference, commercial-use approval, active flag, and
production-enabled flag.

Commercial and SAM-assisted providers use the same private benchmark and may not
be selected from marketing claims or a different dataset. The browser's existing
uniform-background assist remains the offline fallback.

## Consequences

- Repository and CI work can verify leases, storage safety, QA, and deterministic
  fixtures without a GPU or model download.
- The checked-in model registry is intentionally non-runnable.
- A production choice remains blocked until the rights-cleared 100-image report,
  RTX 3080 latency/VRAM/OOM evidence, and license review exist.
- Low-confidence results route visibly to review/fallback and never become
  approved content automatically.
