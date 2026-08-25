-- This source file is part of the My Heart Counts LLM Evaluations open-source project
--
-- SPDX-FileCopyrightText: 2025-2026 Stanford University and the project authors (see CONTRIBUTORS.md)
--
-- SPDX-License-Identifier: MIT

-- Add a `redflag` flow. It mirrors the standard flow's display (bundle A/B,
-- 4 nudges per session, full question bundle) but samples from a separate
-- nudge pool (eligible_redflag) and tracks exposure independently via the
-- sessions.flow discriminator.
alter table sessions
  drop constraint if exists sessions_flow_check;

alter table sessions
  add constraint sessions_flow_check
    check (flow in ('standard', 'doctor', 'redflag'));

-- Per-flow eligibility flag for the red-flag pool. Existing rows default to
-- not-eligible; flip this column in the Supabase Table Editor (or via the
-- importer's --eligible-redflag flag) to opt a nudge into the red-flag pool.
alter table nudges
  add column if not exists eligible_redflag boolean not null default false;
