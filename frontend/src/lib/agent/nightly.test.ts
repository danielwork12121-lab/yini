import { describe, expect, it, vi } from 'vitest';
import type { NightlyInput } from '@/contract';
import { analyzeConnection, sweep, type NightlyDeps } from './nightly';
import { memoryNightlyStore, type MemEntry } from './memory-store';
import { mockNightly } from './mock';
import { buildTools } from './tools';
import type { ConnectionInfo } from './store';

const AVERY = { user_id: 'u-avery', display_name: 'Avery', timezone: 'America/Los_Angeles', joined_at: '2026-10-01T00:00:00Z' };
const SAM = { user_id: 'u-sam', display_name: 'Sam', timezone: 'America/New_York', joined_at: '2026-10-02T00:00:00Z' };
const conn = (over: Partial<ConnectionInfo> = {}): ConnectionInfo =>
  ({ id: 'c1', mediation_paused_at: null, members: [AVERY, SAM], ...over });

const AVERY_TEXT = 'Sam forgot to call me back again tonight and I felt invisible at dinner with his parents.';
const SAM_TEXT = 'Work was brutal and I barely had energy for anything, but I loved our walk on Sunday.';

let n = 0;
const entry = (author: string, day: string, raw_text: string, over: Partial<MemEntry> = {}): MemEntry => ({
  id: `e${++n}`, connection_id: 'c1', author_id: author, local_date: day, raw_text,
  mood_face: 3, ai_summary: null, created_at: `${day}T20:00:0${n % 10}Z`, ...over,
});

function deps(over: Partial<NightlyDeps> = {}): NightlyDeps & { seen: NightlyInput[] } {
  const seen: NightlyInput[] = [];
  return {
    seen,
    historyDays: 7,
    modelLabel: 'mock',
    agent: async (input) => { seen.push(input); return { output: mockNightly(input), model: 'mock', toolCalls: 0 }; },
    adversarial: async (feedback) => ({ feedback, verdict: 'skipped' }),
    ...over,
  };
}

describe('analyzeConnection', () => {
  it('writes private feedback for each side and drops the bullet that quotes the partner', async () => {
    const m = memoryNightlyStore({ connections: [conn()], entries: [entry('u-avery', '2026-10-17', AVERY_TEXT), entry('u-sam', '2026-10-17', SAM_TEXT)] });
    const run = await analyzeConnection(m.store, conn(), '2026-10-17', deps());

    expect(run.status).toBe('done');
    expect(m.feedback).toHaveLength(2);
    for (const f of m.feedback) {
      expect(f.leak_dropped).toBe(1); // the mock's deliberate "Your partner wrote: …" bullet
      expect(f.bullets.join(' ')).not.toMatch(/Your partner wrote/);
      expect(f.bullets.length).toBeGreaterThanOrEqual(1);
    }
    const forSam = m.feedback.find((f) => f.recipient_id === 'u-sam')!;
    expect(forSam.bullets.join(' ').toLowerCase()).not.toContain('forgot to call me back');
  });

  it('writes the memory chain: ai_summary per entry and pair_summary on the run', async () => {
    const m = memoryNightlyStore({ connections: [conn()], entries: [entry('u-avery', '2026-10-17', AVERY_TEXT), entry('u-sam', '2026-10-17', SAM_TEXT)] });
    await analyzeConnection(m.store, conn(), '2026-10-17', deps());
    expect(m.entries.every((e) => e.ai_summary)).toBe(true);
    expect(m.runs[0].pair_summary).toMatch(/Avery and Sam/);
  });

  it('feeds yesterday\'s memory into today\'s run', async () => {
    const m = memoryNightlyStore({ connections: [conn()], entries: [
      entry('u-avery', '2026-10-16', 'Day one for Avery, nothing much happened at all today really.'),
      entry('u-sam', '2026-10-16', 'Day one for Sam.'),
      entry('u-avery', '2026-10-17', AVERY_TEXT),
    ] });
    const d = deps();
    await analyzeConnection(m.store, conn(), '2026-10-16', d);
    await analyzeConnection(m.store, conn(), '2026-10-17', d);

    const today = d.seen[1];
    expect(today.previous_pair_summary).toMatch(/2026-10-16/);
    expect(today.side_a.recent_summaries[0]).toMatch(/^2026-10-16: /);
    expect(today.side_b.entries_text).toBeNull(); // Sam did not write today
  });

  it('joins several entries from the same day, oldest first', async () => {
    const m = memoryNightlyStore({ connections: [conn()], entries: [
      entry('u-avery', '2026-10-17', 'Morning thought.', { created_at: '2026-10-17T08:00:00Z' }),
      entry('u-avery', '2026-10-17', 'Evening thought.', { created_at: '2026-10-17T21:00:00Z', mood_face: 2 }),
    ] });
    const d = deps();
    await analyzeConnection(m.store, conn(), '2026-10-17', d);
    expect(d.seen[0].side_a.entries_text).toBe('Morning thought.\n\nEvening thought.');
    expect(d.seen[0].side_a.mood_face).toBe(2);
    expect(m.entries.every((e) => e.ai_summary)).toBe(true);
  });

  it('is idempotent per day unless forced', async () => {
    const m = memoryNightlyStore({ connections: [conn()], entries: [entry('u-avery', '2026-10-17', AVERY_TEXT)] });
    const d = deps();
    await analyzeConnection(m.store, conn(), '2026-10-17', d);
    await analyzeConnection(m.store, conn(), '2026-10-17', d);
    expect(d.seen).toHaveLength(1);
    await analyzeConnection(m.store, conn(), '2026-10-17', d, { force: true });
    expect(d.seen).toHaveLength(2);
    expect(m.runs).toHaveLength(1);
    expect(m.feedback).toHaveLength(2); // upserted, not duplicated
  });

  it('skips a day nobody wrote', async () => {
    const m = memoryNightlyStore({ connections: [conn()] });
    const run = await analyzeConnection(m.store, conn(), '2026-10-17', deps());
    expect(run).toMatchObject({ status: 'skipped', error: 'no entries for that day' });
    expect(m.feedback).toHaveLength(0);
  });

  it('never mediates a paused connection', async () => {
    const paused = conn({ mediation_paused_at: '2026-10-17T00:00:00Z' });
    const m = memoryNightlyStore({ connections: [paused], entries: [entry('u-avery', '2026-10-17', AVERY_TEXT)] });
    const d = deps();
    const run = await analyzeConnection(m.store, paused, '2026-10-17', d);
    expect(run.status).toBe('skipped');
    expect(d.seen).toHaveLength(0);
  });

  it('marks the run failed, writes nothing, and does not throw when the model fails', async () => {
    const m = memoryNightlyStore({ connections: [conn()], entries: [entry('u-avery', '2026-10-17', AVERY_TEXT)] });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const run = await analyzeConnection(m.store, conn(), '2026-10-17', deps({ agent: async () => { throw new Error('model down'); } }));
    expect(run).toMatchObject({ status: 'failed', error: 'Error: model down' });
    expect(m.feedback).toHaveLength(0);
    expect(m.entries[0].ai_summary).toBeNull();
  });

  it('uses whatever the adversarial check returns', async () => {
    const m = memoryNightlyStore({ connections: [conn()], entries: [entry('u-avery', '2026-10-17', AVERY_TEXT)] });
    await analyzeConnection(m.store, conn(), '2026-10-17', deps({
      adversarial: async () => ({ feedback: { headline: 'Safe', bullets: ['rewritten'] }, verdict: 'pass' }),
    }));
    expect(m.feedback.map((f) => [f.headline, f.bullets[0], f.leak_verdict])).toEqual([['Safe', 'rewritten', 'pass'], ['Safe', 'rewritten', 'pass']]);
  });
});

describe('agent tools', () => {
  it('cannot read another connection, whatever the model asks for', async () => {
    const other = { ...conn({ id: 'c2' }) };
    const m = memoryNightlyStore({ connections: [conn(), other], entries: [
      entry('u-avery', '2026-10-17', AVERY_TEXT),
      entry('u-x', '2026-10-17', 'OTHER COUPLE SECRET text here', { connection_id: 'c2' }),
    ] });
    const tools = buildTools(m.store, 'c1', conn().members);
    const byDate = await tools.find((t) => t.name === 'get_entries_on_date')!.execute({ day: '2026-10-17' });
    const search = await tools.find((t) => t.name === 'search_entries')!.execute({ query: 'SECRET', connection_id: 'c2' });
    expect(JSON.stringify(byDate)).not.toContain('OTHER COUPLE');
    expect(search).toEqual([]);
  });

  it('labels entries with names and validates arguments', async () => {
    const m = memoryNightlyStore({ connections: [conn()], entries: [entry('u-sam', '2026-10-15', SAM_TEXT)] });
    const tools = buildTools(m.store, 'c1', conn().members);
    const [hit] = await tools.find((t) => t.name === 'search_entries')!.execute({ query: 'walk' }) as { who: string }[];
    expect(hit.who).toBe('Sam');
    expect(await tools.find((t) => t.name === 'get_entries_on_date')!.execute({ day: 'yesterday' })).toHaveProperty('error');
  });
});

describe('sweep', () => {
  it('analyses each two-member connection on its own target day, in side A\'s timezone', async () => {
    const solo = conn({ id: 'c-solo', members: [AVERY] });
    const m = memoryNightlyStore({ connections: [conn(), solo], entries: [entry('u-avery', '2026-10-17', AVERY_TEXT)] });
    // 08:30 UTC on the 18th: 01:30 in LA (side A), so the target is the 17th.
    const runs = await sweep(m.store, deps(), { target: 'previous_day', now: new Date('2026-10-18T08:30:00Z') });
    expect(runs).toEqual([expect.objectContaining({ connection_id: 'c1', local_date: '2026-10-17', status: 'done' })]);
  });
});
