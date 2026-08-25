//
// This source file is part of the My Heart Counts LLM Evaluations open-source project
//
// SPDX-FileCopyrightText: 2025-2026 Stanford University and the project authors (see CONTRIBUTORS.md)
//
// SPDX-License-Identifier: MIT
//

import { BackendFactory } from "../../../nudge-generation/src/backends/BackendFactory.js";
import { type ModelBackend } from "../../../nudge-generation/src/backends/ModelBackend.js";
import {
  MODEL_CONFIGS,
  type ModelConfig,
} from "../../../nudge-generation/src/config/models.js";

type JudgeModelConfig = ModelConfig & {
  provider: "openai" | "securegpt" | "gemini";
};

export interface GenerateJsonParams {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  responseSchemaName: string;
  responseSchema: Record<string, unknown>;
}

const cleanJsonLikeText = (value: string): string => {
  let cleaned = value.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/, "")
      .trim();
  }
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");
  return cleaned;
};

export class JudgeModelClient {
  readonly modelConfig: JudgeModelConfig;
  readonly backend: ModelBackend;
  private readonly defaultTemperature: number;

  constructor(modelId: string, temperature?: number) {
    this.defaultTemperature = temperature ?? 0.1;
    const modelConfig = MODEL_CONFIGS.find(
      (candidate) => candidate.id === modelId,
    );
    if (!modelConfig) {
      throw new Error(`Unknown model id: ${modelId}`);
    }
    if (
      modelConfig.provider !== "openai" &&
      modelConfig.provider !== "securegpt" &&
      modelConfig.provider !== "gemini"
    ) {
      throw new Error(
        `Model provider ${modelConfig.provider} is unsupported for llm-as-judge. Use openai, securegpt, or gemini models.`,
      );
    }

    const openAIApiKey = process.env.OPENAI_API_KEY;
    const secureGPTApiKey = process.env.SECUREGPT_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const judgeModelConfig = modelConfig as JudgeModelConfig;
    this.backend = BackendFactory.create(
      modelConfig,
      openAIApiKey,
      undefined,
      secureGPTApiKey,
      geminiApiKey,
    );
    this.modelConfig = judgeModelConfig;
  }

  async generateJson(
    params: GenerateJsonParams,
  ): Promise<{ parsed: unknown; raw: string }> {
    const timeoutMs =
      params.timeoutMs ?? (this.modelConfig.config?.timeout ?? 120) * 1000;

    const raw = await this.backend.generate(params.prompt, {
      maxTokens: params.maxTokens ?? 1600,
      temperature: params.temperature ?? this.defaultTemperature,
      timeout: timeoutMs,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: params.responseSchemaName,
          schema: params.responseSchema,
        },
      },
    });

    const cleaned = cleanJsonLikeText(raw);
    const parsed: unknown = JSON.parse(cleaned);
    return { parsed, raw };
  }
}
