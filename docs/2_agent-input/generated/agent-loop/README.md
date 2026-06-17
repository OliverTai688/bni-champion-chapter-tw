# take-seat Agent Development Loop

Date: 2026-06-17
Status: READY_TO_START

This directory defines the repeatable development loop for `take-seat`.

The loop is interface-first and privacy-backed:

1. Make useful page/workflow surfaces visible.
2. Add the smallest domain/API/state contract needed to make them real.
3. Prove public/member/staff/admin data boundaries.
4. Save evidence before claiming completion.
5. Stop at review gates.

## Required Reading Order

1. `AGENTS.md`
2. `docs/2_agent-input/AGENTS.md`
3. `docs/2_agent-input/generated/agent-loop/development-strategy.md`
4. `docs/2_agent-input/generated/agent-loop/loop-state.json`
5. Current batch plan
6. Relevant PRD/ARC/REF/ACC docs
7. Relevant source code and `package.json`

## Current Start Point

Start with:

- Batch: `TAKE-AUDIT-001`
- Slice: `current-codebase-audit-and-contract-gap`
- Plan: `docs/05_execution-plans/PLN-001_live-seat-map-attendance-voting-batch-plan.md`

## Stop Gates

Stop and write a report when:

- User says `STOP_AND_REPORT`, `暫停回報`, or similar.
- A page/interface group is visible enough for review.
- A cross-page flow is connected enough for review.
- A privacy, auth, persistence, or product decision is needed.
- Validation fails due to a real issue.
- `loop-state.json` reaches `stopAfterCycles`.

## Reports

Use `report-template.md`.

Save reports under:

```txt
docs/2_agent-input/generated/agent-loop/reports/
```
