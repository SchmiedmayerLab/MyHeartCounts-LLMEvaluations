<!--
This source file is part of the My Heart Counts LLM Evaluations open-source project
SPDX-FileCopyrightText: 2025-2026 Stanford University and the project authors (see CONTRIBUTORS.md)
SPDX-License-Identifier: MIT
-->

# Custom Survey Service

Next.js survey service for MyHeartCounts motivational nudge evaluation.

## What this implements

- Evaluator login via email + evaluator ID verification
- Alternate `.edu` affiliate login for any `*.edu` email with a shared password, plus required first/last name capture
- Three parallel survey flows, selected by which shared password the affiliate enters:
  - **Standard flow** (`STANFORD_AFFILIATE_PASSWORD`): bundle A or B with **4 nudges** per session, sampled from `eligible_standard=TRUE` nudges
  - **Doctor flow** (`DOCTOR_AFFILIATE_PASSWORD`): single `ap_comorbidity` question with **all `eligible_doctor=TRUE` nudges** shown per session (session size is derived from the DB at request time, not a fixed constant), with an inline free-response prompt whenever the rater scores 3 or lower; doctor responses are MD-flagged via `sessions.flow = 'doctor'`
  - **Red-flag flow** (`REDFLAG_AFFILIATE_PASSWORD`): identical display to the standard flow (bundle A or B, **4 nudges** per session, full question bundle) but samples only from `eligible_redflag=TRUE` nudges and tracks bundle/nudge exposure independently via `sessions.flow = 'redflag'`
- Two fixed, mutually exclusive question bundles for the standard flow:
  - `bundle_a`: context inclusion + appropriateness
  - `bundle_b`: coherence + motivation + actionability
  - plus `bundle_doctor` (single-question) for the doctor flow
- Deterministic, quota-aware assignment:
  - balance bundle exposure over time (standard flow)
  - choose nudges with lowest global exposure first, computed per flow so doctor and standard pools are tracked independently
  - deterministic tie breaks from evaluator/session seed
- Per-flow nudge eligibility: each row in `nudges` carries `eligible_standard`, `eligible_doctor`, and `eligible_redflag` booleans. Toggle these in the Supabase Table Editor to control which pool a nudge participates in; a nudge may be in any combination of the standard, doctor, and red-flag pools.
- Matrix survey UI with same nudge rows across all questions in a session
- Bulk response submission and CSV export endpoint
- Manual nudge import script for `nudge-generation` CSV outputs

## Setup

1. Install dependencies:
   - `npm install`
2. Copy `.env.example` to `.env.local` and fill values.
   - Set `STANFORD_AFFILIATE_PASSWORD` for the standard `.edu` affiliate login.
   - Set `DOCTOR_AFFILIATE_PASSWORD` for the MD-flagged doctor flow login.
   - Set `REDFLAG_AFFILIATE_PASSWORD` for the red-flag flow login (a `.edu` email is required for all shared-password paths).
3. Apply SQL migrations in `supabase/migrations/`.
4. Seed at least one evaluator into the `evaluators` table before login works in a fresh environment:
   - Create a CSV (for example `supabase/seed_evaluators.csv`) with headers `email,evaluator_id,active` and at least one row.
   - Run `npm run import:evaluators -- supabase/seed_evaluators.csv` (executes `scripts/importEvaluators.ts`).
   - Alternative: run your own seed SQL file (for example `supabase/seed_evaluators.sql`) that inserts at least one row into `evaluators`.
5. Start dev server:
   - `npm run dev`

## Nudge import

The import script reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the process environment. Unlike the Next.js app, the `tsx`-run scripts do **not** auto-load `.env.local`, so load it into your shell first (from the `custom-survey-service` directory):

```bash
set -a
source .env.local
set +a
```

`set -a` exports every variable that `source` assigns so child processes (the `tsx` script) inherit them; `set +a` turns that back off. The variables persist for the rest of the shell session, so you only need to do this once per terminal.

Import a single generated CSV file:

- Standard flow only (default): `npm run import:nudges -- ../nudge-generation/dist/nudge_permutations_results_gpt-5_sample_2.csv`
- Doctor flow only: `npm run import:nudges -- ../data/generated/nudge-curation-v2/<filename>.csv --eligible-standard=false --eligible-doctor=true`
- Red-flag flow only: `npm run import:nudges -- ../data/generated/nudge-curation-v2/<filename>.csv --eligible-standard=false --eligible-redflag=true`
- Multiple flows: combine flags, e.g. `--eligible-standard=true --eligible-redflag=true`

The eligibility flags default to `--eligible-standard=true --eligible-doctor=false --eligible-redflag=false`, matching the original importer's behavior. Passing all three as `false` is rejected since the rows would never be selectable.

The script reads from `llmResponse` (generation output), `sampledNudgeJson` (single-sampled output), or `nudgeJson` (per-row expanded output), in that precedence order, and supports these JSON formats:
- direct array of `{title, body}`
- wrapped object `{ "nudges": [{title, body}] }`
- single object `{ "title": "...", "body": "..." }`

It also stores prompt metadata from CSV columns in `nudges.metadata_json` (for example `gender`, `comorbidities`, and `preferred_notification_time`) so evaluator UI can show context for matching question types.

When a CSV nudge matches an existing `nudges` row — by `dedupe_key` (same content + metadata) **or** by `(title, body)` only (same content under different metadata) — the importer does **not** insert a duplicate or refresh the existing row's other columns. It only OR's the requested eligibility flags (`eligible_standard`, `eligible_doctor`, `eligible_redflag`) onto the existing row. Re-running with `--eligible-redflag=true` against a row already in the standard pool therefore ends up with both flags set; re-running with `--eligible-standard=false` never demotes an existing standard nudge.

## Toggle question visibility

Use the `questions.active` boolean in Supabase Table Editor as the single on/off toggle.

- `active = true`: question can appear in evaluator sessions
- `active = false`: question is excluded at session creation time

Optional SQL to inspect active questions by bundle:

```sql
select
  qbi.bundle_id,
  q.stable_key,
  q.axis,
  q.active
from question_bundle_items qbi
join questions q on q.id = qbi.question_id
order by qbi.bundle_id, qbi.position_index;
```
