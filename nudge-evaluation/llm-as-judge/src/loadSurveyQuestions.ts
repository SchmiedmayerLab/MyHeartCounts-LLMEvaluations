//
// This source file is part of the My Heart Counts LLM Evaluations open-source project
//
// SPDX-FileCopyrightText: 2025-2026 Stanford University and the project authors (see CONTRIBUTORS.md)
//
// SPDX-License-Identifier: MIT
//

import { readFile } from "node:fs/promises";
import { type Axis, type ResponseType, type SurveyQuestion } from "./types.js";

const SQL_STRING = String.raw`'([^']*(?:''[^']*)*)'`;
const SQL_IDENTIFIER = String.raw`'(\w+)'`;
const SQL_LITERAL = String.raw`(\w+)`;

const QUESTION_ROW_REGEX = new RegExp(
  String.raw`\(${SQL_STRING},\s*${SQL_IDENTIFIER},\s*${SQL_STRING},\s*${SQL_IDENTIFIER},\s*${SQL_LITERAL},\s*${SQL_LITERAL},\s*${SQL_LITERAL}\)`,
  "gms",
);

const AXES: readonly string[] = [
  "context_inclusion",
  "appropriateness",
  "coherence",
  "motivation",
  "actionability",
];

const RESPONSE_TYPES: readonly string[] = ["likert_1_7", "yes_no"];

const isAxis = (value: string): value is Axis => AXES.includes(value);

const isResponseType = (value: string): value is ResponseType =>
  RESPONSE_TYPES.includes(value);

const RUBRIC_UPDATE_REGEX =
  /update questions\s+set body_markdown = \$\$([\s\S]*?)\$\$\s+where stable_key = '((?:''|[^'])*)';/gim;

const unescapeSqlString = (value: string): string =>
  value.replaceAll("''", "'");

const parseOptionalInt = (value: string): number | null =>
  value.toLowerCase() === "null" ? null : Number(value);

const requireCapture = (value: string | undefined, label: string): string => {
  if (value === undefined) {
    throw new Error(`Failed to parse SQL capture group: ${label}`);
  }
  return value;
};

const parseRubricsByStableKey = (sql: string): Map<string, string> => {
  const byStableKey = new Map<string, string>();

  for (const match of sql.matchAll(RUBRIC_UPDATE_REGEX)) {
    const rubric = requireCapture(match[1], "rubric");
    const stableKey = unescapeSqlString(requireCapture(match[2], "stable_key"));
    byStableKey.set(stableKey, rubric.trim());
  }

  return byStableKey;
};

export const loadSurveyQuestionsFromSql = async (
  sqlPath: string,
  includeInactive = false,
): Promise<SurveyQuestion[]> => {
  const sql = await readFile(sqlPath, "utf8");
  const rubricsByStableKey = parseRubricsByStableKey(sql);
  const questions: SurveyQuestion[] = [];

  let ordinal = 0;
  for (const match of sql.matchAll(QUESTION_ROW_REGEX)) {
    const stableKey = unescapeSqlString(requireCapture(match[1], "stable_key"));
    const axis = requireCapture(match[2], "axis");
    const promptText = unescapeSqlString(
      requireCapture(match[3], "prompt_text"),
    );
    const responseType = requireCapture(match[4], "response_type");

    if (!isAxis(axis) || !isResponseType(responseType)) {
      continue;
    }
    const scaleMin = parseOptionalInt(requireCapture(match[5], "scale_min"));
    const scaleMax = parseOptionalInt(requireCapture(match[6], "scale_max"));
    const active = requireCapture(match[7], "active").toLowerCase() === "true";

    if (!includeInactive && !active) {
      continue;
    }

    questions.push({
      stableKey,
      axis,
      promptText,
      bodyMarkdown: rubricsByStableKey.get(stableKey) ?? "",
      responseType,
      scaleMin,
      scaleMax,
      active,
      ordinal,
    });
    ordinal += 1;
  }

  if (questions.length === 0) {
    throw new Error(`No questions parsed from SQL migration at ${sqlPath}`);
  }

  return questions;
};
