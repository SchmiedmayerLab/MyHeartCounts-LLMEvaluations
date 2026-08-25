//
// This source file is part of the My Heart Counts LLM Evaluations open-source project
//
// SPDX-FileCopyrightText: 2025-2026 Stanford University and the project authors (see CONTRIBUTORS.md)
//
// SPDX-License-Identifier: MIT
//

export const NUDGE_MESSAGES_SCHEMA_NAME = "nudge_messages";

export const NUDGE_MESSAGES_JSON_SCHEMA = {
  type: "object",
  properties: {
    nudges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description:
              "Short summary/call to action for the push notification",
          },
          body: {
            type: "string",
            description:
              "Motivational message content for the push notification",
          },
        },
        required: ["title", "body"],
        additionalProperties: false,
      },
      minItems: 7,
      maxItems: 7,
      description: "Exactly 7 nudge messages",
    },
  },
  required: ["nudges"],
  additionalProperties: false,
} as const;
