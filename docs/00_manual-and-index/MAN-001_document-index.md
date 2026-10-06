# MAN-001: take-seat Documentation Index

Status: Active
Date: 2026-06-17

## Purpose

This index defines the documentation structure for `take-seat`.

The project is currently a weekly BNI seating workspace. The next direction is a fuller site that gradually reveals event state through a seat map: attendance, member participation, voting, and post-event review.

## Folder Structure

| Folder | Purpose |
| --- | --- |
| `00_manual-and-index` | Documentation index, usage manuals, onboarding |
| `01_product-requirements` | Product requirements and product decisions |
| `02_architecture-and-rules` | System boundaries, domain rules, DTO contracts, privacy rules |
| `03_feature-reference` | Current feature behavior and implemented references |
| `04_ui-proposals` | Interface proposals and clickable prototypes |
| `05_execution-plans` | Batch plans and phased implementation plans |
| `08_acceptance-and-qa` | Acceptance criteria, QA scenarios, evidence requirements |
| `2_agent-input` | Agent loop instructions, generated plans, reports, screenshots |

Existing root-level docs remain references until a cleanup batch moves them.

## Current Core References

- `docs/bni-chapter-system-architecture.md` - BNI chapter system direction.
- `docs/seating-module-formalization.md` - current seating module formalization.
- `docs/rule.md` - seating rules.
- `docs/pdf-export-plan.md` - print/PDF plan.

## Live Seat Map Planning Set

- `docs/01_product-requirements/PRD-001_live-seat-map-attendance-voting.md`
- `docs/01_product-requirements/PRD-002_weekly-public-event-page-and-anonymous-star-voting.md`
- `docs/02_architecture-and-rules/ARC-001_live-seat-map-attendance-voting-architecture.md`
- `docs/02_architecture-and-rules/ARC-002_mongodb-prisma-r2-storage-architecture.md`
- `docs/02_architecture-and-rules/ARC-003_weekly-public-page-and-vote-access-architecture.md`
- `docs/02_architecture-and-rules/ARC-004_multi-day-seat-map-and-poll-targeting-architecture.md`
- `docs/02_architecture-and-rules/ARC-005_one-to-many-seat-template-event-page-architecture.md`
- `docs/03_feature-reference/REF-001_current-seating-workspace.md`
- `docs/03_feature-reference/REF-002_current-feature-inventory.md`
- `docs/03_feature-reference/REF-003_multi-date-seating-template-workflow.md`
- `docs/05_execution-plans/PLN-001_live-seat-map-attendance-voting-batch-plan.md`
- `docs/05_execution-plans/PLN-002_mongodb-prisma-r2-development-plan.md`
- `docs/05_execution-plans/PLN-003_weekly-public-page-and-star-voting-batch-plan.md`
- `docs/08_acceptance-and-qa/ACC-001_live-seat-map-attendance-voting-acceptance.md`
- `docs/08_acceptance-and-qa/ACC-002_mongodb-prisma-r2-acceptance.md`
- `docs/08_acceptance-and-qa/ACC-003_weekly-public-page-and-star-voting-acceptance.md`

## Chamber Toolbox Planning Set

- `docs/02_architecture-and-rules/ARC-006_chamber-toolbox-ssot-and-router-architecture.md`
- `docs/05_execution-plans/PLN-004_chamber-toolbox-router-migration-plan.md`
- `docs/05_execution-plans/PLN-005_router-v2-and-page-task-plan.md`
- `docs/02_architecture-and-rules/ARC-007_toolbox-implementation-conventions.md`
- `docs/08_acceptance-and-qa/ACC-004_chamber-toolbox-crud-acceptance.md`
- `docs/04_ui-proposals/UIP-001_chamber-toolbox-console.html`

## Agent Loop References

- `docs/2_agent-input/AGENTS.md`
- `docs/2_agent-input/generated/agent-loop/README.md`
- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/2_agent-input/generated/agent-loop/report-template.md`

## Naming Conventions

Use stable prefixes:

- `MAN-###` for manual/index docs.
- `PRD-###` for product requirements.
- `ARC-###` for architecture/rules.
- `REF-###` for feature references.
- `PLN-###` for execution plans.
- `ACC-###` for acceptance and QA.

Keep filenames lowercase after the prefix and use hyphens.

## Release Set (2026-10-06)

- `docs/05_execution-plans/PLN-006_organization-release-runbook.md` - environment variables, release steps, rollback.
- `docs/08_acceptance-and-qa/ACC-005_release-hardening-and-ai-seating-acceptance.md` - security, LINE login, legacy migration, AI seating API evidence.
