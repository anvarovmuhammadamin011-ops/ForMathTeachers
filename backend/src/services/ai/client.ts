import { config, aiConfigured } from '../../config.js';
import { ApiError } from '../../lib/errors.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } }
      >;
}

interface ChatOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  timeoutMs?: number;
}

export class AiNotConfiguredError extends ApiError {
  constructor() {
    super(
      503,
      'AI_NOT_CONFIGURED',
      'AI xizmati sozlanmagan. Serverda AI_API_KEY (va kerak bo‘lsa AI_BASE_URL, AI_MODEL) ni kiriting.',
    );
  }
}

export function assertAiConfigured() {
  if (!aiConfigured) throw new AiNotConfiguredError();
}

type FetchLikeResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
};

async function callOnce(options: ChatOptions): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? config.ai.timeoutMs);
  try {
    const body: Record<string, unknown> = {
      model: options.model ?? config.ai.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 8000,
    };
    if (options.json) body.response_format = { type: 'json_object' };

    let response: FetchLikeResponse;
    try {
      response = (await fetch(`${config.ai.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.ai.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })) as unknown as FetchLikeResponse;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new ApiError(504, 'AI_TIMEOUT', 'AI javobi juda kechikdi. Qayta urinib ko‘ring.');
      }
      throw new ApiError(
        502,
        'AI_NETWORK_ERROR',
        'AI xizmatiga ulanib bo‘lmadi. Internet va API manzilini tekshiring.',
      );
    }

    const raw = await response.text();
    if (!response.ok) {
      let detail = raw.slice(0, 500);
      try {
        const parsed = JSON.parse(raw) as { error?: { message?: string } };
        if (parsed.error?.message) detail = parsed.error.message;
      } catch {
        /* ignore */
      }
      throw new ApiError(
        502,
        'AI_API_ERROR',
        `AI xizmati xato qaytardi (${response.status}): ${detail}`,
      );
    }

    const data = JSON.parse(raw) as {
      choices?: Array<{ message?: { content?: string | Array<{ type: string; text?: string }> } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim()) return content;
    if (Array.isArray(content)) {
      const joined = content
        .map((part) => (part.type === 'text' ? part.text ?? '' : ''))
        .join('\n')
        .trim();
      if (joined) return joined;
    }
    throw new ApiError(502, 'AI_EMPTY_RESPONSE', 'AI bo‘sh javob qaytardi. Qayta urinib ko‘ring.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function chatCompletion(options: ChatOptions): Promise<string> {
  assertAiConfigured();
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await callOnce(options);
    } catch (error) {
      lastError = error;
      const status = error instanceof ApiError ? error.status : 500;
      const retryable = status === 429 || status === 502 || status === 503 || status === 504;
      if (!retryable || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }
  throw lastError;
}

export function extractJsonObject<T>(raw: string): T {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '');
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new ApiError(502, 'AI_INVALID_JSON', 'AI javobi kutilgan JSON formatida emas.');
  }
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    throw new ApiError(502, 'AI_INVALID_JSON', 'AI javobini o‘qishda xatolik yuz berdi.');
  }
}
