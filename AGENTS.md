# AGENTS.md

This file guides Codex agents working in the `take-seat` project.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Identity

`take-seat` is a Next.js 16 App Router project for BNI 長冠軍分會 seat planning.

The current product is a weekly seating workspace:

- `/` is a public entry page.
- `/seats` is the main drag-and-drop seating workspace.
- `/seats/print` renders the print/PDF view from saved workspace state.
- Current data is static TypeScript seed data plus browser `localStorage`.
- The next product direction is a fuller event website with live seat map, attendance presence, member voting, and evidence-backed operating workflows.

Do not treat this repository as `2026-nuvaclub`. That repository is a reference for agent workflow, batch tasks, and evidence reports only.

## Commands

Use package scripts that exist in this repository:

```bash
pnpm run dev
pnpm run build
pnpm run lint
git diff --check
```

No test framework is currently configured. If you need automated coverage, add it intentionally and document the reason.

## Required Reading Order

Before changing code, read in this order:

1. This `AGENTS.md`.
2. Relevant Next.js 16 docs under `node_modules/next/dist/docs/`.
3. `docs/00_manual-and-index/MAN-001_document-index.md`.
4. Relevant product, architecture, feature, plan, and acceptance docs under `docs/`.
5. Relevant source files.
6. `package.json` scripts.

For App Router work, usually read:

- `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/02-guides/data-security.md`
- Route/API/caching docs that match the specific change.

## Current Architecture

Current important files:

- `src/app/page.tsx` - home entry page.
- `src/app/seats/page.tsx` - server page that loads current week seed data and mounts the workspace.
- `src/app/seats/print/page.tsx` - print route.
- `src/components/SeatingArranger.tsx` - main client workspace, dnd, validation summary, CSV/PDF actions.
- `src/components/RuleEditor.tsx` - rule/roster editing panel.
- `src/types/seating.ts` - domain-facing seating types.
- `src/lib/seating-week.ts` - current week selection.
- `src/lib/layout-*.ts` - weekly seat roster/layout seeds.
- `src/lib/seating-storage.ts` - `SeatingWorkspaceRepository` and localStorage implementation.
- `src/lib/seating-validation.ts` - seating rule validation.
- `src/lib/seating-export.ts` - CSV export helpers.

Current data boundary:

```txt
seed roster/layout -> /seats server page -> client workspace -> localStorage draft -> CSV/print export
```

Future data boundary should evolve toward:

```txt
domain rules -> application DTO/services -> repository port -> storage/API implementation -> route/component UI
```

## Engineering Rules

- Keep source changes small and tied to a documented task, bug, acceptance case, or explicit user request.
- Preserve unrelated worktree changes. This repo currently has many uncommitted files; do not revert them.
- Prefer TypeScript domain types over ad hoc objects.
- Keep browser-only APIs such as `window`, `localStorage`, drag-and-drop sensors, and print actions inside Client Components or client-side repositories.
- Keep pages/layouts as Server Components unless interactivity is required.
- Do not pass private attendee/member data into public Client Components. Create explicit DTOs for public, member, staff, and admin views.
- Use `lucide-react` icons for UI controls when an icon exists.
- Avoid production database mutations unless the user explicitly approves the target environment and mutation scope.
- Never store secrets, raw cookies, tokens, QR confirmation codes, or credentials in docs, reports, screenshots, or committed files.

## Documentation Structure

Use this docs shape for new work:

```txt
docs/
  00_manual-and-index/       index, usage manuals, onboarding
  01_product-requirements/   PRD files
  02_architecture-and-rules/ architecture, contracts, security rules
  03_feature-reference/      implemented feature references
  05_execution-plans/        batch plans and implementation plans
  08_acceptance-and-qa/      acceptance criteria and QA reports
  2_agent-input/             agent loop instructions and generated evidence
```

Existing legacy docs in the root of `docs/` are still valid references. Do not move them casually; moving docs should be its own documented cleanup batch.

## Acceptance-Driven Workflow

Use this loop for meaningful product work:

```txt
Read product/architecture/acceptance docs
-> inspect current code behavior
-> choose one batch or narrow task
-> design minimal contracts and UI states
-> implement
-> validate with scripts/browser proof where relevant
-> save evidence/report under docs/2_agent-input/generated/agent-loop/reports/
```

Do not mark a task as passed without evidence. If a task cannot be automated, mark it `MANUAL_REQUIRED` and explain the exact manual check.

## Live Seat Map Product Direction

The next larger product arc is documented in:

- `docs/01_product-requirements/PRD-001_live-seat-map-attendance-voting.md`
- `docs/02_architecture-and-rules/ARC-001_live-seat-map-attendance-voting-architecture.md`
- `docs/05_execution-plans/PLN-001_live-seat-map-attendance-voting-batch-plan.md`
- `docs/08_acceptance-and-qa/ACC-001_live-seat-map-attendance-voting-acceptance.md`

Core privacy rule:

- Public view: anonymous seat/attendance statistics only.
- Member view: own seat and allowed public profile cards only.
- Staff view: check-in workflow and scoped attendance summary.
- Admin view: full operating cockpit, exports, and audit trail.

Email, confirmation codes, raw user IDs, private notes, and full attendee lists must never appear in public DTOs.

## Agent Loop

For long-running work, use:

- `docs/2_agent-input/AGENTS.md`
- `docs/2_agent-input/generated/agent-loop/README.md`
- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/2_agent-input/generated/agent-loop/report-template.md`

Stop and report when:

- The user says `STOP_AND_REPORT`, `暫停回報`, or similar.
- A visible page slice is ready for review.
- A cross-page flow is connected enough for review.
- A product/security/data decision is needed.
- Validation fails for a real issue.

Reports must include changed files, visible routes, contracts, validation commands, evidence paths, and the recommended next task.

## Current Batch Status

Initial planning/docs batch:

- [x] Establish docs folder structure for take-seat.
- [x] Create product, architecture, execution, acceptance, and agent-loop docs.
- [x] Rewrite root `AGENTS.md` for take-seat.
- [ ] Implement live event website routes.
- [ ] Implement persistent seat map domain/repository.
- [ ] Implement attendance presence states.
- [ ] Implement member voting.
- [ ] Add browser/API evidence for public/member/staff/admin boundaries.
