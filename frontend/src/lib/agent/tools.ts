/**
 * The agent's read tools. Each is bound to ONE connection at construction, so no
 * argument the model passes can widen its reach to another couple.
 */
import { z } from 'zod';
import type { Member, NightlyStore, ToolEntry } from './store';

export interface AgentTool {
  name: string;
  description: string;
  /** Flat object of string/integer params. Converted to a Gemini function declaration. */
  parameters: z.ZodObject;
  execute(args: unknown): Promise<unknown>;
}

const zDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Day as YYYY-MM-DD.');

export function buildTools(store: NightlyStore, connectionId: string, members: Member[]): AgentTool[] {
  const name = (id: string) => members.find((m) => m.user_id === id)?.display_name ?? 'unknown';
  const fmt = (e: ToolEntry) => ({ day: e.local_date, who: name(e.author_id), summary: e.ai_summary, text: e.text, mood: e.mood_face });

  const tool = <S extends z.ZodObject>(t: { name: string; description: string; parameters: S; run: (a: z.infer<S>) => Promise<unknown> }): AgentTool => ({
    name: t.name, description: t.description, parameters: t.parameters,
    async execute(args) {
      const parsed = t.parameters.safeParse(args ?? {});
      if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
      return t.run(parsed.data);
    },
  });

  return [
    tool({
      name: 'get_entries_on_date',
      description: "Return both people's journal entries (text, summary, mood) for one earlier day.",
      parameters: z.object({ day: zDay }),
      run: async ({ day }) => (await store.entriesOnDate(connectionId, day)).map(fmt),
    }),
    tool({
      name: 'search_entries',
      description: "Keyword search over this pair's past entries and summaries. Most recent matches first.",
      parameters: z.object({
        query: z.string().min(1).max(80).describe('A word or short phrase.'),
        limit: z.coerce.number().int().min(1).max(20).default(5).describe('Max results, 1-20.'),
      }),
      run: async ({ query, limit }) => (await store.searchEntries(connectionId, query, limit)).map(fmt),
    }),
    tool({
      name: 'get_recent_pair_summaries',
      description: 'Return the relationship summaries written on previous nights, most recent first.',
      parameters: z.object({
        limit: z.coerce.number().int().min(1).max(30).default(7).describe('How many nights, 1-30.'),
      }),
      run: async ({ limit }) => store.pairSummaries(connectionId, limit),
    }),
  ];
}

/** Gemini's function-declaration schema is an OpenAPI subset; keep it to what it accepts. */
export function toFunctionDeclaration(t: AgentTool) {
  const js = z.toJSONSchema(t.parameters, { io: 'input' }) as {
    properties?: Record<string, { type?: string; description?: string }>;
    required?: string[];
  };
  const properties = Object.fromEntries(Object.entries(js.properties ?? {}).map(([k, v]) => [
    k, { type: (v.type ?? 'string').toUpperCase(), ...(v.description ? { description: v.description } : {}) },
  ]));
  return {
    name: t.name,
    description: t.description,
    parameters: { type: 'OBJECT', properties, required: js.required ?? [] },
  };
}
