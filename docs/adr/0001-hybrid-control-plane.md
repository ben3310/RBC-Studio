# ADR 0001: Hybrid cloud control plane and outbound local worker

Status: Accepted for staged implementation  
Date: 2026-07-19

## Context

RBC Studio must stay usable as a static Netlify PWA on a phone while future GPU processing runs on a Windows RTX 3080 workstation. Exposing a home-machine inference port would increase security and networking complexity.

## Decision

Keep the current PWA and local storage workflow. When explicitly enabled in a later milestone, use Supabase Auth/Postgres/Storage/Queues as the phone-accessible control plane. The workstation claims jobs through outbound TLS and uploads results through scoped signed URLs. Remote mode defaults off.

## Consequences

- The existing local factory remains available during outages and before cloud setup.
- Heavy work never runs in Netlify or browser functions.
- Remote schemas, RLS, storage, and worker leases must pass staging gates before enablement.
- No service-role credential may enter the browser bundle.
