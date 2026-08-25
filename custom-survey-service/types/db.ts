//
// This source file is part of the My Heart Counts LLM Evaluations open-source project
//
// SPDX-FileCopyrightText: 2025-2026 Stanford University and the project authors (see CONTRIBUTORS.md)
//
// SPDX-License-Identifier: MIT
//

export type Axis =
  | "context_inclusion"
  | "appropriateness"
  | "coherence"
  | "motivation"
  | "actionability";

export interface QuestionRow {
  id: string;
  axis: Axis;
  prompt_text: string;
  response_type: "likert_1_7" | "yes_no";
  scale_min: number | null;
  scale_max: number | null;
  active: boolean;
}

export interface NudgeRow {
  id: string;
  title: string;
  body: string;
  source_model: string | null;
  metadata_json: Record<string, unknown>;
  active: boolean;
  eligible_standard?: boolean;
  eligible_doctor?: boolean;
  eligible_redflag?: boolean;
}

export type SessionFlow = "standard" | "doctor" | "redflag";

export interface SessionRow {
  id: string;
  evaluator_id: string;
  flow: SessionFlow;
}

export interface EvaluatorRow {
  id: string;
  email: string;
  evaluator_code_hash: string;
  active: boolean;
  first_name: string | null;
  last_name: string | null;
}
