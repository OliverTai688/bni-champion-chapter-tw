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
- `docs/02_architecture-and-rules/ARC-001_live-seat-map-attendance-voting-architecture.md`
- `docs/02_architecture-and-rules/ARC-002_mongodb-prisma-r2-storage-architecture.md`
- `docs/03_feature-reference/REF-001_current-seating-workspace.md`
- `docs/03_feature-reference/REF-002_current-feature-inventory.md`
- `docs/05_execution-plans/PLN-001_live-seat-map-attendance-voting-batch-plan.md`
- `docs/05_execution-plans/PLN-002_mongodb-prisma-r2-development-plan.md`
- `docs/08_acceptance-and-qa/ACC-001_live-seat-map-attendance-voting-acceptance.md`
- `docs/08_acceptance-and-qa/ACC-002_mongodb-prisma-r2-acceptance.md`

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
