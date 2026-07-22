# ADR 0003: Python GPU worker with a replaceable model boundary

Status: Accepted for foundation; model choice pending benchmark  
Date: 2026-07-19

## Context

PyTorch, segmentation, image processing, FFmpeg control, and GPU diagnostics are best supported in Python. Model revisions and licenses will change faster than the business workflow.

## Decision

Build one Python worker package with configuration, queue, job-handler, storage, QA, and model-adapter boundaries. Milestone 0 includes only health/readiness and `noop.v1`. BiRefNet, SAM, VLM, storage, and remote queue code are prohibited until their gated milestones.

## Consequences

- The worker can run native Windows, WSL2, or a cloud GPU behind the same contracts.
- Models are selected through registry/config after benchmark and license review.
- Worker logs never contain secrets or signed URLs.
