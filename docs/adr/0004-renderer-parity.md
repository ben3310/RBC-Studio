# ADR 0004: Browser-parity headless rendering before a canvas rewrite

Status: Accepted for future Milestone 4  
Date: 2026-07-19

## Context

The twelve current templates and their 4:5/9:16 behavior are brand assets. A direct server-canvas rewrite would risk font, compositing, crop, and layout drift.

## Decision

First define render contracts and golden outputs, then run the existing rendering environment in pinned Playwright Chromium. Extract a DOM-free render core only after parity is measured and approved.

## Consequences

- Current visuals remain the reference implementation.
- Rendering becomes deterministic through versioned inputs and seeds.
- Milestone 0 changes no renderer code or template output.
