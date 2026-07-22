# RBC GPU worker

Milestone 2 adds a durable outbound-only cutout worker without enabling a model
or contacting a remote queue by default.

Implemented locally:

- atomic claim/lease, heartbeat, retry, cancellation, idempotent completion, and
  expired-lease recovery contracts;
- signed storage URL host/path enforcement, redirect rejection, byte/MIME
  binding, and source SHA-256 verification;
- isolated per-job temporary directories with guaranteed cleanup;
- deterministic transparent PNG, mask, light/dark preview, and QA bundle output;
- explainable cutout routing: `accept`, `manual_review`, `fallback`, or `reject`;
- a fail-closed BiRefNet adapter that requires an exact registry revision,
  artifact hash, commercial-use approval, and an explicitly installed local
  runner; it never downloads weights;
- rights-safe synthetic benchmark fixtures and aggregate reporting.

Run verification from the repository root:

```powershell
python -m pytest services/gpu-worker/tests
python -m ruff check services/gpu-worker
python -m rbc_worker.benchmark --manifest benchmarks/cutout/manifest.json
```

The synthetic harness is not the production benchmark. It must report
`production_gate_passed: false` until a private 100-image, human-masked,
rights-cleared set is evaluated.

## Default-off runtime

`python -m rbc_worker` still starts only the loopback health service. The durable
queue process is the installed `rbc-gpu-worker` command and refuses to start
unless all required settings are explicit:

```text
RBC_REMOTE_FACTORY=true
RBC_WORKER_QUEUES=cutout
RBC_SUPABASE_URL=https://<project>.supabase.co
RBC_SUPABASE_SERVICE_ROLE_KEY=<worker secret; never browser-side>
RBC_STORAGE_ALLOWED_HOSTS=<project>.supabase.co
RBC_MODEL_REGISTRY_PATH=<absolute path to approved registry JSON>
RBC_CUTOUT_PROVIDER=birefnet
RBC_CUTOUT_REVISION=<exact approved revision>
RBC_CUTOUT_RUNNER=<installed local module>:<callable>
RBC_MODEL_CACHE_DIR=<local model directory>
```

The checked-in registry deliberately contains `PENDING_OPERATOR_APPROVAL`, no
artifact path/hash, and `production_enabled: false`. Do not change those fields
until license review, private benchmark evidence, and RTX 3080 measurements are
recorded. Never place the service-role key, private benchmark files, signed URLs,
or model weights in Git.

`/healthz` reports process liveness only. When the cutout queue is requested,
`/readyz` returns HTTP 503 until remote mode, the storage allow-list, exact
registry record, local artifact hash, commercial approval, and runner import all
validate. It never treats the checked-in pending registry as ready.

## Recovery behavior

- A worker owns a job only while its worker ID, random lease token, and lease
  expiry match.
- Heartbeats extend the lease and observe cancellation.
- A killed worker's expired lease can be reclaimed with a new token; the old
  worker cannot complete it.
- Repeating the same completion is a no-op; a conflicting completion is rejected.
- Source downloads are immutable and hash-verified. Failure never deletes them.
- Low-confidence output routes to manual review/fallback and is never approved by
  the worker.
