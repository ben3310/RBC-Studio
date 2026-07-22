# RBC Content Factory - Codex Implementation Plan

Version: 2.0  
Date: 2026-07-19  
Owner: RareBagClub  
Execution agent: Codex  
Current application: RBC Studio 6.14.0
Current gate: Milestone 2 local infrastructure complete; production cutout gate remains closed
Last structurally validated: 2026-07-22

## 0. Document contract

This is the missing second deliverable from the original automation brief. It is the canonical, executable implementation plan for Codex. It is not a release note and it is not permission to enable external services without the operator.

The companion documents have separate responsibilities:

- `CLAUDE_PLAN.md` defines business strategy, brand doctrine, growth channels, funnels, and operating principles.
- `CODEXPLAN.md` contains the technical research, architecture rationale, alternatives, and long-range system design.
- `CODEX_IMPLEMENTATION.md` converts those decisions into ordered work packets, exact repository targets, interfaces, tests, gates, and rollback rules.
- `BUILD_PLAN.md` records the shipped local studio product and visual workflow.
- `FABLE5.md` is the creative audit brief for the vertical template system.

If documents conflict, use this precedence:

1. The operator's newest explicit instruction.
2. Safety, rights, platform, and flagship invariants in this document.
3. `CLAUDE_PLAN.md` for brand and business intent.
4. `CODEX_IMPLEMENTATION.md` for build order and acceptance.
5. `CODEXPLAN.md` for architecture rationale and deferred alternatives.
6. Existing behavior and tests for unspecified implementation details.

### 0.1 How Codex must execute this plan

For every implementation turn:

1. Read the active milestone, its prerequisites, acceptance tests, and stop gate.
2. Inspect the existing files before editing; preserve unrelated operator changes.
3. Add or update a short working plan before material code changes.
4. Implement only the active milestone and explicitly authorized external setup.
5. Put new remote behavior behind a default-off feature flag until its milestone passes.
6. Add tests with the implementation, including a negative governance test.
7. Run the existing unit suite and the real browser E2E before declaring completion.
8. Update the milestone checkboxes and execution log with evidence.
9. Stop at any credential, paid-service, account-review, production-deployment, or model-license gate.

Do not mark an adapter complete because its request shape compiles. A publisher is complete only after official account authorization, sandbox execution, idempotency verification, rate-limit behavior, and a recorded production-readiness review.

### 0.2 Status vocabulary

- `[x] Complete`: implemented in the repository and acceptance evidence exists.
- `[ ] Ready`: specified and not blocked by a prerequisite.
- `[ ] Gated`: requires operator choice, credential, external account, legal/license review, or production permission.
- `[ ] Deferred`: deliberately outside the active milestone.

## 1. Product boundary and non-negotiable invariants

The system turns rights-cleared photographs and operator-confirmed facts for one vintage luxury bag into governed multi-channel content. It reduces repetitive production work while keeping the RareBagClub flagship manually curated.

These invariants must be enforced in shared code, database constraints, UI behavior, workflow preflight, and tests:

1. The flagship destination is permanently manual-only. No role, environment variable, workflow, or API can auto-publish it.
2. Every public asset has a current, confirmed rights record. Missing or expired rights blocks approval and publishing.
3. Approval binds to the final binary fingerprint and final copy fingerprint. Editing either invalidates approval.
4. Actual product pixels must originate from documented source photographs. Generative models cannot redraw or invent the bag.
5. Synthetic backgrounds, mood media, and personas are recorded in provenance and disclosed where policy requires it.
6. Product facts are operator-entered or operator-confirmed. Models can suggest, never establish, authentication, provenance, condition, price, or availability.
7. Scarcity derives from inventory state only. The system cannot invent buyers, queues, urgency, or stock claims.
8. Publishing uses official platform APIs only. No browser-login automation, scraping-based posting, device spoofing, burner provisioning, or engagement bots.
9. Every asset has one primary CTA and every satellite identifies its relationship to RareBagClub.
10. Every mutation, job, webhook, and publish attempt is idempotent and auditable.
11. Remote failure cannot remove the useful local studio and export path.
12. Secrets, raw private inventory, model weights, signed URLs, and credential exports never enter source control or browser bundles.

## 2. Shipped baseline that must not regress

RBC Studio 6.12.1 is a static ES-module PWA deployable to Netlify. The following behavior is already shipped and is the compatibility baseline.

| Capability | Current implementation | Regression evidence |
|---|---|---|
| Campaign and source record | Browser-local campaign state and storage | `tests/unit.mjs`, browser E2E |
| Visual studio | 12 templates in 4:5 and 9:16 | browser E2E |
| Copy surfaces | Instagram, TikTok, Telegram, Threads, and X | unit and browser E2E |
| Factory plan | 24 studio visuals, 6 Pinterest pins, 1 archive article | contract fixtures and E2E |
| Rights and review | Source confirmation, rights record, approve/reject states | foundation tests |
| Destination policy | Shared fail-closed policy; flagship manual-only | `tests/foundation.mjs` |
| Export | Approved binaries, manifest, Pinterest CSV, article HTML, license/runbook files | browser E2E |
| Remote mode | Disabled by default with zero network calls | foundation tests |
| GPU service | Health/config/logging/queue/no-op boundary only | Python tests |

Milestone 0 delivered these additive foundations:

- `packages/policy-core/`
- `packages/contracts/`
- `config/destinations.json`
- `js/remote/config.js`
- `js/remote/client.js`
- `services/gpu-worker/`
- `docs/adr/0001-0005`
- `.env.example`
- `.github/workflows/verify.yml`

The current implementation does not include a database, authentication, private object storage, durable remote queue, trained model, Docker runtime, official publisher, CMS deployment, or analytics ingestion.

## 3. Target architecture

```text
Operator phone or workstation
  RBC Studio PWA on Netlify
    | local-first path: IndexedDB/local export always available
    | optional remote path: Supabase Auth + HTTPS + RLS
    v
Supabase control plane
  Postgres + private Storage + Queues + database functions
    |                                      |
    | outbound lease/claim                 | approved scheduled jobs
    v                                      v
GPU worker on Windows/WSL2              n8n orchestrator
  Python + PyTorch/CV + FFmpeg             | versioned publisher adapters
  optional ComfyUI adapter                  v
    |                                  Official platform APIs
    | signed download/upload URLs           |
    +--------------------+------------------+
                         v
              manifests, audit, publications, metrics
```

### 3.1 Component responsibilities

| Component | Owns | Must not own |
|---|---|---|
| PWA | Intake, local studio, review UI, explicit sync, remote queue view | Service-role secrets, GPU inference, unattended flagship publishing |
| Postgres | Durable metadata, policy constraints, states, idempotency, audit | Large image/video bytes |
| Storage | Originals, derived media, proofs, manifests | Authorization decisions outside RLS |
| Queue | Small job references, leases, retries | Image bytes or long-lived signed URLs |
| GPU worker | Cutout, CV, crops, rendering, optional generation, video | Platform tokens, business-rule overrides |
| n8n | Schedules, orchestration, refresh flows, alerts | Canonical policy logic or image inference |
| Publisher service | Adapter validation and official API calls | Approval creation, product fact edits |
| Archive site | Public SEO records and enquiry funnel | Private originals, operator notes, token material |

### 3.2 Trust boundaries

- The browser is an untrusted public client authenticated with the Supabase anon key and user session.
- RLS is the primary browser authorization boundary; hidden UI is not authorization.
- Worker and publisher service credentials are separate, scoped, rotated, and never reused.
- Workers fetch only allow-listed Supabase storage URLs with short expiry and expected hashes.
- n8n stores credential references in its encrypted credential store, not workflow JSON.
- Public archive pages consume a publish projection, never operational tables.

### 3.3 Technology decisions

| Area | Selected implementation | Replacement boundary |
|---|---|---|
| UI | Existing vanilla JavaScript PWA | Repository interfaces in `js/remote/` |
| Control plane | Supabase Auth, Postgres, Storage, Queues | SQL schema and OpenAPI/contracts |
| Worker | Python 3.12, FastAPI health endpoints, outbound queue consumer | `QueueClient`, storage adapter, job handlers |
| Cutout | Benchmark BiRefNet first; commercial fallback only after evaluation | `CutoutProvider` protocol |
| Localization | SAM-family adapter only when benchmark proves value | `SegmentAssistProvider` protocol |
| Attribute suggestions | Deterministic CV first, benchmarked local VLM second | structured suggestion contract |
| Mood generation | ComfyUI API adapter for abstract atmosphere only | workflow ID and input/output contract |
| Rendering | Headless browser using extracted render contract | `RenderRequest`/`RenderResult` |
| Video | FFmpeg deterministic assembly | command builder and media manifest |
| Orchestration | n8n for schedules/webhooks/alerts | versioned webhook and adapter contracts |
| Observability | JSON logs + Sentry initially | OpenTelemetry-compatible fields |

Explicit exclusions at current scale: React rewrite, Kubernetes, Kafka, per-platform microservices, Firebase alongside Supabase, public inbound workstation ports, and AI-generated actual-product imagery.

## 4. Target repository layout

Labels: `[exists]`, `[next]`, and `[later]` describe sequencing, not optionality.

```text
/
  index.html                                  [exists]
  css/                                        [exists]
  js/
    factory/                                  [exists]
    remote/                                   [exists, expand M1]
      config.js
      client.js
      auth.js                                 [next]
      repository.js                           [next]
      sync.js                                 [next]
  packages/
    contracts/                                [exists, expand every milestone]
      schemas/
      fixtures/
      validate.js
    policy-core/                              [exists]
    copy-core/                                [later M4]
    render-core/                              [later M4]
    platform-adapters/                        [later M5-M6]
  services/
    gpu-worker/                               [exists spine, expand M2-M4]
      rbc_worker/
        app.py
        config.py
        logging.py
        queue.py
        worker.py
        claim.py                              [M2]
        storage.py                            [M2]
        jobs/
          cutout.py                           [M2]
          attributes.py                       [M3]
          crops.py                            [M3]
          render.py                           [M4]
          video.py                            [M4]
          mood.py                             [M3/M4]
        models/
          birefnet.py                         [M2]
          segmentation.py                     [M2]
          vlm.py                              [M3]
        qa/
          cutout_score.py                     [M2]
          visual_rules.py                     [M4]
      tests/
      benchmark/
      Dockerfile.cloud                        [M2 after local benchmark]
    publisher/                                [M5]
      src/
        preflight.ts
        scheduler.ts
        adapters/
      tests/fixtures/
  apps/
    archive-site/                             [M5]
  workflows/
    n8n/                                      [M5]
    comfyui/                                  [M3/M4]
  infra/
    supabase/                                 [M1]
      config.toml
      migrations/
      seed.sql
      tests/
    docker/
      compose.yml                             [M2]
      compose.observability.yml               [later]
    scripts/
  config/
    destinations.json                         [exists]
    models.yml                                [M2]
    policies.yml                              [M1]
    prompts/                                  [M3/M4]
  docs/
    adr/                                      [exists]
    api/
    benchmarks/
    runbooks/
  tests/                                      [exists, expand]
```

Do not commit `models/`, raw/private assets, generated binaries, database dumps, credential exports, `.env` files, benchmark source photographs, or n8n credentials.

## 5. Shared contracts and implementation conventions

### 5.1 Serialization rules

- IDs are UUID strings at remote boundaries. Existing local IDs are preserved in `external_refs` during migration.
- Times are RFC 3339 UTC strings in JSON and `timestamptz` in Postgres.
- Operator time zones use IANA identifiers such as `Asia/Kuala_Lumpur`.
- Money uses integer minor units plus ISO 4217 currency. Never use floating point.
- Binary identity is lowercase SHA-256 of original bytes.
- Structured fingerprints use canonical JSON with sorted keys, UTF-8 encoding, and SHA-256.
- API fields use `snake_case`; existing browser objects may be mapped at the repository boundary.
- Contract schemas are versioned. Breaking changes require a new schema/version, not silent mutation.
- Unknown enum values fail closed at publishing and are surfaced to review.

### 5.2 Existing contract inventory

The following v1 schemas already exist under `packages/contracts/schemas/`:

- `destination-config.schema.json`
- `factory-run.schema.json`
- `source-asset.schema.json`
- `content-item.schema.json`
- `worker-job.schema.json`
- `cutout-qa.schema.json`
- `approval.schema.json`
- `publish-job.schema.json`

Every new API or job adds:

1. A JSON Schema with `$schema`, `$id`, title, version discriminator, and `additionalProperties: false` where practical.
2. A valid deterministic fixture.
3. At least one invalid fixture or negative assertion.
4. Producer validation before enqueue/write.
5. Consumer validation before processing.
6. A compatibility note if an existing field changes.

### 5.3 Error envelope

All HTTP services return errors in this form:

```json
{
  "error": {
    "code": "approval_stale",
    "message": "The content changed after approval.",
    "retryable": false,
    "request_id": "uuid",
    "details": {}
  }
}
```

Rules:

- `message` is operator-safe and contains no token, URL signature, stack trace, or raw provider body.
- `details` contains allow-listed fields only.
- Retryable errors map to bounded backoff; validation, rights, policy, and auth failures do not retry.
- Internal logs can include `error_class` and provider request IDs, but not credentials or full private payloads.

### 5.4 Idempotency and concurrency

- Every mutation accepts or derives an idempotency key.
- A repeated request with the same key and same request hash returns the stored result.
- The same key with different input returns HTTP 409 / `idempotency_conflict`.
- Mutable operator records use an integer `version`; updates require the expected version.
- Jobs use leases and heartbeats, never a permanent `processing=true` flag.
- Publish idempotency is unique per account, content fingerprint, scheduled slot, and adapter version.

## 6. Configuration and feature flags

### 6.1 Public browser configuration

Only these values may enter the browser bundle:

```dotenv
RBC_REMOTE_FACTORY=false
RBC_SUPABASE_URL=
RBC_SUPABASE_ANON_KEY=
RBC_SENTRY_DSN=
RBC_APP_ENV=development
```

Remote mode remains false unless the URL and anon key validate. Production must use HTTPS. Localhost HTTP is permitted for local Supabase only.

### 6.2 Private worker and orchestrator configuration

```dotenv
RBC_SUPABASE_SERVICE_ROLE_KEY=
RBC_WORKER_ID=
RBC_WORKER_QUEUES=cutout,attributes,crops,render,video,mood
RBC_WORKER_CONCURRENCY=1
RBC_WORKER_LEASE_SECONDS=300
RBC_WORKER_HEARTBEAT_SECONDS=30
RBC_MODEL_CACHE_DIR=
RBC_MODEL_CONFIG=config/models.yml
RBC_COMFYUI_URL=http://127.0.0.1:8188
RBC_N8N_WEBHOOK_SECRET=
RBC_SENTRY_DSN=
```

Publisher tokens are stored as platform-specific encrypted secret references. Do not place token values in shared `.env.example`, database rows, workflow exports, logs, or manifests.

### 6.3 Destination policy

`config/destinations.json` and `packages/policy-core/index.js` must remain exactly equivalent. Startup validation fails when:

- the flagship destination is missing;
- a flagship has `manualOnly !== true`;
- a flagship does not require approval;
- a destination kind or required field is invalid;
- a configured account points to an unknown destination.

Database seed data mirrors the same codes. CI compares configuration, runtime policy, and database seed projections.

### 6.4 Model registry configuration

`config/models.yml` will contain logical purpose, provider, repository/model ID, exact revision, artifact hash, runtime, license reference, commercial-use review, VRAM class, and benchmark report path. Production refuses an unpinned or unapproved model.

## 7. Supabase database implementation

Milestone 1 introduces the database. Migrations are append-only after a shared environment has applied them.

### 7.1 Migration order

Create these files under `infra/supabase/migrations/` using timestamp prefixes generated by the Supabase CLI:

1. `*_extensions_and_enums.sql`
2. `*_organizations_and_members.sql`
3. `*_pieces_and_campaigns.sql`
4. `*_assets_rights_and_attributes.sql`
5. `*_factory_content_and_approvals.sql`
6. `*_destinations_and_accounts.sql`
7. `*_jobs_publications_and_metrics.sql`
8. `*_audit_and_webhooks.sql`
9. `*_constraints_indexes_and_triggers.sql`
10. `*_row_level_security.sql`
11. `*_storage_policies.sql`
12. `*_rpc_functions.sql`

Do not edit a migration already applied to staging or production. Add a forward migration and a documented repair path.

### 7.2 Required tables

All mutable tables include `created_at timestamptz`, `updated_at timestamptz`, and where operators edit records, `version integer not null default 1`.

#### Identity and tenancy

- `organizations(id, name, slug, default_timezone, settings)`
- `organization_members(organization_id, user_id, role)` with unique membership and roles `owner | operator | reviewer | analyst`

#### Inventory and campaigns

- `pieces(id, organization_id, archive_no, internal_name, public_name, status, price_amount_minor, price_currency, price_mode, material, condition, authentication, provenance, detail, acquisition_route, product_url, facts_version, facts_confirmed_at, facts_confirmed_by)`
- `campaigns(id, organization_id, piece_id, title, objective, story_angle, campaign_date, target_region, spelling_mode, local_snapshot, status)`
- unique `(organization_id, archive_no)`
- campaign states: `draft | generating | review | scheduled | active | complete | failed`

#### Assets and rights

- `source_assets(id, organization_id, piece_id, campaign_id, kind, storage_key, sha256, mime_type, width, height, bytes, color_profile, exif_removed_at, parent_asset_id, derivation)`
- `rights_records(id, organization_id, asset_id, rights_class, source_reference, licensor, license_name, license_url, valid_from, valid_until, territories, allowed_uses, proof_storage_key, confirmed_by, confirmed_at)`
- `asset_attributes(asset_id, extractor, extractor_version, palette, dominant_color, material_suggestions, hardware_suggestions, style_suggestions, season_suggestions, vibe_suggestions, confidence, raw_output, operator_confirmed)`
- binary rows are immutable: changed bytes create a new `source_assets` row
- asset kinds: `product_original | product_detail | owned_mood | licensed_mood | generated_mood | persona | derivative`

#### Factory and review

- `factory_runs(id, organization_id, campaign_id, plan_version, seed, input_fingerprint, status, requested_by, started_at, completed_at)`
- `content_items(id, organization_id, factory_run_id, campaign_id, content_type, destination_id, platform, account_id, template_id, format, variant_seed, copy_text, copy_schema_version, facts_fingerprint, cta_type, synthetic_media, disclosure_text, status, manual_only, binary_fingerprint, copy_fingerprint)`
- `content_item_assets(content_item_id, asset_id, role, position)`
- `approvals(id, organization_id, content_item_id, decision, binary_fingerprint, copy_fingerprint, reviewer_id, note, created_at)`
- only one active factory run per campaign and input fingerprint
- content states: `draft | rendered | qa_failed | review | approved | rejected | scheduled | publishing | published | failed | superseded`

#### Destinations and accounts

- `destinations(id, organization_id, code, label, platform, kind, manual_only, requires_approval, requires_ai_disclosure)`
- `social_accounts(id, organization_id, destination_id, platform, handle, external_account_id, authorization_state, token_secret_ref, token_expires_at, capabilities, enabled, last_health_check_at)`
- check constraint: `kind = 'flagship'` implies `manual_only = true and requires_approval = true`
- trigger rejects any update that weakens an existing flagship row

#### Jobs, publishing, and analytics

- `job_runs(id, organization_id, queue_name, job_type, entity_id, worker_id, state, attempt, lease_expires_at, model_name, model_revision, prompt_version, started_at, finished_at, duration_ms, gpu_seconds, estimated_cost_minor, input_hash, output_hash, error_class, error_redacted)`
- `publish_jobs(id, organization_id, content_item_id, account_id, scheduled_for, state, idempotency_key, attempt_count, next_attempt_at, last_error_code, last_error_redacted)`
- `publications(id, organization_id, publish_job_id, account_id, platform_post_id, platform_url, published_at, remote_payload_redacted)`
- `metric_observations(id, organization_id, publication_id, observed_at, views, impressions, reach, saves, likes, comments, shares, clicks, profile_visits, dms_attributed, raw_restricted)`
- unique `(account_id, idempotency_key)`, `(account_id, platform_post_id)`, and `(publication_id, observed_at)`

#### Audit, webhooks, and models

- `audit_events(id, organization_id, actor_type, actor_id, action, entity_type, entity_id, request_id, before_hash, after_hash, metadata, created_at)`
- `webhook_events(id, organization_id, provider, provider_event_id, received_at, signature_valid, payload_redacted, processed_at, error)`
- `model_registry(id, purpose, model_id, revision, license, license_url, commercial_use_allowed, artifact_sha256, evaluation_report, approved_at, active)`
- audit rows are append-only for application roles
- unique `(provider, provider_event_id)` prevents webhook replay

### 7.3 Required indexes

At minimum:

- tenant prefix indexes on every `organization_id`
- `campaigns(piece_id, created_at desc)`
- `source_assets(campaign_id, kind)` and unique `source_assets(sha256, organization_id)` where appropriate
- `factory_runs(campaign_id, input_fingerprint)`
- `content_items(campaign_id, status, destination_id)`
- `approvals(content_item_id, created_at desc)`
- partial due-job indexes on `publish_jobs(next_attempt_at)` for pending/retry states
- lease indexes on `job_runs(queue_name, state, lease_expires_at)`
- `metric_observations(publication_id, observed_at desc)`
- GIN only for JSONB queries proven necessary; do not index every JSON field preemptively

### 7.4 Row-level security matrix

All tenant tables enable and force RLS.

| Role | Pieces/campaigns | Originals | Reviews | Publishing | Metrics | Account secrets |
|---|---|---|---|---|---|---|
| Owner | CRUD | Signed read/write | Decide | Configure and view | Read | Reference metadata only |
| Operator | CRUD | Signed read/write | Submit, no self-bypass | Schedule approved non-flagship | Read | No token material |
| Reviewer | Read | Signed read needed for review | Decide | Read status | Read | None |
| Analyst | Read public facts | No originals | Read decisions | Read publications | Read | None |
| Worker service | Required job rows only | Short signed job access | None | None | None | None |
| Publisher service | Approved scheduled projection | Final public assets only | Validate current approval | Claim/complete own jobs | Write publication | Resolve assigned token ref |

Required automated RLS tests:

- cross-organization reads return zero rows;
- guessed storage keys cannot be downloaded;
- analyst cannot access originals or token references;
- reviewer cannot mutate facts;
- operator cannot create a publish job for a flagship item;
- service roles cannot use unrelated organization assets;
- unauthenticated users can read only the explicit archive publish projection.

### 7.5 Storage design

Private buckets:

- `product-originals`: immutable source photographs
- `derived-assets`: masks, cutouts, crops, renders, videos
- `rights-proofs`: invoices/licenses and evidence
- `factory-exports`: time-limited bundles and manifests
- `benchmark-private`: local/staging-only evaluation references; never public

Public delivery should use a separate published projection or CDN path after approval, not make original buckets public.

Storage keys are server-generated:

```text
org/{organization_id}/piece/{piece_id}/source/{asset_id}/{sha256}.{ext}
org/{organization_id}/run/{run_id}/derived/{asset_id}/{role}/{sha256}.{ext}
org/{organization_id}/export/{export_id}/{manifest_hash}.zip
```

Upload intents constrain bucket, key prefix, MIME type, maximum bytes, expected hash, and expiry. Completion verifies bytes and hash before creating the usable asset record.

## 8. Browser and control-plane APIs

### 8.1 Preferred browser integration

The PWA uses a repository abstraction:

```js
export class CampaignRepository {
  async listCampaigns() {}
  async getCampaign(id) {}
  async saveLocalCampaign(record) {}
  async syncCampaign(localId, options) {}
  async listReviewQueue(filters) {}
  async approveContent(itemId, expectedFingerprints) {}
  async scheduleContent(itemId, schedule) {}
}
```

`LocalCampaignRepository` wraps current browser behavior. `RemoteCampaignRepository` uses the authenticated Supabase client. `HybridCampaignRepository` selects explicitly; remote mode never silently uploads local campaigns.

### 8.2 Required operations

Implement database RPCs or versioned HTTPS endpoints for:

```text
POST   /v1/pieces
GET    /v1/pieces/{piece_id}
PATCH  /v1/pieces/{piece_id}                     If-Match: version
POST   /v1/pieces/{piece_id}/assets/upload-intent
POST   /v1/assets/{asset_id}/complete-upload
POST   /v1/campaigns
POST   /v1/campaigns/{campaign_id}/sync-local
POST   /v1/campaigns/{campaign_id}/factory-runs
GET    /v1/factory-runs/{run_id}
GET    /v1/content-items?status=&destination=&campaign=
POST   /v1/content-items/{item_id}/approve
POST   /v1/content-items/{item_id}/reject
POST   /v1/content-items/batch-approve
POST   /v1/content-items/{item_id}/schedule
GET    /v1/analytics/weekly
```

Security-sensitive state changes should be database functions or server endpoints, not multi-call browser transactions.

### 8.3 Explicit local-to-remote sync

Sync is one-way in Milestone 1: local record to remote staging.

Request fields:

- `local_campaign_id`
- `local_schema_version`
- `local_snapshot`
- `piece_fingerprint`
- `source_assets[]` with hash, MIME, size, dimensions, and rights summary
- `idempotency_key`

Algorithm:

1. Validate local schema and rights confirmation.
2. Resolve or create the piece using organization plus local external reference.
3. Resolve or create the campaign using the same mapping.
4. Compare source hashes; request uploads only for missing bytes.
5. Store the lossless local snapshot.
6. Return stable remote IDs and per-asset upload intents.
7. Repeating the same sync creates no duplicates.

Deleting local data never deletes cloud records. Remote deletion is a separate confirmed operation outside Milestone 1.

### 8.4 Approval contract

Approve request:

```json
{
  "schema_version": 1,
  "binary_fingerprint": "sha256",
  "copy_fingerprint": "sha256",
  "decision": "approved",
  "note": "",
  "idempotency_key": "uuid"
}
```

The server verifies current fingerprints, destination policy, rights, and reviewer membership in one transaction. Batch approval rejects the entire invalid subset and returns `blocked_items`; it never changes flagship items.

## 9. Queue architecture and worker protocol

### 9.1 Queues

Logical queues:

- `cutout`
- `attributes`
- `crops`
- `mood`
- `render`
- `video`
- `publish`
- `metrics`
- `maintenance`

Queue payloads contain IDs, hashes, policy/model versions, and short-lived access intents. They never contain image bytes, credentials, or unbounded model prompts.

### 9.2 Job lifecycle

```text
queued -> claimed -> running -> complete
                 |          -> retry_wait -> queued
                 |          -> failed
                 |          -> blocked
                 -> lease_expired -> queued or failed
queued/running/retry_wait -> cancelled
```

Only valid transitions occur through database functions. Completion is accepted only from the active lease owner and only when the output hash and schema validate.

### 9.3 Worker protocol

The queue adapter exposes:

```python
class QueueClient(Protocol):
    def claim(self, queues: tuple[str, ...]) -> WorkerJob | None: ...
    def heartbeat(self, job: WorkerJob) -> None: ...
    def complete(self, job: WorkerJob, result: dict[str, Any]) -> None: ...
    def fail(self, job: WorkerJob, error: WorkerError) -> None: ...
```

Claim returns a lease ID, expiry, expected input hashes, allow-listed signed downloads, pre-authorized output keys, and pinned model policy. The worker:

1. Validates the job schema.
2. Rejects unexpected hosts, paths, MIME types, sizes, and hashes.
3. Downloads to a per-job temporary directory.
4. Starts heartbeat after successful validation.
5. Runs the selected handler with bounded resources.
6. Validates output dimensions, MIME, transparency, and hashes.
7. Uploads only to pre-authorized keys.
8. Completes with a structured result and QA report.
9. Deletes temporary inputs and outputs in `finally`.

### 9.4 Retry classification

| Class | Examples | Action |
|---|---|---|
| Validation | bad schema, wrong hash, unsupported MIME | fail permanently and alert |
| Policy | rights missing, flagship publish, stale approval | block permanently until operator change |
| Authentication | expired credential, revoked scope | block account, alert, no rapid retry |
| Rate limit | HTTP 429, provider quota | respect `Retry-After`, bounded retry |
| Transient network | timeout, 502/503 | exponential backoff with jitter |
| Resource | CUDA OOM, disk full | one lower-resource retry if declared safe, then manual queue |
| Model quality | failed QA score | fallback provider or manual edge review |
| Unknown | uncategorized exception | limited retry, redact and alert |

Default retry schedule: 30 seconds, 2 minutes, 10 minutes, 1 hour, then failed. Platform `Retry-After` overrides. Publish retries never regenerate copy or binary and always reuse the idempotency key.

### 9.5 Worker health

- `/healthz`: process is responsive; no dependency claims.
- `/readyz`: configuration valid, queue reachable when remote enabled, required disk space available, and requested runtime initialized.
- Health responses expose no secrets, storage paths, signed URLs, or model tokens.

## 10. Background removal implementation

No model becomes the production default before a private handbag benchmark.

### 10.1 Benchmark dataset manifest

Create `services/gpu-worker/benchmark/manifest.schema.json` and a local ignored manifest containing at least 50 representative images across:

- thin straps and chain handles;
- metallic and reflective hardware;
- dark bags on dark backgrounds;
- cream bags on light backgrounds;
- white stitching and fringe;
- transparent or perforated sections;
- structured, soft, and irregular silhouettes;
- shadows and contact points;
- cluttered and uniform backgrounds;
- phone JPEG and high-resolution camera sources.

Reference masks are human-reviewed. Private images and masks remain outside Git; the repository stores only schema, tooling, synthetic/public-safe fixtures, aggregate results, and license references.

### 10.2 Candidate adapters

Implement a common protocol:

```python
class CutoutProvider(Protocol):
    provider_id: str
    revision: str
    def cutout(self, image: ImageInput, options: CutoutOptions) -> CutoutResult: ...
```

Benchmark:

- BiRefNet high-resolution/matting candidate on the RTX 3080;
- a SAM-assisted repair/localization route if it materially improves hard edges;
- one approved commercial API fallback using downscoped credentials and explicit cost logging;
- the existing plain-background browser method as a baseline, not the production quality target.

Recheck repository/model licenses and commercial terms immediately before download or production approval. Record exact revision and artifact hash in `model_registry`.

### 10.3 Processing stages

1. Decode with pixel-count and decompression-bomb limits.
2. Apply EXIF orientation and convert to a known color space.
3. Preserve an immutable original; strip EXIF only from derivatives.
4. Generate bounded inference tiles or resized working image.
5. Run foreground prediction.
6. Refine alpha around straps, hardware, holes, stitching, and contact shadow.
7. Remove isolated mask islands using scale-aware thresholds.
8. Preserve soft shadow only when classified as intentional.
9. Produce full-resolution RGBA PNG or lossless WebP according to target support.
10. Produce mask, checkerboard preview, white preview, dark preview, and QA JSON.
11. Hash every output and record model revision, settings, duration, GPU seconds, and provenance.

### 10.4 Automated QA

`cutout-qa.v1` includes:

- foreground coverage ratio;
- bounding-box margin per edge;
- disconnected component count and area distribution;
- interior hole count;
- alpha edge width distribution;
- halo score on light and dark composites;
- transparent-edge clipping signal;
- chain/strap continuity signal where localization supports it;
- source/output dimension and hash checks;
- provider confidence and warnings.

Routing:

- `pass`: continue to crops.
- `review`: operator compares source, mask, dark preview, and light preview.
- `fallback`: run the configured secondary provider once.
- `fail`: block derivation and preserve diagnostics.

### 10.5 Benchmark acceptance

- At least 95% of representative bags pass without manual masking or meet a separately approved realistic threshold documented in the report.
- No regression on thin handles, chain gaps, or pale stitching versus the commercial reference set.
- Median local processing is under 60 seconds per bag on the target RTX 3080.
- Peak VRAM leaves a documented safety margin and CUDA OOM recovery is tested.
- Output hashes are deterministic for fixed runtime, revision, and settings where the model permits.
- License and commercial-use review is recorded before the production flag can be true.

## 11. Image processing and cutout library

### 11.1 Deterministic attributes first

Implement without a VLM:

- dominant and secondary palette in perceptual color space;
- neutral/warm/cool balance;
- cutout bounds and silhouette aspect;
- hardware highlight candidate regions;
- entropy/sharpness maps for crop ranking;
- background-safe contrast values;
- transparent margin and crop-safe zones.

### 11.2 VLM suggestions

After a local candidate benchmark, VLM output must validate against a strict schema:

```json
{
  "schema_version": 1,
  "suggestions": {
    "dominant_color": {"value": "cream", "confidence": 0.91},
    "material": [{"value": "canvas", "confidence": 0.72}],
    "hardware": [{"value": "silver-tone", "confidence": 0.84}],
    "style": [{"value": "structured pouch", "confidence": 0.68}],
    "season": [{"value": "trans-seasonal", "confidence": 0.54}],
    "vibe": [{"value": "archive editorial", "confidence": 0.79}]
  },
  "unknowns": ["exact material", "production year"]
}
```

Free text is not copied into product facts. The UI shows each suggestion, confidence, source image, extractor version, and confirm/reject controls. Confirmation creates a new facts version and audit event.

### 11.3 Derived cutout assets

For each accepted source, create linked derivatives:

- `hero`: full silhouette, padded, transparent;
- `shadow`: optional separately composited contact shadow;
- `mask`: grayscale alpha reference;
- `preview_light` and `preview_dark`;
- `macro_hardware`, `macro_corner`, `macro_texture`, and optional `macro_interior`;
- `feed_safe` and `vertical_safe` crop metadata, not destructive crops;
- thumbnail derivatives for the review queue.

Every derivative records parent asset, transformation name/version, parameters, source hash, output hash, and rights inheritance.

## 12. Mood, retrieval, and generative media

### 12.1 Source pools

Only three mood pools are publishable:

1. Owned photography.
2. Licensed media with stored proof and allowed-use metadata.
3. Generated abstract atmosphere with recorded model/workflow provenance.

Pinterest and other discovery sites are trend references, not pixel sources. Do not scrape or republish third-party imagery.

### 12.2 Retrieval

Index publishable mood assets by palette, luminance, texture tags, orientation, negative space, rights territory, expiry, and prior usage. Initial retrieval is deterministic weighted scoring; embeddings can be added only when they improve a labeled evaluation set.

### 12.3 ComfyUI contract

Store API-format workflows under `workflows/comfyui/`. A workflow declares:

- workflow ID and version;
- required model IDs/revisions;
- JSON input mapping;
- fixed/derived seed;
- allowed dimensions and batch size;
- output node mapping;
- maximum execution time;
- synthetic media classification;
- license and disclosure policy.

Generated atmosphere prompts prohibit brands, logos, identifiable people, and product objects. Failed output safety/quality checks block the asset.

### 12.4 Variant engine

Variants are deterministic from `run.seed + content_item.id + variant_index`. Allowed dimensions of variation:

- template treatment;
- crop focal point within safe bounds;
- palette/accent token;
- mood tile selection;
- typography scale within tested limits;
- copy hook lineage;
- slide order for supported carousels.

The engine cannot vary product facts, price, availability, rights, disclosure, or flagship policy.

## 13. Headless rendering and video

### 13.1 Renderer extraction

Do not rewrite the visual system. Extract the current browser renderer into `packages/render-core` in small steps:

1. Define `RenderRequest` containing template ID, dimensions, source asset refs, normalized facts, copy tokens, seed, and version fields.
2. Freeze the current 12-template by 2-format output as 24 golden fixtures using rights-safe test media.
3. Isolate geometry and text measurement from DOM controls.
4. Keep the PWA calling the same core so browser and worker share behavior.
5. Add a Playwright renderer worker that loads a pinned render page and captures exact-size outputs.
6. Compare geometry, safe areas, text overflow, and perceptual diff to the approved threshold.
7. Switch remote rendering on only after browser parity passes.

Required formats include 1080x1350 feed, 1080x1920 vertical, 1000x1500 Pinterest, configurable carousel slides, and archive-site responsive images.

### 13.2 Render result

Each result includes output hash, dimensions, MIME, template/version, font manifest, seed, source hashes, policy version, render runtime version, QA flags, and preview location.

### 13.3 Video worker

FFmpeg creates deterministic MP4/H.264 slideshow/reel output:

- explicit duration per scene;
- safe-area overlays validated before render;
- even pixel dimensions and broadly compatible pixel format;
- normalized audio only from owned/licensed sources;
- optional burned captions and separate subtitle file;
- no implicit network media fetch;
- command and tool version stored in the manifest.

Test with silent, narrated, and licensed-audio fixtures. If a platform requires upload-from-device or licensed in-app audio, export a draft pack instead of attempting unsupported automation.

## 14. Copy and prompt implementation

### 14.1 Deterministic copy core

Extract current fact rendering, copy banks, channel limits, banned language, scarcity rules, and lint into `packages/copy-core`. The browser and server import the same side-effect-free functions.

Inputs:

- confirmed fact object and facts version;
- destination register;
- surface and character limit;
- CTA type;
- hook/bank IDs;
- locale/spelling mode;
- policy and prompt versions.

Outputs:

- primary copy;
- optional title/alt text/slide strings;
- fact citations by source field;
- lint findings;
- hook/bank lineage;
- copy fingerprint.

### 14.2 Provider interface

Optional AI rewriting uses a replaceable provider adapter. It receives only the minimum confirmed facts and requested surface. Provider output is never trusted before schema validation, fact-diff validation, lint, and operator review where required.

```ts
interface CopyProvider {
  id: string;
  generate(request: CopyRequest): Promise<CopyCandidate[]>;
}
```

### 14.3 Canonical system prompt template

Store versioned prompts under `config/prompts/`. The system contract must include:

```text
You write for RareBagClub using only CONFIRMED_FACTS.
Never infer authentication, provenance, condition, year, price, availability,
scarcity, buyers, demand, or urgency. Unknown means omitted.
Do not claim that generated media depicts the actual product.
Use one CTA from ALLOWED_CTA. Respect DESTINATION_REGISTER and LIMITS.
Avoid banned phrases and em dashes. Return JSON matching OUTPUT_SCHEMA only.
If the request cannot be completed without invention, return blocked_reason.
```

User payload sections:

- `CONFIRMED_FACTS`
- `PROHIBITED_CLAIMS`
- `DESTINATION_REGISTER`
- `SURFACE`
- `ALLOWED_CTA`
- `DISCLOSURE_REQUIREMENTS`
- `LIMITS`
- `OUTPUT_SCHEMA`

### 14.4 Surface rules

- Flagship: draft only, private-dealer tone, manual final copy.
- Education satellite: factual, save-oriented, no authentication implication beyond confirmed fields.
- Aesthetic satellite: restrained, product remains secondary to visual study.
- Pinterest: descriptive search title, natural keywords, destination URL, alt text.
- TikTok/Reels: one immediate on-screen hook, short caption, export fallback if direct post is unavailable.
- Threads/X: concise conversational record, platform length validation.
- Telegram: clear availability state and direct operator contact without fabricated urgency.
- Blog: structured archive record with canonical URL, metadata, schema markup, and enquiry CTA.
- Email: draft only until the operator approves the send and audience.

### 14.5 Copy evaluation

Tests must catch:

- every invented or changed fact;
- banned scarcity and unverifiable superlatives;
- more than one CTA;
- character-limit overflow;
- missing synthetic disclosure;
- broken destination register;
- stale copy approval after facts change;
- nondeterministic output when provider mode is off.

## 15. Review queue and operator UX

The remote queue is additive to the local studio.

Required views:

- campaign/run progress with partial failure states;
- filter by destination, platform, campaign, status, and QA warning;
- source, cutout, light/dark previews, and final asset side by side;
- final copy, facts used, rights status, provenance, and disclosures;
- approve, reject, request changes, rerun selected stage, and download fallback;
- batch-select satellites only;
- immutable flagship badge explaining manual-only behavior;
- stale approval warning when either fingerprint changes;
- schedule preview in operator time zone and platform time zone;
- accessible keyboard and phone interaction.

Batch approval server behavior:

1. Validate all requested IDs belong to the organization.
2. Partition flagship and non-flagship items.
3. Validate rights, final fingerprints, QA, and disclosures.
4. Approve valid non-flagship items transactionally.
5. Return blocked items with explicit reason codes.
6. Never update a flagship item through batch approval.

## 16. Publishing rail

### 16.1 Adapter interface

```ts
interface PublisherAdapter {
  platform: string;
  capabilities(account: SocialAccount): Promise<CapabilitySet>;
  validate(input: PublishInput): Promise<ValidationResult>;
  publish(input: PublishInput, context: PublishContext): Promise<PublishResult>;
  status(remoteId: string, context: PublishContext): Promise<RemoteStatus>;
  metrics(remoteId: string, context: PublishContext): Promise<MetricSnapshot>;
}
```

Adapters receive resolved credentials at execution time, not token strings from database payloads.

### 16.2 Shared preflight

Before any platform call:

1. Kill switch and account enabled state pass.
2. Destination exists and is not flagship/manual-only.
3. Current binary and copy fingerprints match approval.
4. Rights are confirmed, unexpired, territorial use permits destination, and proof exists where required.
5. QA status is pass or explicit reviewer override with audit.
6. Disclosure rules are satisfied.
7. Platform capability and media validation pass.
8. Schedule/cadence cap and rate budget permit execution.
9. Idempotency key has no successful publication.

Preflight failure blocks without consuming an API call.

### 16.3 Rollout order

1. Pinterest sandbox and archive-site publish rail.
2. Meta satellite accounts after app/scopes review.
3. Threads where the official capability is available for the authorized account.
4. TikTok draft/direct post only within approved Content Posting capabilities.
5. Telegram bot/channel publishing with least-privilege bot administration.
6. X only after current access tier, cost, and rate budget are approved.
7. Google Business only for an eligible, authorized location and current supported API behavior.
8. Lemon8/Rednote remain export/manual until an official suitable API exists and is approved.

Revalidate official API documentation, scopes, review requirements, media limits, disclosure controls, rate limits, pricing, and terms immediately before implementing each adapter.

### 16.4 Scheduling and kill switches

- Store UTC execution time plus original IANA time zone and local wall time.
- Detect daylight-saving ambiguities and require explicit resolution.
- Per-account daily caps and minimum spacing are configuration, not workflow literals.
- Global, platform, account, and campaign kill switches are checked at claim and immediately before publish.
- Disabling a switch cancels future claims but preserves audit and downloadable manual packs.

## 17. n8n workflows

Workflow JSON is versioned under `workflows/n8n/`; credentials are not exported.

### 17.1 `publish-due-content`

Schedule trigger -> claim due publish job -> server-side preflight -> resolve adapter -> publish/status -> complete or classify failure -> emit audit/alert.

### 17.2 `token-refresh`

Scheduled trigger -> find credentials nearing expiry -> adapter refresh -> store new encrypted reference/metadata -> health check -> alert on revoked scope.

### 17.3 `ingest-metrics`

Scheduled at 1h, 24h, 7d, and 30d cohorts -> fetch within rate budget -> normalize without pretending platform metrics are equivalent -> upsert observation -> update aggregate materialized views.

### 17.4 `failure-alert`

Consume terminal/blocked events -> redact -> deduplicate by incident fingerprint -> notify the configured operator channel -> include runbook link and retry/manual-export action.

### 17.5 Workflow rules

- Webhooks validate a rotating HMAC secret or provider signature.
- Nodes pass entity IDs and request IDs, not binary blobs.
- Business-policy decisions call tested code/database functions.
- Every external call sets timeout and has an explicit error branch.
- Workflow tests use mocked providers and scrubbed fixtures.

## 18. Archive site and discovery rail

The archive site is an owned search surface, not an operational admin app.

Per approved piece, publish:

- canonical archive URL;
- title, description, Open Graph/Twitter metadata;
- responsive approved images and alt text;
- confirmed product facts and disclosure/provenance summary;
- availability derived from inventory status;
- enquiry CTA;
- appropriate structured data without unsupported claims;
- internal links by maison, era, material, and style where confirmed;
- sitemap entry and robots behavior.

Draft preview and production publish use separate environments. Unpublishing removes public projection but retains audit and private records. Generated articles pass the same fact-diff and approval system as social copy.

## 19. Analytics and feedback loop

### 19.1 Normalized observations

Store raw provider semantics and normalized fields separately. A view is not silently equated to an impression, reach, or video play across platforms.

Attribution dimensions:

- organization, campaign, piece;
- destination/account/platform;
- template and version;
- format and variant seed;
- hook/bank lineage;
- CTA and destination URL;
- synthetic media flag;
- source channel captured manually for DMs when APIs cannot provide it.

### 19.2 Dashboard

Initial views:

- qualified DM enquiries per listed piece per week;
- operator minutes per campaign;
- factory cost and failure rate per asset;
- cutout pass/review/fallback rate;
- approval throughput and stale approval count;
- publish success/retry/block rate by adapter;
- saves, outbound clicks, and follow conversion where available;
- flagship and satellite cohorts shown separately;
- template/hook leaderboards with minimum sample thresholds.

### 19.3 Recommendations

Recommendations are reviewable suggestions. They may change future candidate ranking after operator approval; they cannot rewrite facts, weaken policy, silently change cadence, or autonomously alter flagship strategy.

## 20. Local development and Docker

### 20.1 Supported workstation path

Preferred Windows setup:

- PWA and JavaScript tests in PowerShell;
- Python worker in a dedicated virtual environment or WSL2 when CUDA packaging is more reliable;
- Docker Desktop/WSL2 for local Supabase and n8n;
- NVIDIA driver/toolkit versions recorded in the benchmark report;
- model cache on a dedicated local path excluded from Git and backups as appropriate.

Baseline commands:

```powershell
npm ci
npm run verify:config
npm run test:milestone0
npm run test:e2e
python -m pip install -e "services/gpu-worker[dev]"
python -m pytest services/gpu-worker/tests
```

Milestone 1 adds documented Supabase CLI commands only after the CLI/project choice is approved.

### 20.2 Compose services

`infra/docker/compose.yml` will eventually define:

- `gpu-worker` with outbound-only network access and GPU reservation;
- `n8n` with Postgres-backed state and encrypted credentials;
- optional `comfyui` on an internal network;
- optional `publisher` service;
- named volumes for model cache and n8n state;
- health checks, resource limits, restart policy, and log rotation.

Do not duplicate a full local Supabase stack in Compose if the Supabase CLI already owns it. Do not expose ComfyUI, worker admin, database, or n8n publicly by default.

### 20.3 Cloud GPU image

Create `Dockerfile.cloud` only after the local benchmark selects a runtime. Pin base image digest, CUDA/PyTorch/model revisions, system packages, and Python lock. Run as non-root where the runtime supports it. The cloud worker implements the same queue/storage contracts as the workstation.

## 21. Deployment environments

| Environment | Purpose | Data rule | External posting |
|---|---|---|---|
| Local | Development and private model benchmark | synthetic or operator-controlled | mocked only |
| Preview | Netlify PR and contract review | synthetic fixtures | disabled |
| Staging | Auth/RLS/integration and platform sandboxes | dedicated test records | sandbox/test accounts only |
| Production | Approved business operation | rights-cleared inventory | approved non-flagship only |

Deployment order:

1. CI validates migrations, contracts, policy, worker, and browser.
2. Apply database migration to staging with backup/restore evidence.
3. Deploy services with remote/publisher kill switches off.
4. Run smoke tests and synthetic job.
5. Enable one internal organization/account.
6. Observe through the defined soak period.
7. Promote with operator approval.
8. Retain manual export and disable path.

Netlify deployment remains independent: a backend failure must not prevent loading the local studio.

## 22. Security and privacy implementation

### 22.1 Required controls

- Least-privilege RLS and separate worker/publisher credentials.
- Secret scanning and dependency review in CI.
- Short-lived signed URLs with server-selected storage keys.
- File signature, MIME, size, dimension, and decompression checks.
- EXIF/GPS removal from public derivatives.
- TLS for every non-local request.
- Strict CSP and no secret-bearing inline configuration in the PWA.
- OAuth state/PKCE where the provider supports/requires it.
- Webhook signature verification, timestamp tolerance, and replay table.
- Audit append-only permissions and redacted structured logging.
- Backup restore test before production migrations.
- Account/global kill switches documented and tested quarterly.

### 22.2 Threat cases that require tests

- guessed organization or asset IDs;
- forged membership/role claims;
- signed URL reuse after expiry;
- path traversal in filenames/storage keys;
- image decompression bombs and malformed files;
- arbitrary worker download URLs;
- stale approval race during publish;
- duplicate webhook and duplicate publish delivery;
- token leakage through error bodies/logs;
- malicious model output trying to create facts or markup;
- n8n workflow edit attempting to bypass flagship policy.

### 22.3 Data retention

Define retention before production:

- originals and rights proofs follow inventory/legal policy;
- worker temporary files are deleted after each job;
- signed URLs are never persisted in audit;
- raw provider responses are minimized, restricted, and expired;
- deleted accounts revoke tokens before metadata cleanup;
- audit retention is longer than operational logs;
- model prompts/responses containing private inventory are retained only when required for evaluation and with access controls.

## 23. Observability, failure handling, and operations

### 23.1 Structured event fields

Every service logs JSON with:

- timestamp, level, service, environment, version;
- request ID, trace ID, organization ID where safe;
- job/run/content/publish IDs;
- event name, state transition, duration;
- adapter/model/prompt/template/policy version;
- outcome, retry count, error class;
- GPU seconds and estimated cost where applicable.

Never log tokens, authorization headers, signed URLs, private image bytes, full provider payloads, or unredacted operator notes.

### 23.2 Initial alerts

- queue age exceeds threshold;
- worker heartbeat absent;
- cutout QA failure/fallback spike;
- repeated CUDA OOM or disk pressure;
- publish terminal failures or auth revocation;
- token expiry within configured window;
- storage/database quota threshold;
- RLS/security test regression;
- attempted flagship auto-publish;
- daily cost cap reached.

An attempted flagship auto-publish is a high-severity policy incident even if blocked successfully.

### 23.3 Runbooks

Create under `docs/runbooks/`:

- `remote-disable.md`
- `worker-offline.md`
- `queue-backlog.md`
- `cutout-quality-regression.md`
- `publisher-auth-expired.md`
- `duplicate-publication.md`
- `flagship-policy-alert.md`
- `storage-recovery.md`
- `database-restore.md`

Each runbook includes detection, immediate containment, evidence to preserve, safe retry, manual fallback, escalation, and closure validation.

## 24. Rate limits and cost control

- Capability records include current account permissions and validated media limits.
- Adapter rate budgets are token buckets keyed by account and endpoint family.
- Honor provider headers and `Retry-After`; do not guess around hard limits.
- Batch metrics requests where officially supported.
- Cache immutable media metadata and remote status for bounded periods.
- Enforce daily platform calls, AI provider spend, cloud GPU minutes, storage growth, and generation counts.
- Exceeding a budget pauses the relevant optional rail and alerts; it does not weaken quality or rights checks.
- Record estimated and actual cost per job/content item where providers expose it.

## 25. CI/CD and testing

### 25.1 Pull-request gates

The Windows CI workflow must eventually run:

1. Dependency installation from lockfiles.
2. JavaScript syntax/lint and existing unit tests.
3. Contract/schema validation and fixture reproducibility.
4. Destination-policy and flagship negative tests.
5. Python Ruff, type checks when introduced, and pytest.
6. Supabase migration reset, schema lint, RLS role matrix, and generated type drift.
7. Service integration tests with local Supabase and mocked providers.
8. Browser E2E in remote-off mode.
9. Browser E2E in remote-on/local-Supabase mode.
10. Golden render comparison.
11. Secret scan, dependency audit, and container scan when images exist.

### 25.2 Test layers

#### Unit

- policy, rights, approval, state transition, scarcity, CTA, copy lint;
- canonical hashing and idempotency;
- crop math, palette math, QA scores;
- adapter request validation and retry classification.

#### Contract

- every JSON schema fixture;
- browser/server/worker round-trip compatibility;
- OpenAPI drift;
- n8n webhook and publisher adapter fixtures.

#### Integration

- migration from empty database;
- RLS role matrix and storage policies;
- sync idempotency;
- queue lease, expiry, heartbeat, and duplicate completion;
- signed upload/download boundaries;
- mocked official API success/rate/auth/duplicate cases.

#### Visual and model evaluation

- 24 approved template-format golden renders;
- text overflow and safe-area tests;
- private cutout benchmark with aggregate checked-in report;
- VLM fact-protection evaluation;
- deterministic FFmpeg fixture hashes where runtime permits.

#### End to end

- local-only 31-asset flow remains green;
- login, explicit sync, remote queue, review, schedule in staging;
- synthetic worker job from enqueue to stored derivative;
- approved satellite sandbox publish and metric observation;
- flagship schedule/publish attempt blocked at every layer;
- remote outage falls back to local studio/export.

### 25.3 Release discipline

- Semantic application versions and explicit contract/policy/template/prompt/model versions.
- Database migrations are forward-only after shared deployment.
- Release notes name flags enabled and external accounts affected.
- A release cannot silently enable remote sync, model downloads, or publishing.
- Rollback instructions are written before production enablement.

## 26. Scalability plan

| Scale | Architecture | Worker/queue change | Operations focus |
|---|---|---|---|
| Up to 100 bags | Netlify + managed Supabase + one RTX worker | one job at a time; local model cache | quality benchmark, reliable review |
| 100-500 bags | same control plane | priority queues and 2-3 handler slots where VRAM permits | backlog, storage lifecycle, approval throughput |
| 500-1,000 bags | add cloud worker adapter for bursts | autoscaled compatible workers; queue partition by job class | cost attribution, DB indexes, retry storms |
| 10,000 content items/month | separate publisher/render capacity; CDN/object adapter if justified | concurrency budgets, fair organization scheduling | SLOs, load tests, partition/retention decisions |

Do not prebuild the last stage. Promote architecture only when metrics show sustained queue delay, database load, storage cost, or operational risk.

## 27. Milestone execution plan

Only one milestone is active at a time. Each milestone ends with a stop gate and evidence entry.

### Milestone 0 - Architecture spine and no-regression contract

Status: Complete in RBC Studio 6.12.1 on 2026-07-19.

- [x] Add ADRs for control plane, queue, worker, renderer, and publisher policy.
- [x] Add versioned contract schemas and deterministic fixtures.
- [x] Extract shared destination policy without changing browser APIs.
- [x] Add remote-off configuration and zero-network verification.
- [x] Add `.env.example`, secret/file exclusions, and validation.
- [x] Add Python worker health/config/logging/queue/no-op spine.
- [x] Add Windows CI foundation workflow.
- [x] Preserve existing unit and Edge browser E2E behavior.

Evidence:

- `npm run verify:config` passes.
- `npm run test:milestone0` passes.
- Six Python worker tests pass.
- Deterministic fixture hashes remain stable after regeneration.
- `npm run test:e2e` passes the existing 31-asset flow.

Rollback: remote remains disabled and the PWA uses existing local behavior.

### Milestone 1 - Supabase control plane and explicit migration bridge

Status: Local M1.1 complete. M1.2-M1.6 are authored but remain unchecked until
PostgreSQL parses them and the runtime RLS/storage tests pass. CLI/container use,
project linking, and every shared apply remain operator-gated.

Prerequisites:

- staging project/region and ownership confirmed;
- allowed authentication method confirmed;
- Supabase CLI installation/project linking authorized;
- backup, spend/quota notification, and secret storage approach agreed;
- remote publishing remains disabled.

Implementation tasks:

- [x] M1.1 Add `infra/supabase/config.toml`, migration layout, synthetic seed, offline validation, pgTAP smoke plan, and documented local test commands.
- [ ] M1.2 Implement extensions, enums, identity, membership, pieces, campaigns, assets, and rights migrations. Locally authored; runtime verification pending.
- [ ] M1.3 Implement factory, content, approval, destination, account, job, audit, and metrics migrations. Locally authored; runtime verification pending.
- [ ] M1.4 Add timestamp/version/audit triggers and flagship/approval constraints. Locally authored and statically checked; runtime verification pending.
- [ ] M1.5 Enable/force RLS and implement the complete role matrix. Locally authored; negative runtime suite pending.
- [ ] M1.6 Add private buckets, signed upload intents, hash verification, and storage policy tests. Bucket/RLS/RPC scaffold authored; signed-intent service and runtime tests pending.
- [ ] M1.7 Generate database types and add drift check.
- [ ] M1.8 Add browser authentication behind `RBC_REMOTE_FACTORY`.
- [ ] M1.9 Implement local, remote, and hybrid repository adapters.
- [ ] M1.10 Implement explicit one-way idempotent campaign sync and stable local/remote ID mapping.
- [ ] M1.11 Add read-only remote queue/run view; do not replace local review yet.
- [ ] M1.12 Add remote-on integration and browser E2E against local/staging Supabase.
- [ ] M1.13 Add remote-disable and database-restore runbooks.

Acceptance:

- authenticated owner can explicitly sync and view one campaign from a phone;
- repeated sync creates no duplicate piece, campaign, source, or rights rows;
- unauthorized/cross-organization reads and storage access fail;
- local deletion does not delete remote originals;
- remote-off makes zero network calls and existing export remains green;
- flagship constraints fail in SQL and API tests;
- no publisher, external model, or unattended posting is enabled.

Rollback: set `RBC_REMOTE_FACTORY=false`; preserve remote records; do not issue destructive cleanup automatically.

Stop gate: obtain operator review of staging data, RLS evidence, and sync UX before Milestone 2.

### Milestone 2 - Cutout benchmark and durable GPU worker

Status: Local worker/benchmark infrastructure implemented on 2026-07-22 after
explicit operator direction. Production remains gated by the corrected Milestone
1 runtime evidence, private benchmark, model/license/download approval, and RTX
3080 measurements.

- [x] M2.1 Add private benchmark manifest tooling and rights-safe checked-in fixtures. Three synthetic fixtures verify the harness; private 100-image data remains outside Git.
- [x] M2.2 Implement Supabase outbound claim, lease, heartbeat, complete, fail, and cancellation. Forward migration authored; staging apply/runtime test pending.
- [x] M2.3 Implement signed storage download/upload with host/path/hash restrictions. Offline policy/rejection tests pass.
- [x] M2.4 Add per-job temp isolation, cleanup, resource limits, and graceful shutdown.
- [x] M2.5 Implement BiRefNet adapter with exact revision/model registry checks. Adapter is fail-closed; approved revision/artifact/runner remain absent.
- [x] M2.6 Implement alpha refinement and cutout QA report. Learned-model quality remains unmeasured.
- [ ] M2.7 Implement optional SAM-assisted repair evaluation.
- [ ] M2.8 Implement one approved commercial fallback adapter with cost/redaction tests.
- [x] M2.9 Add manual edge-review route and rerun/fallback control. Browser endpoint responses fail to manual review unless explicit governed QA headers are present.
- [ ] M2.10 Publish aggregate benchmark report and select the production provider.
- [ ] M2.11 Add Docker/cloud image only after the local runtime is pinned.

Acceptance:

- benchmark gate in Section 10.5 passes or the operator explicitly accepts a documented threshold;
- duplicate claims/completions cannot create duplicate assets;
- killed workers recover after lease expiry;
- failures leave source assets intact and route visibly;
- worker has no inbound public dependency;
- production model is pinned, licensed, evaluated, and kill-switchable.

Rollback: disable cutout queue/model, retain browser cutout/export and manual PhotoRoom handoff.

### Milestone 3 - Attribute suggestions and cutout library

Status: Deferred until Milestone 2.

- [ ] M3.1 Implement deterministic palette, geometry, focus, and crop-safe metadata.
- [ ] M3.2 Build labeled attribute evaluation fixtures.
- [ ] M3.3 Benchmark quantized local multimodal candidates within RTX 3080 constraints.
- [ ] M3.4 Add strict suggestion schema and fact-diff guard.
- [ ] M3.5 Add operator confirm/reject UX and facts-version audit.
- [ ] M3.6 Generate hero, mask, shadow, previews, macros, and thumbnail derivatives.
- [ ] M3.7 Implement mood-pool rights filtering and deterministic retrieval.
- [ ] M3.8 Add optional abstract-atmosphere ComfyUI workflow contract.

Acceptance:

- suggestions never write product facts without confirmation;
- every derivative has lineage, hash, rights inheritance, and QA;
- crop/macro selection meets the approved labeled set;
- generated atmosphere contains no product/logo/person and records disclosure metadata.

Rollback: disable VLM/generation; deterministic CV and human facts remain usable.

### Milestone 4 - Headless 31-asset factory

Status: Deferred until Milestone 3.

- [ ] M4.1 Extract deterministic copy core and browser compatibility adapter.
- [ ] M4.2 Define render contracts and freeze 24 current golden outputs.
- [ ] M4.3 Extract renderer geometry without redesigning templates.
- [ ] M4.4 Add Playwright render worker and exact-size outputs.
- [ ] M4.5 Add seeded variant engine and visual QA.
- [ ] M4.6 Add FFmpeg slideshow/reel builder and media manifests.
- [ ] M4.7 Add optional copy-provider interface, prompts, fact protection, and eval harness.
- [ ] M4.8 Persist final binaries, copy, versions, fingerprints, and derivation graph.
- [ ] M4.9 Replace read-only queue with fingerprinted remote review actions.
- [ ] M4.10 Verify 31-asset local/remote parity and partial rerun behavior.

Acceptance:

- one run produces the governed 31-asset contract with traceable versions;
- all 24 existing template-format goldens pass approved visual thresholds;
- fixed inputs/versions/seeds produce stable plans and copy;
- edits invalidate approval;
- flagship assets remain item-by-item manual and never auto-publish eligible;
- failed stages can rerun without regenerating successful unrelated assets.

Rollback: remote renderer/copy flags off; PWA canvas and export remain the fallback.

### Milestone 5 - Pinterest and archive-site production rail

Status: Gated by official Pinterest app authorization and production-domain choices.

- [ ] M5.1 Implement shared publisher preflight, idempotency, scheduler, and kill switches.
- [ ] M5.2 Implement Pinterest capability, validation, sandbox publish, status, and metrics adapter.
- [ ] M5.3 Preserve CSV/manual Pinterest fallback.
- [ ] M5.4 Build archive-site content schema, preview, static generation, and publish projection.
- [ ] M5.5 Add canonical URLs, sitemap, structured data, responsive assets, and internal links.
- [ ] M5.6 Add n8n due-publish, refresh, metrics, and failure workflows.
- [ ] M5.7 Add rate budgets, retry behavior, alerts, and manual recovery runbooks.
- [ ] M5.8 Run a staging soak with test/sandbox destinations.

Acceptance:

- approved Pinterest content publishes once despite duplicate delivery;
- archive record contains only confirmed facts and approved assets;
- rights, stale approval, disclosure, kill switch, and flagship violations block before API calls;
- CSV/HTML/ZIP fallbacks remain available;
- adapter auth/rate failures are visible and recoverable.

Rollback: platform/account kill switch off; retain scheduled records and manual packs.

### Milestone 6 - Satellite platform adapters

Status: Gated independently per platform/account.

- [ ] M6.1 Record current official capabilities, scopes, limits, review status, and terms per account.
- [ ] M6.2 Implement Meta satellite publishing after app review.
- [ ] M6.3 Implement Threads adapter where authorized.
- [ ] M6.4 Implement TikTok draft/direct-post path according to approved capability.
- [ ] M6.5 Implement Telegram channel bot adapter.
- [ ] M6.6 Evaluate X access cost/capability before implementation.
- [ ] M6.7 Evaluate Google Business eligibility and current API support.
- [ ] M6.8 Keep unsupported platforms as validated export packs.
- [ ] M6.9 Add per-account calendar, cadence caps, health, and kill switches.
- [ ] M6.10 Require two weeks of reviewed queued content before launching a satellite.

Acceptance:

- each adapter passes official sandbox/test-account evidence;
- one account failure cannot block other platforms or the local studio;
- capability changes fail closed;
- satellite bio/disclosure and one-CTA policy are checked;
- flagship direct publishing remains impossible.

Rollback: disable the individual adapter/account and continue manual export.

### Milestone 7 - Analytics feedback loop

Status: Deferred until stable publications exist.

- [ ] M7.1 Ingest supported 1h/24h/7d/30d observations idempotently.
- [ ] M7.2 Preserve platform-specific metric meaning and raw restricted metadata.
- [ ] M7.3 Add campaign/destination/template/hook attribution.
- [ ] M7.4 Add manual DM-source capture.
- [ ] M7.5 Build operational and growth dashboards.
- [ ] M7.6 Add cohort-aware leaderboards and minimum sample thresholds.
- [ ] M7.7 Generate operator-reviewed recommendations only.

Acceptance:

- repeated ingest creates no duplicate observations;
- missing platform metrics remain null, not zero or fabricated;
- flagship and satellites are never blended invisibly;
- recommendation dismissal/approval is audited;
- analytics cannot autonomously change facts, policy, or publishing state.

Rollback: stop metric workflows; publications and manual reporting remain intact.

### Milestone 8 - Disclosed virtual archivist (optional)

Status: Gated by business approval, identity bible, rights, model-license review, and platform policy recheck.

- [ ] M8.1 Create identity bible, disclosure language, allowed content pillars, and kill switch.
- [ ] M8.2 Create rights-cleared seed set and consent/provenance records.
- [ ] M8.3 Evaluate identity training method and commercial license.
- [ ] M8.4 Benchmark consistency across at least 20 curated outputs.
- [ ] M8.5 Composite only real product cutouts; prohibit generated product pixels.
- [ ] M8.6 Add platform AI disclosure controls and manifest fields.
- [ ] M8.7 Add separate review queue/calendar and global disable.

Acceptance:

- persona is clearly disclosed and visually consistent;
- no real person's likeness is used without documented rights;
- actual bags use source-photo pixels and linked provenance;
- facts remain operator-confirmed;
- disabling the persona has no effect on flagship or core factory operation.

Rollback: retire/disable the persona destination and preserve core assets.

## 28. Immediate next work packet: Milestone 1

Local status (2026-07-22): step 1 is complete and steps 2-4 have an offline
scaffold, but PostgreSQL has not parsed or executed it. The next action is an
authorized **local-only** Supabase start/reset/lint/pgTAP run. Do not link a
project during that action.

Do not begin external setup until the operator supplies or authorizes:

- Supabase staging project or permission to create one;
- chosen region and data-residency preference;
- owner authentication method;
- approved secret storage for local worker/n8n;
- permission to install and run the Supabase CLI plus a Docker-compatible local
  runtime; project linking is a later, separate authorization;
- confirmation that only synthetic/test data is used until RLS tests pass.

Milestone 1 continues in this exact order:

1. [x] Add local Supabase scaffold and migration-test scripts without connecting the PWA.
2. [ ] Parse and test the authored tenant, inventory, campaign, asset, and rights schema locally.
3. [ ] Parse and test the authored content/review/job/audit schema and database invariants locally.
4. [ ] Execute the RLS and storage policy matrix locally; prove negative cases first.
5. Generate shared types/contracts and add CI drift gates.
6. Add browser auth and remote repository behind the default-off flag.
7. Implement explicit idempotent sync with a dry-run summary.
8. Add read-only remote queue/run view.
9. Run local/staging integration and phone viewport E2E.
10. Record evidence and stop for operator review.

The first Milestone 1 change must not add model downloads, GPU inference, n8n, platform tokens, or production publishing.

## 29. Definition of done for the ecosystem

The full program is complete only when:

- a rights-cleared bag can be submitted from phone or workstation;
- the RTX/cloud-compatible worker creates a benchmarked cutout, crops, attributes, and QA without manual file shuffling;
- the system produces versioned, traceable multi-platform assets and copy;
- one bag reliably yields the agreed governed content set;
- the operator can review a week of output in under 30 minutes;
- approved non-flagship content publishes through official interfaces with idempotency and observable retries;
- the flagship remains manual under code, database, workflow, and adversarial tests;
- archive pages and metrics create a measurable discovery/learning loop;
- rights, facts, AI disclosures, and actual-product provenance remain inspectable;
- disabling cloud, GPU, AI, n8n, or a platform still leaves a useful local studio and export workflow;
- backup restoration and incident runbooks have been exercised, not merely written.

## 30. Original deliverable traceability

| Original technical request | Implementation section |
|---|---|
| Overall architecture and decisions | Sections 3 and 4 |
| Folder structure | Section 4 |
| Database schema | Section 7 |
| API specifications | Section 8 |
| Queue architecture | Section 9 |
| Worker services | Sections 9-13 |
| Background removal | Section 10 |
| Image processing | Section 11 |
| AI generation | Sections 12 and 14 |
| Prompt templates | Section 14 |
| Configuration and environment | Section 6 |
| Docker and local development | Section 20 |
| CI/CD and deployment | Sections 21 and 25 |
| Monitoring and logging | Section 23 |
| Error handling and retry | Sections 5 and 9 |
| Rate limiting and cost | Section 24 |
| Security | Section 22 |
| Scalability | Section 26 |
| Testing | Section 25 |
| Tech stack decisions | Section 3 |
| Build order, milestones, checklist | Sections 27 and 28 |

## 31. Execution log

### 2026-07-19 - Milestone 0

- Application version: 6.12.1.
- Contracts, shared policy, default-off remote boundary, worker spine, ADRs, exclusions, and CI foundation added.
- Existing unit tests passed.
- Foundation and configuration verification passed.
- Six Python worker tests passed.
- Deterministic 31-asset fixtures regenerated without hash drift.
- Full Edge browser E2E passed.
- No database, credentials, model download, Docker service, external publisher, or production state was enabled.

### 2026-07-22 - Milestone 1 local scaffold hardening (NOT APPLIED)

- Completed M1.1 locally with `config.toml`, deterministic synthetic `seed.sql`,
  and a 17-assertion pgTAP smoke plan.
- Audited Claude's 12 migrations before first apply and repaired tenant-boundary,
  flagship scheduling, approval fingerprint, immutable-source, storage-role, and
  `SECURITY DEFINER` privilege gaps.
- Added 17 same-organization relationship constraints and a join-table tenant guard.
- Aligned approval/publish database states with versioned JSON contracts.
- Strengthened `verify:migrations` from presence checks to semantic negative
  assertions for RLS, storage, RPC grants, tenant keys, invariants, and contract drift.
- `npm run test:milestone1` passes unit, foundation, six worker tests, and migration checks.
- Full Edge browser E2E passes the unchanged local 31-asset generation/export/reload flow.
- Supabase CLI, PostgreSQL, and a container runtime are absent; SQL parsing,
  pgTAP execution, and live RLS/storage behavior remain unverified and gated.
- No credentials, new CLI link, database connection, PWA remote connection,
  model, GPU inference, publisher, or production state was enabled by this work.
- The Claude/operator handoff reports a staging apply and nine passing RLS checks,
  and ignored `.temp` metadata confirms a project was linked before this pass.
  The committed test used for that claim contained an invalid UUID, a missing
  required campaign, and the wrong JWT claim setting; the corrected checked-in
  gate must be rerun before M1.5 is marked complete.

### 2026-07-22 - Milestone 2 local cutout and durable-worker foundation

- Added atomic claim, lease, heartbeat, cancellation, retry, completion, and
  expired-lease recovery behavior, plus a forward-only service-role RPC migration.
- Added outbound-only signed-storage transfer controls, source/output hash checks,
  per-job temporary isolation, cleanup, byte/pixel limits, and graceful shutdown.
- Added a fail-closed BiRefNet adapter and model registry. No revision, weight,
  runner, license evidence, or production activation is silently assumed.
- Added alpha refinement, deterministic QA artifacts, manual-review routing,
  retry/cancel/local-fallback browser controls, and preservation of source assets.
- Added a rights-safe synthetic benchmark harness and three checked-in fixtures.
  These validate the harness only; they do not satisfy the private production gate.
- Sixteen worker tests, repository-wide Milestone 2 checks, contract reproducibility,
  lint, and the browser E2E must remain green in CI.
- Production remains blocked on the corrected staging RLS rerun, the private
  100-image benchmark, exact model/license approval, RTX 3080 measurements,
  fallback/SAM comparisons, and operator provider selection.

### Next entry

Record the authorized staging application/runtime evidence for the worker-leases
migration and the private benchmark aggregate. Never record private images,
signed URLs, secrets, or unapproved model artifacts in Git.
