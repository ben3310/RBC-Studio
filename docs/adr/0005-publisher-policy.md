# ADR 0005: Publishing adapters cannot own governance

Status: Accepted  
Date: 2026-07-19

## Context

Workflow editors and platform integrations are operationally convenient but must never be able to publish an unapproved, unlicensed, or flagship item automatically.

## Decision

Keep destination, approval, rights, disclosure, and manual-only policy in a shared side-effect-free package and later database constraints. n8n coordinates due IDs only. Every publisher adapter repeats central preflight defensively. Flagship always produces a manual handoff, never an automated publish job.

## Consequences

- A workflow edit cannot override the flagship rule.
- Policy configuration fails closed during validation.
- Platform adapters remain independently replaceable and disableable.
