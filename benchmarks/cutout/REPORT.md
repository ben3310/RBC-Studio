# Cutout benchmark report

Status: harness verified; production benchmark not run.

The repository contains three RBC-authored geometric fixtures that exercise a
thin handle, an interior opening, and low contrast. They verify manifest rights,
hashes, metrics, deterministic output, and reporting without committing private
bag photography.

The Milestone 2 production gate remains closed until all of the following exist:

- 100 rights-cleared representative handbag sources and human-reviewed masks;
- an approved exact BiRefNet code/weight revision and artifact SHA-256;
- actual RTX 3080 latency, peak VRAM, CUDA OOM recovery, and determinism data;
- same-set commercial fallback and optional SAM-assisted comparison results;
- operator acceptance of at least 95% zero-correction output, or a separately
  documented realistic threshold with manual review retained.

Run the public-safe harness:

```powershell
python -m rbc_worker.benchmark --manifest benchmarks/cutout/manifest.json
```

Never copy the private benchmark images, masks, signed URLs, or commercial API
responses into Git. Only aggregate results and approved license references belong
in this report.
