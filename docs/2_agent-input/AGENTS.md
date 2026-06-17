# take-seat Agent Input Guide

Use this file for long-running or batch-oriented work in `take-seat`.

The workflow is adapted from `/Users/pzps0964713/Documents/github/2026-nuvaclub`, but all product assumptions here belong to `take-seat`.

## Primary Goal

Deliver small, reviewable, evidence-backed improvements toward:

```txt
weekly seating workspace
-> complete event/meeting website
-> live seat map
-> attendance presence
-> member voting
-> post-event evidence and recap
```

## Required Reading Order

1. Root `AGENTS.md`.
2. `docs/00_manual-and-index/MAN-001_document-index.md`.
3. `docs/2_agent-input/generated/agent-loop/README.md`.
4. `docs/2_agent-input/generated/agent-loop/development-strategy.md`.
5. `docs/2_agent-input/generated/agent-loop/loop-state.json`.
6. Current batch plan in `docs/05_execution-plans/`.
7. Relevant PRD/ARC/REF/ACC docs.
8. Relevant source code and `package.json`.

## Batch Rules

- Work one batch at a time.
- Do not process unrelated batches because they are nearby.
- If a product, privacy, or persistence decision is missing, stop and report.
- Preserve unrelated worktree changes.
- Do not mutate production databases or external systems without explicit approval.
- Do not store secrets, raw cookies, QR codes, confirmation codes, tokens, or credentials in evidence.

## Evidence Rules

For every stop report, include:

- Batch/task IDs.
- Routes/pages now visible.
- Frontend changes.
- Backend/API/server changes.
- Data/state changes.
- Privacy/security boundaries.
- Validation commands and results.
- Evidence paths.
- Open decisions.
- Recommended next task.

Save reports under:

```txt
docs/2_agent-input/generated/agent-loop/reports/
```
