/**
 * Adversarial leak check.
 *
 * Before anything built from one person's journal reaches the other, a second model
 * — ideally a different provider — sees ONLY the finished text and tries to
 * reconstruct the original entry. If it recovers concrete specifics, we rewrite and
 * try again. Two failures and the item is dropped: the user gets self-care only,
 * which is a worse product and a correct privacy outcome.
 */
import 'server-only';
import { z } from 'zod';
import {
  LEAK_MAX_REWRITES, LeakCheckOutputSchema, scoreLeak, stripsClean,
  type LeakCheckResult,
} from '@/contract';
import { generateJSON } from '@/lib/llm/provider';
import { mockLeakCheck } from '@/lib/llm/mock';
import { LEAKCHECK_SYSTEM, LEAK_REWRITE_SYSTEM } from '@/lib/prompts';
import { env } from '@/lib/env';

const RewriteSchema = z.object({ body_text: z.string().min(1).max(900) });

export interface LeakCheckedText {
  text: string;
  result: LeakCheckResult;
  rewrites: number;
  /** True when we gave up and the caller must drop the item entirely. */
  dropped: boolean;
}

export async function leakCheckAndRewrite(
  candidate: string,
  forbiddenNames: readonly string[],
): Promise<LeakCheckedText> {
  if (!env.leakCheckEnabled()) {
    return {
      text: candidate, rewrites: 0, dropped: false,
      result: { reconstructed_guess: '', confidence: 0, leaked_specifics: [], verdict: 'skipped', attempt: 0 },
    };
  }

  let text = candidate;
  let last: LeakCheckResult | null = null;

  for (let attempt = 0; attempt <= LEAK_MAX_REWRITES; attempt++) {
    // Deterministic guard first — it is free and catches the obvious cases.
    const strip = stripsClean(text, forbiddenNames);

    let model;
    try {
      model = await generateJSON({
        schema: LeakCheckOutputSchema,
        system: LEAKCHECK_SYSTEM,
        user: `MESSAGE:\n"""\n${text}\n"""`,
        kind: 'classify',
        provider: env.leakCheckProvider(),
        mockFn: () => mockLeakCheck(text),
      });
    } catch {
      // An attacker we cannot run is not evidence of safety. Fail closed on the
      // deterministic guard alone and mark the result so the metric stays honest.
      return {
        text, rewrites: attempt, dropped: !strip.ok,
        result: { reconstructed_guess: '', confidence: 0, leaked_specifics: strip.hits, verdict: 'error', attempt },
      };
    }

    const merged = { ...model, leaked_specifics: [...new Set([...model.leaked_specifics, ...strip.hits])] };
    last = scoreLeak(merged, attempt);
    if (last.verdict === 'pass') return { text, result: last, rewrites: attempt, dropped: false };
    if (attempt === LEAK_MAX_REWRITES) break;

    try {
      const rewritten = await generateJSON({
        schema: RewriteSchema,
        system: LEAK_REWRITE_SYSTEM,
        user: `MESSAGE:\n"""\n${text}\n"""\n\nAn adversary recovered these specifics, remove them:\n${last.leaked_specifics.map((s) => `- ${s}`).join('\n')}`,
        kind: 'compose',
        mockFn: () => ({ body_text: text.replace(/\b[A-Z][a-z]{2,}\b/g, 'they').replace(/\d+/g, 'some') }),
      });
      text = rewritten.body_text;
    } catch {
      break;
    }
  }

  return {
    text, rewrites: LEAK_MAX_REWRITES, dropped: true,
    result: last ?? { reconstructed_guess: '', confidence: 1, leaked_specifics: [], verdict: 'fail', attempt: LEAK_MAX_REWRITES },
  };
}
