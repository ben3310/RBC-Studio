# RBC GPU worker spine

Milestone 0 provides configuration validation, JSON logging, health/readiness routes, a queue protocol, and an in-memory `noop.v1` job. It performs no inference, claims no remote jobs, and makes no network request by default.

Run tests from the repository root:

```powershell
python -m pytest services/gpu-worker/tests
```

Run the local health service:

```powershell
Set-Location services/gpu-worker
python -m rbc_worker
```

Remote queue claims and model adapters are deliberately deferred to the gated milestones in `CODEXPLAN.md`.
