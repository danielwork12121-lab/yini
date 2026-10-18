/**
 * One narrow entry point for every model call: `generateJSON`.
 *
 * It takes a Zod schema and will not return until the model's output satisfies it,
 * or it gives up. Callers never see raw model text, so a malformed response cannot
 * become a half-rendered nudge in front of a user.
 */
import 'server-only';
import type { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { env } from '@/lib/env';
import { geminiFetch } from './geminiFetch';

export type Provider = 'anthropic' | 'openai' | 'gemini' | 'mock';

export class ModelError extends Error {}

/** Models wrap JSON in prose or fences often enough that this is not optional. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start !== -1 && end > start ? text.slice(start, end + 1) : text.trim();
}

async function callAnthropic(model: string, system: string, user: string): Promise<string> {
  const key = env.anthropicKey();
  if (!key) throw new ModelError('ANTHROPIC_API_KEY not set');
  const res = await new Anthropic({ apiKey: key }).messages.create({
    model, max_tokens: 2000, system,
    messages: [{ role: 'user', content: user }, { role: 'assistant', content: '{' }],
  });
  const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  return '{' + text; // prefilled '{' forces JSON and is not echoed back
}

async function callOpenAI(model: string, system: string, user: string): Promise<string> {
  const key = env.openaiKey();
  if (!key) throw new ModelError('OPENAI_API_KEY not set');
  const res = await new OpenAI({ apiKey: key }).chat.completions.create({
    model, response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  });
  return res.choices[0]?.message?.content ?? '';
}

async function callGemini(model: string, system: string, user: string): Promise<string> {
  if (!env.geminiKey()) throw new ModelError('GEMINI_API_KEY not set');
  const res = await geminiFetch(model, {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
  });
  if (!res.ok) throw new ModelError(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
}

/**
 * Ask a model for JSON matching `schema`.
 *
 * On a schema miss it retries ONCE, handing the model its own validation errors —
 * that recovers most failures. A second miss throws, and the caller falls back to
 * a deterministic safe response rather than showing the user something broken.
 *
 * `mockFn` runs when no key is configured, which keeps the whole path exercisable.
 */
export async function generateJSON<T extends z.ZodTypeAny>(args: {
  schema: T;
  system: string;
  user: string;
  kind: 'classify' | 'compose';
  provider?: Provider;
  mockFn: () => z.infer<T>;
}): Promise<z.infer<T>> {
  const provider = args.provider ?? env.llmProvider();
  if (provider === 'mock') return args.schema.parse(args.mockFn());

  const model = env.model(args.kind);
  const call = (u: string) =>
    provider === 'anthropic' ? callAnthropic(model, args.system, u)
    : provider === 'openai' ? callOpenAI(model, args.system, u)
    : callGemini(model, args.system, u);

  let lastIssues = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0
      ? args.user
      : `${args.user}\n\nYour previous reply did not validate. Fix exactly these problems and return JSON only:\n${lastIssues}`;
    let raw: string;
    try {
      raw = await call(prompt);
    } catch (e) {
      throw new ModelError(`${provider} call failed: ${(e as Error).message}`);
    }
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(extractJson(raw));
    } catch {
      lastIssues = 'Output was not valid JSON. Return a single JSON object and nothing else.';
      continue;
    }
    const result = args.schema.safeParse(parsedJson);
    if (result.success) return result.data;
    lastIssues = result.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n');
  }
  throw new ModelError(`${provider} output failed schema validation twice:\n${lastIssues}`);
}
