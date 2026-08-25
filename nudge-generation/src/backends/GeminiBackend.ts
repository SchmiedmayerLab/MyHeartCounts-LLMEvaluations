//
// This source file is part of the My Heart Counts LLM Evaluations open-source project
//
// SPDX-FileCopyrightText: 2025-2026 Stanford University and the project authors (see CONTRIBUTORS.md)
//
// SPDX-License-Identifier: MIT
//

import { GoogleGenAI } from "@google/genai";
import { type ModelBackend, type GenerateOptions } from "./ModelBackend.js";
import { type ModelConfig } from "../config/models.js";
import { NUDGE_MESSAGES_JSON_SCHEMA } from "../config/nudgeResponseSchema.js";

export class GeminiBackend implements ModelBackend {
  readonly modelId: string;
  readonly provider = "gemini" as const;
  private ai: GoogleGenAI;

  constructor(config: ModelConfig, apiKey: string) {
    this.modelId = config.id;
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const timeout: number =
      typeof options?.timeout === "number" ? options.timeout : 120000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const responseSchema =
        typeof options?.response_format === "object" ?
          (
            options.response_format as {
              type: string;
              json_schema: { name: string; schema: Record<string, unknown> };
            }
          ).json_schema.schema
        : (NUDGE_MESSAGES_JSON_SCHEMA as unknown as Record<string, unknown>);

      const maxOutputTokens =
        options?.maxTokens ? Math.max(options.maxTokens, 8192) : undefined;

      const response = await this.ai.models.generateContent({
        model: this.modelId,
        contents: prompt,
        config: {
          maxOutputTokens,
          temperature: options?.temperature,
          responseMimeType: "application/json",
          responseJsonSchema: responseSchema,
          abortSignal: controller.signal,
        },
      });

      clearTimeout(timeoutId);

      const text = response.text;
      if (!text) {
        throw new Error("Gemini returned an empty response");
      }
      return text.replace(/,\s*([}\]])/g, "$1");
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(`Request timeout after ${timeout / 1000} seconds`, {
            cause: error,
          });
        }
        throw error;
      }
      throw new Error(`Unknown error: ${String(error)}`, { cause: error });
    }
  }

  supportsModel(modelId: string): boolean {
    return modelId === this.modelId;
  }
}
