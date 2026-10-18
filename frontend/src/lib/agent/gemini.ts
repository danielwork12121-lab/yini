/**
 * Gemini function-calling loop for the GATHER phase.
 *
 * Gemini cannot use tools and enforce a JSON response in the same call, so the
 * agent runs in two phases: this one may call tools and returns free-text working
 * notes; COMPOSE then runs through `generateJSON` against the Zod schema.
 */
import 'server-only';
import { geminiFetch } from '@/lib/llm/geminiFetch';
import { toFunctionDeclaration, type AgentTool } from './tools';

type Part = { text?: string; functionCall?: { name: string; args?: unknown }; [k: string]: unknown };
type Content = { role: 'user' | 'model'; parts: Part[] };

export const MAX_TOOL_ROUNDS = 4;

async function generate(model: string, body: unknown): Promise<Part[]> {
  const res = await geminiFetch(model, body);
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts ?? [];
}

export async function geminiGather(args: {
  model: string; system: string; prompt: string; tools: AgentTool[];
}): Promise<{ notes: string; toolCalls: number }> {
  const contents: Content[] = [{ role: 'user', parts: [{ text: args.prompt }] }];
  const base = {
    systemInstruction: { parts: [{ text: args.system }] },
    tools: [{ functionDeclarations: args.tools.map(toFunctionDeclaration) }],
    generationConfig: { temperature: 0.4 },
  };
  let toolCalls = 0;

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    // Last round forbids tools so the loop always ends in text.
    const toolConfig = round === MAX_TOOL_ROUNDS ? { functionCallingConfig: { mode: 'NONE' } } : undefined;
    const parts = await generate(args.model, { ...base, contents, ...(toolConfig ? { toolConfig } : {}) });
    const calls = parts.filter((p) => p.functionCall);
    if (!calls.length) {
      return { notes: parts.map((p) => p.text ?? '').join('').trim(), toolCalls };
    }
    // Echo the model turn back whole: thinking models attach signatures to these parts.
    contents.push({ role: 'model', parts });
    const responses: Part[] = [];
    for (const c of calls) {
      const t = args.tools.find((x) => x.name === c.functionCall!.name);
      const result = t ? await t.execute(c.functionCall!.args).catch((e: Error) => ({ error: e.message }))
        : { error: `unknown tool ${c.functionCall!.name}` };
      responses.push({ functionResponse: { name: c.functionCall!.name, response: { result } } });
      toolCalls++;
    }
    contents.push({ role: 'user', parts: responses });
  }
  return { notes: '', toolCalls };
}
