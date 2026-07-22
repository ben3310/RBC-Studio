# ADR 0002: Postgres-native application queue first

Status: Accepted for staged implementation  
Date: 2026-07-19

## Context

Initial RBC volume does not justify operating Redis solely for application jobs. Jobs must nevertheless be durable, leased, retryable, and auditable.

## Decision

Use the Supabase Queues/PGMQ contract for future application jobs. Queue messages carry entity IDs and hashes, not binaries. Workers claim with a visibility lease and heartbeat. Use Redis only if later n8n queue mode or measured concurrency requires it.

## Consequences

- Postgres remains the early source of operational truth.
- Queue semantics require idempotent handlers and output fingerprints.
- The Milestone 0 queue implementation is memory-only and test-only; it cannot be mistaken for durable production infrastructure.
