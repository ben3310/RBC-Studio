# RBC Content Factory - Technical Continuation Plan

> Document role: architecture research and preserved working draft. The canonical executable build contract is `CODEX_IMPLEMENTATION.md`.

Version: 1.0  
Date: 2026-07-19  
Owner: RareBagClub  
Strategy source: `CLAUDE_PLAN.md`  
Shipped baseline: RBC Studio 6.12.1; Milestone 0 evidence is recorded in `CODEX_IMPLEMENTATION.md`

## 0. Purpose and execution rule

This is the architecture research and continuation draft for the RBC automation ecosystem. The canonical executable contract now lives in `CODEX_IMPLEMENTATION.md`. Both documents start from the working 6.12.1 local-first studio and do not replace the current app, redesign its templates, or discard its local/offline workflow.

Codex should execute `CODEX_IMPLEMENTATION.md` milestone by milestone and use this document for rationale and deferred alternatives. A milestone is complete only when its acceptance tests pass and the existing unit and browser suites remain green. External publishing is never represented as working until the relevant official app, scopes, account authorization, sandbox test, and production review are complete.

The document set has distinct roles:

- `CLAUDE_PLAN.md`: business, brand, growth, channel, and operating doctrine.
- `CODEX_IMPLEMENTATION.md`: canonical executable implementation plan, build order, acceptance gates, and execution log.
- `CODEXPLAN.md`: architecture rationale, technical research, alternatives, and the preserved continuation draft.

### 0.1 Original technical deliverables coverage

| Requested deliverable | Location in this plan |
|---|---|
| Overall system architecture and tech decisions | Sections 3 and 23 |
| Folder structure | Section 4 |
| Database schema and RLS | Section 5 |
| API specifications | Section 6 |
| Queue architecture, workers, retry, and error handling | Sections 7 and 15 |
| Background removal and image processing | Sections 8 and 9 |
| AI generation, prompts, and configuration | Sections 10, 12, and 16 |
| Environment variables and Docker | Sections 16 and 17 |
| Security, rate limiting, monitoring, and logging | Sections 18-20 |
| CI/CD, deployment, testing, and scalability | Sections 21-23 |
| Build order, milestones, and task checklist | Sections 24 and 25 |

## 1. Current baseline: preserve this

RBC Studio 6.12.1 is a static ES-module PWA deployable to Netlify. It already provides:

- A local campaign library and image persistence in browser storage.
- Twelve branded canvas templates in 4:5 and 9:16.
- Platform copy for Instagram, TikTok, Telegram, Threads, and X.
- Campaign scheduling, DM scripts, tease/reveal/proof arcs, sold stories, and performance review.
- A 31-deliverable factory plan: 24 template visuals, six Pinterest pins, and one archive article.
- Source-rights confirmation, a license reference, approval/rejection states, deterministic destination routing, and approved-asset ZIP export.
- A hard rule that prevents flagship assets from becoming auto-publish eligible.
- A dependency-light unit suite and a real Edge end-to-end suite.

Known boundaries of 6.12.1:

- Binary derivatives are generated in-browser and must be regenerated after reload.
- The local cutout assist handles uniform backgrounds; it is not a learned product-matting service.
- Campaign records are local to one browser profile.
- There is no authenticated shared database, durable worker queue, GPU worker, official publisher, CMS, or cross-account analytics ingestion.
- The canvas renderer is coupled to browser DOM state.

All future work must be additive and feature-flagged. The local factory remains a usable fallback if every remote service is unavailable.

## 2. Non-negotiable invariants

These rules must exist in code, database constraints, tests, and operations documentation:

1. `flagship.manual_only` is always true. No environment variable, UI switch, workflow edit, or administrator role may override it.
2. Every public asset has a rights record. Unknown rights means blocked publishing.
3. Every public asset is approved after its final binary and final copy are produced. Editing either invalidates approval.
4. Generated actual-product imagery is prohibited. Product pixels originate from a documented source photograph.
5. Synthetic mood, persona, or background media is disclosed in the manifest, copy where required, and platform disclosure controls where available.
6. Product facts are operator-entered or operator-confirmed. Models may propose attributes but may not establish provenance, authentication, condition, price, or availability.
7. Scarcity must be derived from inventory state. No model may invent time pressure, demand, waitlists, buyers, or stock counts.
8. Official platform APIs only. No browser login automation, device spoofing, scraping-based publishing, burner provisioning, comment bots, or engagement pods.
9. One asset has one primary CTA. Satellite accounts identify themselves as curated by RareBagClub.
10. Every job and publish attempt is idempotent and auditable.

## 3. Architecture decision

### 3.1 Preferred hybrid architecture

```text
Operator phone/laptop
  RBC Studio PWA on Netlify
        |
        | Supabase Auth + HTTPS + RLS
        v
Cloud control plane
  Supabase Postgres + Storage + Queues
        |                         |
        | outbound job claim      | approved publish events
        v                         v
RTX 3080 worker                n8n orchestrator
  Windows/WSL2 Python             | calls versioned adapters
  BiRefNet / CV / FFmpeg           v
  optional ComfyUI             Official platform APIs
        |
        | signed uploads + job results
        v
Supabase assets, manifests, audit, metrics
```

Why this is preferred:

- The Netlify app stays cheap, installable, and usable on a phone.
- The workstation opens no inbound internet port. Its worker makes outbound TLS requests and claims jobs.
- Heavy GPU work never runs in Netlify Functions or Supabase Edge Functions.
- Postgres is the source of truth; object storage holds binaries; queues hold work references, not image bytes.
- n8n coordinates schedules, webhooks, and adapter calls. Business rules remain in tested code and database constraints, so an edited workflow cannot bypass governance.
- Cloud GPU workers can later implement the same worker protocol without changing the app.

### 3.2 Technology choices

| Concern | Preferred | Why | Deferred alternative |
|---|---|---|---|
| Operator UI | Existing vanilla JS PWA | Already stable, fast, offline, Netlify-ready | Framework migration only if complexity proves it necessary |
| Auth/control DB | Supabase Auth + Postgres | Phone-safe authentication, RLS, SQL, managed backups, low initial ops | Fully self-hosted Supabase after usage or compliance requires it |
| Object storage | Supabase Storage initially | Integrated RLS and signed URLs | S3/R2-compatible storage behind an adapter at scale |
| App job queue | Supabase Queues/PGMQ | Durable Postgres-native queue; no early Redis dependency | Redis/BullMQ or managed queue above sustained concurrency thresholds |
| GPU worker | Python 3.12, FastAPI health API, outbound queue consumer | PyTorch/CV ecosystem and portable worker contract | RunPod container with the same contract |
| Image cutout | BiRefNet HR-matting benchmark winner | High-resolution matting, permissive repository license, local GPU support | Commercial BRIA API fallback; SAM-assisted manual repair |
| Object localization | SAM 3 evaluation adapter | Text/point/box segmentation and future video tracking | SAM 2.1 if SAM 3 VRAM or packaging is unsuitable |
| Attribute suggestion | Deterministic CV + quantized Qwen3-VL 4B/8B benchmark | Local multimodal suggestions; structured schema | Provider adapters for Claude/GPT/Gemini selected by eval, not preference |
| Creative generation | ComfyUI API adapter | Replaceable workflows, queued execution, visual iteration | Direct Diffusers service for stable production workflows |
| Video assembly | FFmpeg | Deterministic MP4/H.264 output, audio and duration control | Browser MediaRecorder remains a local fallback |
| Orchestration | n8n | Schedules, OAuth-aware HTTP flows, webhooks, operations visibility | Code scheduler if n8n becomes the bottleneck |
| Observability | JSON logs + Sentry initially; OpenTelemetry/Prometheus later | Low setup cost with an upgrade path | Full Grafana stack from day one is unnecessary |

### 3.3 Explicit non-decisions

- Do not migrate the UI to React/Next merely to add a backend.
- Do not place GPU inference inside n8n nodes.
- Do not send original high-resolution product photography through multiple AI vendors by default.
- Do not use Firebase and Supabase together.
- Do not add Kafka, Kubernetes, or a microservice per platform at current scale.
- Do not use Supabase service-role keys in the browser bundle.
- Do not use a local callback server that must be exposed through a public tunnel for normal operation.

## 4. Target repository structure

The current static app remains at the repository root during the first milestones. New systems are added beside it:

```text
/
  index.html
  css/
  js/                         # current PWA; never imports server secrets
    factory/
    remote/                   # remote repository + queue client, feature flagged
  tests/
  apps/
    archive-site/             # later SEO archive/blog site
  packages/
    contracts/                # JSON Schema/OpenAPI-generated shared contracts
    policy-core/              # destination, rights, approval, scarcity rules
    copy-core/                # extracted deterministic copy/lint service
    render-core/              # renderer contract and seeded variant plan
    platform-adapters/        # Pinterest, Meta, TikTok, Threads, X, etc.
  services/
    control-api/              # optional FastAPI admin/worker endpoints
    gpu-worker/
      rbc_worker/
        claim.py
        storage.py
        jobs/
          cutout.py
          attributes.py
          crops.py
          render.py
          video.py
          mood.py
        models/
          birefnet.py
          sam.py
          vlm.py
        qa/
          cutout_score.py
          visual_rules.py
      tests/
      pyproject.toml
      Dockerfile.cloud
    publisher/
      src/adapters/
      tests/fixtures/
  workflows/
    n8n/
      publish-due-content.json
      token-refresh.json
      ingest-metrics.json
      failure-alert.json
    comfyui/
      atmosphere-v1.api.json
      persona-v1.api.json       # phase 7 only
  infra/
    supabase/
      config.toml
      migrations/
      seed.sql
      tests/
    docker/
      compose.yml
      compose.observability.yml
    netlify/
    scripts/
  config/
    destinations.yml
    models.yml
    policies.yml
    prompts/
  docs/
    runbooks/
    adr/                       # architecture decision records
    api/
    benchmarks/
```

No large model weights, raw inventory photos, access tokens, generated assets, database dumps, or n8n credential exports enter source control.

## 5. Data model

All primary keys are UUIDs. All mutable tables contain `created_at`, `updated_at`, and, where operator edits occur, `version integer` for optimistic concurrency. Times are `timestamptz` in UTC. Operator-facing time zones are stored as IANA names.

### 5.1 Core tables

#### `organizations`

- `id`, `name`, `slug`
- `default_timezone`
- `settings jsonb`

#### `organization_members`

- `organization_id`, `user_id`
- `role`: `owner | operator | reviewer | analyst`
- Unique `(organization_id, user_id)`

#### `pieces`

- `id`, `organization_id`, `archive_no`, `internal_name`, `public_name`
- `status`: `draft | available | reserved | acquired | archived`
- `price_amount_minor`, `price_currency`, `price_mode`
- `material`, `condition`, `authentication`, `provenance`, `detail`
- `acquisition_route`, `product_url`
- `facts_version`, `facts_confirmed_at`, `facts_confirmed_by`
- Unique `(organization_id, archive_no)`

#### `campaigns`

- `id`, `piece_id`, `title`, `objective`, `story_angle`
- `campaign_date`, `target_region`, `spelling_mode`
- `local_snapshot jsonb` for lossless import from the current PWA
- `status`: `draft | generating | review | scheduled | active | complete | failed`

#### `source_assets`

- `id`, `piece_id`, `campaign_id nullable`
- `kind`: `product_original | product_detail | owned_mood | licensed_mood | generated_mood | persona`
- `storage_key`, `sha256`, `mime_type`, `width`, `height`, `bytes`
- `color_profile`, `exif_removed_at`
- `parent_asset_id nullable`, `derivation jsonb`
- Immutable binary identity: a changed file creates a new row.

#### `rights_records`

- `id`, `asset_id`
- `rights_class`: `owned | licensed | generated`
- `source_reference`, `licensor`, `license_name`, `license_url`
- `valid_from`, `valid_until`, `territories`, `allowed_uses`
- `proof_storage_key nullable`
- `confirmed_by`, `confirmed_at`
- Database constraint: public eligibility requires a non-expired confirmed record.

#### `asset_attributes`

- `asset_id`, `extractor`, `extractor_version`
- `palette jsonb`, `dominant_color`, `material_suggestions jsonb`
- `hardware_suggestions jsonb`, `style_suggestions jsonb`, `season_suggestions jsonb`, `vibe_suggestions jsonb`
- `confidence jsonb`, `raw_output jsonb`
- `operator_confirmed jsonb`
- Suggestions never overwrite `pieces` automatically.

### 5.2 Factory and review tables

#### `factory_runs`

- `id`, `campaign_id`, `plan_version`, `seed`
- `input_fingerprint`: hash of facts version, source hashes, template version, prompt version, and policy version
- `status`: `queued | running | review | partial | complete | failed | cancelled`
- `requested_by`, `started_at`, `completed_at`
- Unique active run per `(campaign_id, input_fingerprint)`

#### `content_items`

- `id`, `factory_run_id`, `campaign_id`
- `content_type`: `visual | carousel | pin | reel | story | text | blog | email | google_post`
- `destination_id`, `platform`, `account_id nullable`
- `template_id`, `format`, `variant_seed`
- `copy_text`, `copy_schema_version`, `facts_fingerprint`
- `cta_type`, `synthetic_media boolean`, `disclosure_text`
- `status`: `draft | rendered | qa_failed | review | approved | rejected | scheduled | publishing | published | failed | superseded`
- `manual_only boolean`
- `binary_fingerprint`, `copy_fingerprint`

#### `content_item_assets`

- `content_item_id`, `asset_id`, `role`, `position`
- Roles: `hero | slide | cover | audio | subtitle | article_image`

#### `approvals`

- `id`, `content_item_id`, `decision`: `approved | rejected | changes_requested`
- `binary_fingerprint`, `copy_fingerprint`
- `reviewer_id`, `note`, `created_at`
- An approval is valid only while both fingerprints match the current item.

#### `destinations`

- `id`, `organization_id`, `code`, `label`, `platform`
- `kind`: `flagship | satellite | discovery | owned`
- `manual_only`, `requires_approval`, `requires_ai_disclosure`
- Database check: `kind='flagship'` implies `manual_only=true`.
- Seed rows match `js/factory/core.js` destination codes.

#### `social_accounts`

- `id`, `destination_id`, `platform`, `handle`, `external_account_id`
- `authorization_state`, `token_secret_ref`, `token_expires_at`
- `capabilities jsonb`, `enabled`, `last_health_check_at`
- Secrets are references, not plaintext tokens.

### 5.3 Publishing, analytics, and operations tables

#### `publish_jobs`

- `id`, `content_item_id`, `account_id`, `scheduled_for`
- `state`: `pending | claimed | uploading | processing | published | retry_wait | blocked | failed | cancelled`
- `idempotency_key`, `attempt_count`, `next_attempt_at`, `last_error_code`, `last_error_redacted`
- Unique `(account_id, idempotency_key)`

#### `publications`

- `id`, `publish_job_id`, `platform_post_id`, `platform_url`
- `published_at`, `remote_payload_redacted jsonb`
- Unique `(account_id, platform_post_id)`

#### `metric_observations`

- `publication_id`, `observed_at`, `views`, `impressions`, `reach`, `saves`, `likes`, `comments`, `shares`, `clicks`, `profile_visits`, `dms_attributed`
- Unique `(publication_id, observed_at)`
- Raw platform response stored separately with restricted retention if required.

#### `job_runs`

- `id`, `queue_name`, `job_type`, `entity_id`, `worker_id`
- `state`, `attempt`, `model_name`, `model_revision`, `prompt_version`
- `started_at`, `finished_at`, `duration_ms`, `gpu_seconds`, `estimated_cost_minor`
- `input_hash`, `output_hash`, `error_class`, `error_redacted`

#### `audit_events`

- Append-only: `id`, `organization_id`, `actor_type`, `actor_id`, `action`, `entity_type`, `entity_id`, `request_id`, `before_hash`, `after_hash`, `metadata`, `created_at`
- No update/delete grant for application roles.

#### `webhook_events`

- `provider`, `provider_event_id`, `received_at`, `signature_valid`, `payload_redacted`, `processed_at`, `error`
- Unique `(provider, provider_event_id)` prevents replay.

#### `model_registry`

- `purpose`, `model_id`, `revision`, `license`, `license_url`, `commercial_use_allowed`
- `artifact_sha256`, `evaluation_report`, `approved_at`, `active`
- A model may not run in production until license and evaluation fields are complete.

### 5.4 Row-level security

- Browser users see rows only through organization membership.
- Operators may create/edit pieces and campaigns.
- Reviewers may create approval rows but may not modify source facts.
- Analysts may read publications and metrics but not originals or token references.
- The worker role may claim jobs, read only required assets through short-lived signed URLs, and write derived assets/results.
- The publisher role may read approved scheduled content and token references only for its assigned adapter.
- Service-role credentials exist only in worker/orchestrator secret stores.

## 6. Contracts and APIs

All schemas live in `packages/contracts` as JSON Schema. OpenAPI is generated from the service implementation and checked for uncommitted drift in CI. Every request has `request_id`; every mutation supports an idempotency key.

### 6.1 Browser/control-plane operations

```text
POST   /v1/pieces
GET    /v1/pieces/{piece_id}
PATCH  /v1/pieces/{piece_id}                 If-Match: facts_version
POST   /v1/pieces/{piece_id}/assets/upload-intent
POST   /v1/campaigns
POST   /v1/campaigns/{campaign_id}/factory-runs
GET    /v1/factory-runs/{run_id}
POST   /v1/content-items/{item_id}/approve
POST   /v1/content-items/{item_id}/reject
POST   /v1/content-items/batch-approve
POST   /v1/content-items/{item_id}/schedule
GET    /v1/queue?status=&destination=&campaign=
GET    /v1/analytics/weekly
```

`batch-approve` rejects any supplied flagship item IDs and returns them in `blocked_items`. It never silently skips governance errors.

### 6.2 Worker protocol

The preferred implementation uses Supabase Queues directly. The equivalent HTTP contract exists for cloud workers and testing:

```text
POST /v1/worker/claim
POST /v1/worker/jobs/{job_id}/heartbeat
POST /v1/worker/jobs/{job_id}/complete
POST /v1/worker/jobs/{job_id}/fail
GET  /healthz
GET  /readyz
```

Claim response:

```json
{
  "job_id": "uuid",
  "job_type": "cutout.v1",
  "attempt": 1,
  "lease_expires_at": "2026-07-19T03:00:00Z",
  "input": {
    "asset_id": "uuid",
    "download_url": "short-lived-signed-url",
    "sha256": "hex",
    "options": {"quality": "hero"}
  },
  "output_uploads": [
    {"role": "cutout", "upload_url": "signed-url"},
    {"role": "mask", "upload_url": "signed-url"}
  ],
  "model_policy": {"purpose": "product_cutout", "allowed_revision": "pinned-revision"}
}
```

Workers verify input hashes, never follow arbitrary URLs, upload to pre-authorized keys, and report output hashes before completion.

### 6.3 Cutout compatibility API

The existing PWA endpoint field remains supported:

```text
POST /v1/cutout
Content-Type: multipart/form-data
Fields: image, quality=preview|hero, return_mask=true|false
Response: image/png or application/json with signed output URLs
Headers: X-Request-Id, X-Model-Revision, X-QA-Score
```

Production PWA calls should move to authenticated job creation; direct multipart is for local workstation use and diagnostics.

### 6.4 Publisher adapter interface

```ts
interface PublisherAdapter {
  platform: Platform;
  validate(item: PublishableItem, account: AccountCapabilities): ValidationResult;
  publish(input: PublishRequest): Promise<PublishResult>;
  status(remoteId: string): Promise<RemoteStatus>;
  metrics(remoteId: string, window: TimeWindow): Promise<MetricObservation>;
  refreshAuthorization(account: SocialAccount): Promise<TokenMetadata>;
}
```

Adapters receive only items that pass the central `assertPublishable()` policy. Each adapter repeats the critical checks defensively.

## 7. Queue architecture and state machines

### 7.1 Queues

- `gpu_cutout`: one image per message; highest priority.
- `gpu_attributes`: one source set per message.
- `gpu_mood`: generated atmosphere only; low priority and preemptible.
- `render_visual`: deterministic template/variant render.
- `render_video`: FFmpeg slideshow/reel assembly.
- `copy_expand`: optional model-assisted article/email/pin expansion.
- `publish_due`: one platform item per message.
- `metrics_ingest`: one publication/window per message.
- `maintenance`: retention, token health, link checks, and orphan cleanup.

Messages contain entity IDs and hashes, never binary payloads. Visibility timeout must exceed expected p95 runtime and is extended by heartbeats.

### 7.2 Retry policy

- Default maximum: five attempts.
- Delay: exponential backoff with full jitter, starting at 5 seconds, capped at 30 minutes.
- GPU out-of-memory: one retry after model unload and reduced tile size; then route to fallback/manual.
- Network timeout/408/429/5xx: retry when safe. Honor `Retry-After` and platform reset headers.
- Invalid input, expired rights, failed approval, unsupported account capability, and most 4xx responses: permanent block, no blind retry.
- OAuth expiry: refresh once under a distributed lock, then replay the idempotent publish attempt.
- Dead-letter messages preserve redacted error, request ID, model revision, and input hash.

### 7.3 Content state transitions

```text
draft -> rendered -> review -> approved -> scheduled -> publishing -> published
             |          |          |            |             |
             v          v          v            v             v
          qa_failed   rejected   superseded   blocked       failed
```

Rules:

- `rendered -> review` requires binary QA pass and valid rights.
- Any binary/copy/facts change from `approved` creates a new fingerprint and moves to `review`.
- `approved -> scheduled` requires destination/account capability validation.
- `scheduled -> publishing` is prohibited when `manual_only=true`.
- Flagship scheduling means a calendar reminder and handoff pack, never a publish job.
- `published` is set only after a platform ID is stored or a human records manual completion.

## 8. Background removal and cutout pipeline

### 8.1 Model decision

Preferred benchmark candidate: `BiRefNet_HR-matting` for hero assets, with `BiRefNet_dynamic` for varied resolutions. The official BiRefNet repository includes high-resolution/matting variants and is MIT-licensed. Pin exact repository and model revisions after benchmark approval.

Second choice: BRIA RMBG through its commercial API or a separately negotiated commercial self-host license. The public RMBG 2.0 model card is non-commercial; it must not be placed into a revenue-generating production pipeline under the public weight license.

SAM 3 is not the primary background remover. It is a promptable localization/repair tool and a possible coarse-mask disagreement signal. Its official stack currently requires modern CUDA/PyTorch and must be benchmarked for RTX 3080 VRAM before adoption.

BackgroundMattingV2 is not a primary candidate because it expects a captured clean background and targets a different workflow. It remains useful only if RBC standardizes a fixed photo station with an empty-background reference.

Comparison snapshot, checked 2026-07-19:

| Option | Expected handbag role | Marginal cost | Speed on RTX 3080 | License/operations | Decision |
|---|---|---:|---|---|---|
| BiRefNet HR-matting/dynamic | Primary high-resolution matte candidate | No per-image fee; workstation power only | Must be measured; official standard-model numbers are from other GPUs and cannot be claimed for the 3080 | Official repository is MIT; pin code and weight revision | Preferred candidate, subject to the 100-image gate |
| BRIA RMBG API | Commercial fallback and quality comparator | Published sandbox price was USD 0.018/image | Network/API latency; measure p50/p95 | Commercial API rights; public self-host RMBG 2.0 weights are non-commercial | Preferred fallback if benchmark quality is strong |
| PhotoRoom Remove Background API | Comparator and alternate fallback close to the current manual tool | Published price was USD 0.02/image | Network/API latency; measure p50/p95 | Commercial API; no model hosting | Benchmark on the same hard-edge set |
| SAM 3 | Prompted repair, localization, coarse disagreement, later video | No per-call fee; workstation power | Unknown on 10 GB 3080; official requirements are heavy | Local CUDA stack and model license review required | Do not use as primary alpha matte |
| BackgroundMattingV2 | Fixed-photo-station experiment | No per-image fee | Likely fast, but test only with captured empty background | MIT; extra capture requirement | Reject for normal intake |
| Current uniform assist | Instant preview on simple backgrounds | None | Browser-local, effectively immediate | Already shipped | Keep as offline fallback, not production QA |

Prices are planning observations, not contractual quotes. Recheck them at procurement and store the observed unit price in the cost ledger.

### 8.2 Required benchmark before model lock

Build a rights-cleared 100-image handbag test set stratified across:

- Thin straps, chain handles, tassels, fringe, charms, and open handles.
- Light stitching on light backgrounds and dark leather on dark backgrounds.
- Patent/reflective leather, metallic hardware, woven materials, fur/fabric edges.
- Transparent or open regions, interior openings, shadows, and floor contact.
- Simple studio, textured, cluttered, and low-contrast backgrounds.
- High-resolution camera originals and compressed phone images.

For each image, store a human-approved reference mask and a five-point visual score. Compare:

- BiRefNet HR-matting, dynamic, and standard variants.
- BRIA commercial API on the same set.
- SAM 3/SAM 2-assisted segmentation where feasible.
- The current uniform-background assist as a baseline.

Metrics:

- SAD/MAD or equivalent alpha-matte error against reference masks.
- Boundary F-score and human correction time.
- Chain/strap survival rate.
- Hole preservation rate.
- Shadow quality and color-spill score.
- p50/p95 latency, peak VRAM, output size, and cost per image.
- Percentage accepted with zero manual correction.

Gate: choose the primary only after at least 95% of the benchmark is acceptable without masking, or document the achieved rate and retain manual review. Never manufacture a 95% result.

### 8.3 Processing stages

1. Validate file signature, pixel dimensions, decompression-bomb limits, and hash.
2. Correct EXIF orientation; preserve original untouched; strip sensitive EXIF from derivatives.
3. Convert a working copy to sRGB while storing the original color profile metadata.
4. Create a bounded inference image without destructive upscaling.
5. Run the pinned primary segmentation/matting model in FP16 where validated.
6. Refine alpha at full resolution using tiled overlap, guided filtering, or model-provided foreground refinement.
7. Preserve intentional holes and disconnected chain/strap components using component analysis.
8. Produce transparent PNG, grayscale mask, edge-preview composite, and QA report.
9. Generate standard crops: hero, square, 4:5, 9:16-safe, macro candidates, and silhouette.
10. Route by QA: accept, commercial fallback, SAM/manual repair, or reject.

### 8.4 Automated QA signals

- Foreground area and bounding-box plausibility.
- Unexpected border contact.
- Excessive disconnected components or removed thin components.
- Alpha entropy in the edge band.
- Interior-hole changes compared with the coarse object mask.
- Primary/fallback mask disagreement.
- Halo detection against black, white, cream, and bronze test backgrounds.
- Product-color loss near the boundary.
- Output/input perceptual difference inside the confident foreground.

The QA score is an explanation bundle, not one opaque number. A low score cannot auto-publish.

## 9. Attribute extraction and cutout library

### 9.1 Deterministic first

- Palette: sample confident foreground pixels in perceptual color space; cluster and name colors through a fixed vocabulary.
- Geometry: aspect ratio, silhouette, visual center, empty-space map, crop-safe bounds.
- Hardware candidates: reflective/highlight regions plus VLM suggestions; never treat this as authenticated metal composition.
- Detail crops: combine edge density, saliency, VLM boxes, and diversity suppression.

### 9.2 VLM suggestion schema

The local candidate is a quantized Qwen3-VL 4B or 8B instruct model, benchmarked on the 3080. It returns JSON only:

```json
{
  "dominant_colors": [{"label": "oxblood", "confidence": 0.81, "evidence": "front leather panels"}],
  "material_suggestions": [{"label": "patent leather", "confidence": 0.62, "evidence": "high-gloss surface"}],
  "hardware_color": [{"label": "silver-tone", "confidence": 0.88}],
  "shape": [{"label": "east-west shoulder bag", "confidence": 0.74}],
  "style_tags": ["archive", "graphic", "evening"],
  "seasonal_fit": ["autumn", "evening"],
  "uncertain": ["exact leather type", "hardware material"]
}
```

The model prompt explicitly forbids brand/model identification unless visible text supports it, and forbids provenance, authenticity, condition grade, and composition claims. The operator confirmation UI shows suggestions beside existing facts; it never silently writes them.

### 9.3 Cutout outputs

- `hero.png`: full-resolution transparent master.
- `hero-shadow.png`: transparent product plus retained natural contact shadow when usable.
- `mask.png`: grayscale alpha/mask.
- `preview.webp`: bounded review preview.
- `silhouette.svg` or PNG only after visual validation.
- `detail-01..N.webp`: ranked detail crops with source coordinates.
- `qa.json`: model revision, metrics, flags, and routing decision.

## 10. Mood assets and automatic creative generation

### 10.1 Source pool

Every mood asset is `owned`, `licensed`, or `generated`. Store license proof and source reference. Pinterest is a trend/reference surface only; its image pixels never enter publishable assets unless separately licensed by the actual rights holder.

### 10.2 Retrieval

- Compute palette and image/text embeddings for approved mood assets.
- Filter by rights, territory, account, synthetic policy, orientation, and expiry before ranking.
- Rank by palette distance, vibe tags, texture diversity, negative-space fit, and recent-use penalty.
- Enforce reuse limits so satellite grids do not look cloned.
- Store retrieval candidates and scores for reproducibility.

Start with Postgres metadata and deterministic filters. Add pgvector only when the licensed pool is large enough that tag/palette search no longer performs adequately.

### 10.3 Generated atmosphere

ComfyUI receives a versioned API-format workflow and parameters; its `/prompt` queue and WebSocket/history APIs are wrapped behind `MoodGenerator`. Generated prompts produce abstract environment, fabric, stone, paper, light, or interior fragments. They must include:

- No handbag, product, logo, monogram, text, person, celebrity, or recognizable trademark.
- Target palette, texture, lighting, composition, and negative-space region.
- Seed, model revision, workflow hash, sampler settings, and disclosure metadata.

Do not use FLUX dev weights commercially without the appropriate commercial license. A model registry check blocks unapproved model licenses. Prefer an explicitly commercial-compatible model or paid API until legal use is documented.

### 10.4 Variant engine

Each variant seed is deterministic:

```text
sha256(campaign_id + template_version + destination + format + variant_index + policy_version)
```

Seed controls crop, mood selection, accent, type scale within approved bounds, layout offset, detail choice, and copy hook variant. It never changes product facts. Similarity checks prevent near-duplicates within a campaign.

## 11. Headless rendering and video

### 11.1 Rendering migration without visual drift

1. Define `RenderRequest` and `RenderResult` contracts around the existing template registry.
2. Add golden-image tests for all 12 templates, both formats, with the current worked example.
3. Isolate field access and image loading behind a render environment; keep drawing functions unchanged initially.
4. Build a dedicated render page that accepts a serialized request and returns a PNG.
5. Run that page in pinned Playwright Chromium in the render worker. This gives browser parity before attempting a lower-level canvas port.
6. Compare perceptual hashes and sampled pixel deltas with current Edge output.
7. Only after parity is stable may `render-core` become DOM-free/OffscreenCanvas.

Fonts are vendored or fetched during image build with documented licenses; production rendering cannot depend on a live Google Fonts request.

### 11.2 Required formats

- Instagram/Facebook feed: 4:5.
- Stories/Reels/TikTok: 9:16 with safe zones.
- Pinterest: 2:3, default 1000x1500.
- Lemon8/Rednote handoff: configurable 3:4.
- Email/blog: responsive source plus optimized raster variants.
- Thumbnails: WebP/AVIF where consumer support is controlled; original exports remain PNG/JPEG as platform needs dictate.

### 11.3 Video worker

FFmpeg assembles hook -> record -> CTA frames and optional licensed audio:

- MP4, H.264, yuv420p, faststart, platform-tested dimensions/frame rate.
- Duration and transitions are defined in a JSON timeline.
- Burned-in captions are generated from a timed text track, with safe-zone validation.
- Audio assets require rights records; missing audio yields silent output, not arbitrary music.
- A poster frame and shot list ship with every video.

## 12. Copy and prompt architecture

### 12.1 Deterministic copy core

Extract existing `facts.js`, copy banks, lint, spelling, platform limits, scarcity logic, and CTA policy into `packages/copy-core` without changing current outputs. The browser imports the browser build; workers import the Node build. Golden fixtures prove byte-level compatibility.

AI is an optional constrained transformation after deterministic draft generation. If every model provider fails, the deterministic copy remains publishable.

### 12.2 Provider interface

```ts
interface CopyModel {
  generate<T>(request: StructuredPrompt<T>): Promise<ModelResult<T>>;
}
```

Implement provider adapters only after an evaluation set exists. Claude, GPT, Gemini, and a local model are compared using the same 50-record fixture on:

- Fact preservation and hallucination count.
- Brand/lint pass rate.
- Schema compliance.
- Latency and cost.
- Long-form quality for blog/newsletter.
- Data retention and commercial terms.

No provider name is embedded in business logic. Model IDs and prompt versions live in configuration.

### 12.3 System prompt contract

```text
You are the RBC copy transformer.
Use only FACTS_JSON. Never infer missing product facts.
The actual item is one-of-one; state availability only from inventory_state.
Do not invent buyers, deadlines, waitlists, demand, provenance, condition, or authentication.
No hype, fake luxury adjectives, exclamation marks, or em dashes.
Return JSON matching OUTPUT_SCHEMA.
Use exactly one CTA from ALLOWED_CTA.
If synthetic_media=true, include the required disclosure.
If a requested claim lacks evidence, omit it and add it to blocked_claims.
```

User payload contains `FACTS_JSON`, destination register, format, length limit, allowed CTA, banned terms, disclosure rule, examples, and output schema. Responses pass schema validation, fact-diff validation, platform limits, brand lint, and CTA count before entering review.

### 12.4 Surface templates

- Education: one lesson, evidence bullets, save CTA, curation disclosure.
- Aesthetic: sensory observation tied only to visible/product facts, follow CTA.
- Era: confirmed provenance/era only, question or flagship CTA.
- Pinterest: search phrase, descriptive facts, one outbound link.
- Blog: structured archive record with headings, schema metadata, internal links, and enquiry CTA.
- Newsletter: weekly record, recent archive notes, acquired proof, reply CTA; human send.
- Alt text: literal visual description; no sales language.

## 13. Approval queue and operator UX

The existing factory section evolves into a remote-capable queue behind `RBC_REMOTE_FACTORY`:

- Local mode remains the default until remote migration acceptance passes.
- Remote mode authenticates with Supabase, syncs campaigns explicitly, and shows offline state.
- Filters: run, destination, platform, asset type, QA flag, rights status, review state.
- Compare source/cutout, dark/light edge previews, crop safe zones, final copy, disclosure, license, and target account.
- Keyboard/mobile actions: approve, reject, request changes, next item.
- Batch approval preview shows exactly what will change and lists blocked flagship items.
- Regeneration creates a new version; old approved versions remain in audit history but become superseded.
- Conflicts use optimistic locking and require refresh, never last-write-wins.

Offline edits enter an outbox with mutation IDs and are replayed after authentication/network recovery. Approval itself requires a current server round trip so stale binaries cannot be approved offline.

## 14. Publishing rail

### 14.1 Shared preflight

`assertPublishable()` verifies:

- Valid current approval fingerprints.
- Rights confirmation and non-expiry.
- Destination/account match.
- Flagship manual-only rule.
- Platform dimensions, MIME, byte size, text limits, and account capabilities.
- One CTA and required disclosure.
- Product facts fingerprint matches the reviewed item.
- Scheduled time is valid and not duplicated.
- External link is HTTPS and allowlisted to RBC-controlled domains where appropriate.

### 14.2 Platform rollout

1. **Pinterest**: first adapter. Use API v5, sandbox/trial, approved scopes, create Pin, store remote ID, then metrics. Keep CSV export as fallback.
2. **Archive blog**: publish structured records to an Astro/static site and trigger a Netlify build. Preview URL must be reviewed before production alias changes.
3. **Instagram/Facebook satellites**: Meta content publishing after business/account configuration and app review. Flagship adapter exposes handoff only.
4. **Threads**: official Threads API for text/image/carousel posts after account authorization.
5. **TikTok**: Content Posting API. Direct Post requires approved scope and audited client; unaudited clients are private-only. User consent and current creator capability query are mandatory. Draft upload may be preferred initially.
6. **Telegram**: Bot API to an operator-owned channel, with approval and exact message preview.
7. **X**: official API only. Enable only after current pricing/rate economics pass the cost gate; retain copy/manual handoff.
8. **Google Business**: OAuth and Business Profile local posts after API access. Use short record and RBC link.
9. **Email**: provider adapter creates a draft; the operator sends until unsubscribe, suppression, and deliverability controls are proven.
10. **Lemon8/Rednote**: export/manual batch packs until an official suitable API exists and market demand justifies integration.

Platform API behavior changes frequently. Each adapter pins an API version where supported, has contract fixtures, monitors deprecations quarterly, and can be disabled independently.

### 14.3 Scheduling

- Store UTC plus source IANA timezone and local wall time.
- Recompute/validate around daylight-saving transitions.
- A scheduler claims due jobs using database time, not workstation time.
- Per-account quiet periods, daily caps, minimum spacing, and platform rate buckets live in configuration.
- If the workstation is offline, already-rendered cloud assets still publish through the hosted orchestrator.

## 15. n8n workflows

n8n is a visible coordinator, not the database or policy engine.

### `publish-due-content`

1. Schedule trigger every minute.
2. Claim due publish IDs through a secured database function.
3. Call publisher service with the ID and idempotency key.
4. Record success/retry/block response.
5. Alert only after retry policy or hard policy failure.

### `token-refresh`

1. Daily account health query.
2. Refresh tokens due within the configured window under a lock.
3. Update secret reference metadata.
4. Notify operator of reauthorization requirements without including tokens.

### `ingest-metrics`

1. Select publications due at 1h, 24h, 7d, and 30d windows.
2. Call the adapter metrics endpoint.
3. Upsert immutable observations.
4. Recompute aggregates and leaderboard candidates.

### `failure-alert`

Groups repeated errors by class/account so the operator receives one useful incident, not one message per failed asset.

At initial volume, run one n8n instance with Postgres. Use n8n queue mode with Redis and workers only when workflow concurrency requires it. If queue mode is enabled, every main and worker uses the same pinned n8n version and encryption key.

## 16. Configuration and environment variables

Committed non-secret configuration:

```yaml
# config/destinations.yml
flagship:
  kind: flagship
  manual_only: true
  requires_approval: true
education:
  kind: satellite
  manual_only: false
  requires_approval: true
  disclosure: "Curated by @rarebagclub"
```

```yaml
# config/models.yml
product_cutout:
  provider: birefnet
  model: BiRefNet_HR-matting
  revision: "PIN_AFTER_BENCHMARK"
  precision: fp16
  max_vram_mb: 9000
  license_required: MIT
attribute_suggestion:
  provider: qwen3_vl
  enabled: false
  revision: "PIN_AFTER_BENCHMARK"
```

Environment groups:

```text
# PWA public configuration; safe to expose
RBC_REMOTE_FACTORY=false
RBC_SUPABASE_URL=
RBC_SUPABASE_ANON_KEY=

# Worker secrets; never bundled into PWA
RBC_SUPABASE_SERVICE_ROLE_KEY=
RBC_WORKER_ID=
RBC_WORKER_QUEUES=gpu_cutout,gpu_attributes,render_video
RBC_MODEL_CACHE_DIR=
RBC_STORAGE_BUCKET_ORIGINALS=
RBC_STORAGE_BUCKET_DERIVATIVES=
RBC_LOG_LEVEL=INFO
RBC_SENTRY_DSN=

# n8n
N8N_ENCRYPTION_KEY=
N8N_HOST=
N8N_PROTOCOL=https
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=
DB_POSTGRESDB_DATABASE=
DB_POSTGRESDB_USER=
DB_POSTGRESDB_PASSWORD=

# Publisher secret references or provider OAuth configuration
RBC_META_CLIENT_ID=
RBC_META_CLIENT_SECRET=
RBC_PINTEREST_CLIENT_ID=
RBC_PINTEREST_CLIENT_SECRET=
RBC_TIKTOK_CLIENT_KEY=
RBC_TIKTOK_CLIENT_SECRET=
RBC_X_CLIENT_ID=
RBC_X_CLIENT_SECRET=
RBC_GOOGLE_CLIENT_ID=
RBC_GOOGLE_CLIENT_SECRET=
```

`.env.example` contains names and explanations only. Production secrets are stored in the deployment secret manager/n8n credential store. Logs redact authorization headers, signed URLs, emails, DMs, and source filenames.

## 17. Local development and Docker

### 17.1 Windows workstation

- Keep the PWA development flow unchanged.
- Use Docker Desktop/WSL2 for local Postgres/Supabase-compatible services, n8n, and optional observability.
- Run the GPU worker natively or in WSL2 according to the benchmarked CUDA/model stack. Do not force Docker GPU if it reduces reliability on the RTX 3080.
- SAM 3 evaluation belongs in WSL2/Linux because its official CUDA stack is Linux-oriented and heavier than the core cutout requirement.
- ComfyUI may run as an external local service on `127.0.0.1:8188`; the worker adapter owns API calls and health checks.

### 17.2 Compose services

`infra/docker/compose.yml` eventually contains:

- `postgres` only for isolated local integration tests when Supabase CLI is not used.
- `redis` disabled by default; enabled for n8n queue profile.
- `n8n-main` and optional `n8n-worker` profile.
- `publisher` service.
- `minio` optional storage-contract test service.
- No GPU model weights baked into general service images.

Profiles: `core`, `publish`, `n8n-queue`, `observability`. Containers use health checks, named volumes, non-root users where supported, version-pinned images, resource limits, and restart policies.

### 17.3 Cloud GPU image

`services/gpu-worker/Dockerfile.cloud` uses a pinned CUDA runtime compatible with the selected provider, installs locked Python dependencies, downloads model weights at deployment/start from an authenticated model registry/cache, verifies hashes, warms the selected model, exposes health endpoints, and shuts down gracefully after the job lease is returned.

## 18. Security and privacy

- Supabase Auth with a single owner initially; MFA required before publishing adapters go live.
- RLS enabled on every exposed table before remote mode can be enabled.
- Private storage buckets; short-lived signed URLs scoped to exact keys and operations.
- Original photographs have longer retention only if operationally necessary; generated previews and failed intermediates have explicit cleanup periods.
- Validate MIME by file signature, cap pixels/bytes, strip active metadata, and quarantine malformed files.
- Worker URL fetches are restricted to signed storage hosts; block loopback, link-local, metadata-service, and private-network SSRF targets.
- OAuth state/PKCE validation and encrypted token storage. Rotate secrets and invalidate on operator request.
- Verify webhook signatures and timestamps; reject replay through unique provider event IDs.
- Apply Content Security Policy, secure headers, dependency scanning, and secret scanning.
- Audit log is append-only and excludes raw tokens, private DMs, and unnecessary personal data.
- Newsletter subscribers require consent record, unsubscribe, suppression list, and data deletion workflow before automation.
- Backup restore is tested, not merely configured.

## 19. Observability, logging, and operations

### 19.1 Structured events

Every service writes JSON with:

```text
timestamp, level, service, version, environment, request_id, trace_id,
job_id, campaign_id, content_item_id, account_id, operation,
duration_ms, attempt, model_revision, outcome, error_class
```

Never log tokens, signed URL query strings, raw model prompts containing sensitive details, subscriber addresses, or entire provider responses.

### 19.2 Initial dashboards

- Queue depth and oldest-job age by queue.
- Worker heartbeat, GPU utilization/VRAM, p50/p95 duration, OOM count.
- Cutout zero-correction rate, fallback rate, and QA failure reasons.
- Assets generated/approved/rejected per run.
- Publish success, retry, block, and duplicate-prevention counts by platform.
- Token expiry horizon and adapter health.
- Cost per factory run and per approved asset.
- Weekly growth metrics from `CLAUDE_PLAN.md`.

### 19.3 Alerts

- No worker heartbeat while GPU jobs wait.
- Oldest publish job past its allowed lateness.
- Repeated authorization failures or token expiry within seven days.
- Rights/approval policy rejection at publishing time.
- Storage/database quota thresholds.
- Error-rate or cost spike over rolling baseline.

Sentry is sufficient for application exceptions initially. Add OpenTelemetry and Prometheus/Grafana when multiple workers/adapters make cross-service tracing materially useful.

## 20. Rate limiting and cost control

- Persist provider rate-limit windows per account and endpoint; do not keep them only in process memory.
- Honor provider response headers and `Retry-After`.
- Per-account publishing caps are stricter than platform maximums.
- Generation budgets exist per campaign: maximum variants, VLM calls, mood generations, and fallback API calls.
- Cache by content hash and model/prompt revision; identical requests reuse valid derivatives.
- Abort superseded factory runs before expensive jobs start.
- Cloud GPU is opt-in and requires a per-run estimated cost display.
- X and any paid API remain disabled until projected monthly cost is approved.

## 21. CI/CD and release management

### 21.1 Pull-request gates

- Existing `npm test` and Edge browser E2E.
- ESLint/format/type checks when TypeScript packages are introduced.
- Python Ruff, mypy/pyright, pytest, and dependency lock validation.
- SQL migration lint and local database policy tests.
- JSON Schema and OpenAPI compatibility checks.
- Docker build and vulnerability scan.
- Secret scan and dependency license inventory.
- Golden renderer comparison for all 24 template/format combinations.
- Publisher contract tests using fixtures; no live post in normal CI.

### 21.2 Deployment

- Netlify deploy preview for every UI change.
- Supabase migrations applied to staging first; destructive migrations require expand/migrate/contract stages.
- Publisher/n8n workflows deploy disabled, then run sandbox/dry-run, then enable one destination.
- Model revision rollout: benchmark -> staging shadow run -> limited production -> promote.
- Feature flags allow immediate fallback to local factory, CSV/manual handoff, or individual adapter disable.

### 21.3 Versioning

- PWA uses semantic versioning and service-worker cache invalidation.
- Contracts are versioned (`cutout.v1`, `factory-plan.v2`).
- Prompts, templates, policies, workflows, and model revisions are immutable identifiers stored with outputs.
- A rollback never rewrites historical manifests; it selects an earlier approved version for new runs.

## 22. Test strategy

### 22.1 Unit

- Policy invariants, destination routing, rights expiry, approval invalidation.
- Fact diff, CTA count, disclosure and banned-language lint.
- Idempotency keys, retry classification, rate bucket behavior.
- Crop/safe-zone math, deterministic seeds, file/hash validation.

### 22.2 Integration

- Supabase RLS role matrix.
- Queue claim, visibility timeout, heartbeat, retry, and dead-letter behavior.
- Signed upload/download expiry and path scope.
- Worker model adapter with tiny fixtures and mocked heavy inference.
- n8n workflow import plus publisher dry-run.
- Token refresh lock and webhook replay protection.

### 22.3 Visual/model evaluation

- Rights-cleared cutout benchmark with frozen references.
- Golden 12x2 renderer suite at full resolution.
- Dark/light/brand-background halo composites.
- Detail-crop usefulness rubric.
- Prompt/provider fact-preservation evaluation.
- Persona identity consistency evaluation only in its later gated phase.

### 22.4 End-to-end

1. Upload a product source with rights.
2. Worker produces cutout, attributes, crops, QA, and hashes.
3. Factory produces the expected plan and binaries.
4. Operator approves satellites; flagship remains draft/manual.
5. Pinterest sandbox publish stores one remote ID without duplication.
6. Reload/resume preserves queue and audit state.
7. Metrics observation enters leaderboard without modifying facts.
8. Disable remote services and confirm local factory still functions.

No test suite may publish to a production account.

## 23. Scalability plan

| Scale | Architecture | Operational change |
|---|---|---|
| Up to 100 bags / under 5k assets | Current PWA + Supabase + one outbound RTX worker; single n8n | Manual backups plus managed DB backup; Postgres queue; no Redis required |
| 500 bags / several thousand assets monthly | Dedicated preview derivatives, storage lifecycle, scheduled worker hours | Add worker leases/priority, n8n Postgres, stronger dashboards, object-storage cost review |
| 1,000 bags / multi-account daily publishing | One local GPU plus burst cloud GPU; publisher replicas | Add cloud worker autoscaling, Redis only where concurrency demands it, formal on-call/runbooks |
| 10,000 content items/month | Stateless worker pool, S3-compatible storage/CDN, partitioned metrics | Separate generation/publishing pools, n8n queue mode or code scheduler, read replicas/warehouse export, SLOs and capacity tests |

Kubernetes is considered only after worker orchestration, deployment frequency, and uptime requirements demonstrate a real need. Ten thousand content items per month alone does not require it.

## 24. Milestones and executable build order

### Milestone 0 - Architecture spine and no-regression contract

Goal: make remote automation possible without changing current behavior.

Status: Completed in RBC Studio 6.12.1 on 2026-07-19.

- [x] Add ADRs for hybrid control plane, queue, worker, renderer, and publisher policy.
- [x] Add `packages/contracts` with factory, asset, job, QA, approval, and publish schemas.
- [x] Move critical factory policy to a shared, side-effect-free package while keeping browser imports compatible.
- [x] Add feature flags with `RBC_REMOTE_FACTORY=false` default.
- [x] Add `.env.example`, secret exclusions, and config validation.
- [x] Add CI checks for contracts and Python service skeleton.

Acceptance:

- Current local UI and exports are byte/visual compatible where expected.
- Existing unit and browser E2E pass.
- No network request occurs when remote mode is false.
- Flagship auto-publish invariant has shared unit tests.

### Milestone 1 - Supabase control plane and migration bridge

- [ ] Create migrations for organizations, members, pieces, campaigns, assets, rights, factory runs, content items, approvals, jobs, and audit events.
- [ ] Implement RLS and automated role-matrix tests before UI connection.
- [ ] Add private storage buckets and signed upload intents.
- [ ] Add one-way explicit "Sync this campaign" from local record to remote staging.
- [ ] Preserve local IDs/migration mapping and make repeated sync idempotent.
- [ ] Add remote queue read-only view to the PWA.

Acceptance:

- A phone-authenticated owner can sync and view a campaign.
- An unauthorized user cannot enumerate records or storage keys.
- Repeating sync creates no duplicate piece/campaign/assets.
- Deleting local data never silently deletes cloud originals.

### Milestone 2 - Cutout benchmark and GPU worker

- [ ] Build benchmark dataset manifest/tooling; do not commit private source images.
- [ ] Implement outbound worker claim/heartbeat/complete/fail.
- [ ] Implement BiRefNet adapters, preprocessing, alpha output, QA report, and model registry.
- [ ] Benchmark BRIA commercial fallback and SAM-assisted repair.
- [ ] Add manual edge-review UI and fallback routing.
- [ ] Pin winning model revisions and publish the benchmark report.

Acceptance:

- 100-image benchmark results are reproducible.
- p95 runtime and VRAM fit the RTX 3080 target or the limitation is explicit.
- A killed worker job is reclaimed once without duplicate assets.
- Low-confidence cutouts never enter factory review as approved.

### Milestone 3 - Attribute suggestions and cutout library

- [ ] Deterministic palette, geometry, crop-safe bounds, and macro scoring.
- [ ] Benchmark quantized local VLM candidates.
- [ ] Add suggestion/confirmation UX and fact-protection tests.
- [ ] Create hero, shadow, mask, preview, and detail assets with derivation links.

Acceptance:

- Suggestions never overwrite confirmed piece facts.
- Every derivative traces to source hash, model revision, and rights record.
- Detail crops are diverse and operator-usable on the benchmark rubric.

### Milestone 4 - Headless 31-asset factory

- [ ] Extract render contract and add 24 golden outputs.
- [ ] Implement Playwright render worker and deterministic variants.
- [ ] Implement FFmpeg reel/slideshow output.
- [ ] Extract deterministic copy core; add optional provider adapter/eval harness.
- [ ] Persist binaries, manifests, prompt/template/policy versions.
- [ ] Upgrade review queue to server-backed fingerprinted approvals.

Acceptance:

- One complete record produces at least the existing 31 deliverables without browser tab babysitting.
- Generation resumes after worker restart.
- Visual parity stays within approved golden thresholds.
- Changing facts, copy, or binary invalidates approval.

### Milestone 5 - Pinterest and blog production rail

- [ ] Build Pinterest OAuth, sandbox adapter, Pin creation, status, and analytics.
- [ ] Build archive site schema, preview, static publish, sitemap, canonical URL, structured data, and internal linking.
- [ ] Add scheduler, dry-run, idempotency, retry, rate-limit, and failure alerts.
- [ ] Keep CSV/HTML export fallbacks.

Acceptance:

- One approved satellite Pin publishes once in sandbox and then controlled production.
- Replaying the job does not create a duplicate.
- One archive record publishes with valid metadata and no unconfirmed fact.
- Flagship receives no automated publish job.

### Milestone 6 - Satellite adapters

- [ ] Register and review official apps/scopes.
- [ ] Add Meta satellite publishing, Threads, TikTok draft/direct-post where approved, Telegram, and optional Google Business.
- [ ] Add capability queries and platform-specific validation.
- [ ] Add per-account calendar, caps, and kill switches.
- [ ] Launch education and aesthetic satellites only after two weeks of queued, reviewed content exist.

Acceptance:

- Seven days of content can be reviewed in one session.
- Fourteen days of uninterrupted, policy-compliant cadence.
- Every account shows curation disclosure.
- Disabling one adapter does not block other destinations.

### Milestone 7 - Analytics feedback loop

- [ ] Ingest 1h/24h/7d/30d metrics where official APIs permit.
- [ ] Normalize without pretending metrics are identical across platforms.
- [ ] Add source destination/variant attribution and manual DM-source capture.
- [ ] Extend leaderboard to cross-account but keep flagship and satellite cohorts visible.
- [ ] Add recommendations as reviewable suggestions, not autonomous strategy changes.

Acceptance:

- Observations are immutable and reproducible.
- Proven-first selection changes only after minimum sample/confidence gates.
- No analytics process alters source facts or published history.

### Milestone 8 - Disclosed virtual archivist, optional

Begin only after phases 1-7 are stable and the owner approves identity, licensing, disclosure, and a kill switch.

- [ ] Identity bible, seed dataset rights, LoRA/model license review.
- [ ] Consistency benchmark across 20 curated outputs.
- [ ] Real product cutout compositing; generated product pixels prohibited.
- [ ] Platform AI labels/disclosures and bio wording.
- [ ] Separate content calendar and immediate global disable.

Acceptance:

- Consistent disclosed identity across the approved set.
- Product geometry/pixels remain from the real source.
- Persona retirement leaves flagship and core factory unaffected.

## 25. Milestone 0 execution record and next gate

Completed foundation work:

1. [x] Created versioned schemas for factory runs, source assets, content items, worker jobs, cutout QA, approvals, publish jobs, and destination configuration.
2. [x] Added deterministic 31-asset factory-plan and export-manifest fixtures plus contract examples.
3. [x] Extracted shared policy while preserving the `js/factory/core.js` public API.
4. [x] Added fail-closed destination configuration and flagship invariant tests.
5. [x] Added the GPU worker health/config/queue/logging/no-op spine and pytest suite.
6. [x] Added public environment documentation, secret exclusions, and CI verification.
7. [x] Proved remote mode defaults off and performs zero injected network calls.
8. [x] Passed current unit/E2E plus foundation and worker verification.

Next gate: Milestone 1 creates an authenticated Supabase control plane, migrations, RLS, private storage, and a local-to-remote sync bridge. It materially introduces external state and requires the operator's Supabase project choice/authorization before execution. Until then, `RBC_REMOTE_FACTORY=false` remains the only shipped default.

## 26. Definition of done for the ecosystem

The full objective is achieved when:

- A rights-cleared bag source can be submitted from the phone or workstation.
- The RTX worker produces a high-quality cutout, crops, attributes, and QA without manual file shuffling.
- The system creates versioned multi-platform assets and copy, all traceable to source facts and licenses.
- The operator can review a week of output in under 30 minutes.
- Approved satellite/Pinterest/blog content publishes through official interfaces with idempotency and observable retries.
- The flagship remains manual under every tested configuration.
- Metrics return to a trustworthy dashboard and influence future variants only through guarded rules.
- Turning off the cloud, GPU, AI provider, n8n, or any one platform still leaves a useful local studio and manual export path.

## 27. Primary technical references checked for this plan

- BiRefNet official repository and model zoo: https://github.com/ZhengPeng7/BiRefNet
- BRIA RMBG 2.0 model/license card: https://huggingface.co/briaai/RMBG-2.0
- BRIA Remove Background API/pricing: https://platform.bria.ai/image-editing/remove-background
- PhotoRoom Remove Background API/pricing: https://www.photoroom.com/api/remove-background
- SAM 3 official repository: https://github.com/facebookresearch/sam3
- BackgroundMattingV2 official repository: https://github.com/PeterL1n/BackgroundMattingV2
- Qwen3-VL official repository: https://github.com/QwenLM/Qwen3-VL
- ComfyUI server routes: https://docs.comfy.org/development/comfyui-server/comms_routes
- Supabase Queues: https://supabase.com/docs/guides/queues
- n8n queue mode: https://docs.n8n.io/hosting/scaling/queue-mode/
- Pinterest API v5 Pin creation: https://developers.pinterest.com/docs/work-with-organic-content-and-users/create-boards-and-pins/
- TikTok Content Posting API: https://developers.tiktok.com/doc/content-posting-api-get-started
- X API rate limits: https://docs.x.com/x-api/fundamentals/rate-limits
- Google Business Profile posts: https://developers.google.com/my-business/content/posts-data
- FLUX commercial/non-commercial licensing: https://bfl.ai/legal/self-hosted-commercial-license-terms and https://bfl.ai/legal/non-commercial-license-terms

Model/API versions, access tiers, platform policies, pricing, and licenses must be rechecked immediately before implementation or production enablement.
