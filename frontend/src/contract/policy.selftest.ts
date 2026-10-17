/**
 * Deterministic checks on the rules the pitch rests on. `npm run contract:test`.
 * No network, no model, no DB — these must pass identically on every run.
 */
import {
  decideDelivery, derivePetState, isVerbatimSpan, localDateFor,
  shouldSendContextSignal, shouldReveal, type OpenConcern,
} from './policy';
import type { EmotionalState, Severity } from './enums';

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`${ok ? ' ok ' : 'FAIL'}  ${label.padEnd(44)} ${ok ? String(a) : `${a}  !=  ${e}`}`);
}

const concern = (id: string, severity: Severity, times_held = 0, times_raised = 1): OpenConcern =>
  ({ id, distilled_text: 'x', theme: 'affection', severity, times_held, times_raised, first_raised_at: '2026-10-10' });

const CONCERNS = [concern('big', 2), concern('small', 1)];
const base = { open_concerns: CONCERNS, already_delivered_today: false, mediation_paused: false };
const outcome = (d: ReturnType<typeof decideDelivery>) =>
  d.escalate ? 'escalate' : d.deliver ? `send:${d.concern_id}` : `hold:${d.hold_reason}`;

console.log('\n── delivery decision ──');
check('good day sends the pressing one',
  outcome(decideDelivery({ ...base, recipient_state: 'good', recipient_recent_states: ['good'] })), 'send:big');
check('first rough day holds',
  outcome(decideDelivery({ ...base, recipient_state: 'rough', recipient_recent_states: ['good'] })), 'hold:recipient_rough_day');
check('second rough day still holds',
  outcome(decideDelivery({ ...base, recipient_state: 'rough', recipient_recent_states: ['strained', 'good'] })), 'hold:recipient_rough_day');
check('third rough day sends the SMALL one',
  outcome(decideDelivery({ ...base, recipient_state: 'rough', recipient_recent_states: ['rough', 'strained', 'good'] })), 'send:small');
check('one per day',
  outcome(decideDelivery({ ...base, recipient_state: 'good', recipient_recent_states: [], already_delivered_today: true })), 'hold:recipient_already_received_today');
check('safety halt beats everything',
  outcome(decideDelivery({ ...base, recipient_state: 'good', recipient_recent_states: [], mediation_paused: true })), 'hold:safety_hold');
check('nothing waiting',
  outcome(decideDelivery({ ...base, open_concerns: [], recipient_state: 'good', recipient_recent_states: [] })), 'hold:null');
check('severity 3 escalates, never nudged',
  outcome(decideDelivery({ ...base, open_concerns: [concern('heavy', 3)], recipient_state: 'great', recipient_recent_states: [] })), 'escalate');
check('raised 4x escalates even at severity 1',
  outcome(decideDelivery({ ...base, open_concerns: [concern('nag', 1, 0, 4)], recipient_state: 'great', recipient_recent_states: [] })), 'escalate');
check('escalation outranks the stack override',
  outcome(decideDelivery({ ...base, open_concerns: [concern('heavy', 3)], recipient_state: 'rough', recipient_recent_states: ['rough', 'rough'] })), 'escalate');

console.log('\n── partner context signal ──');
const sig = (states: EmotionalState[], since: number | null, enabled = true, paused = false) =>
  shouldSendContextSignal({ subject_recent_states: states, days_since_last_signal: since, enabled, mediation_paused: paused }).send;
check('single bad day does NOT signal', sig(['rough', 'good'], null), false);
check('two in a row signals', sig(['rough', 'strained', 'good'], null), true);
check('cooldown blocks a repeat', sig(['rough', 'rough'], 2), false);
check('cooldown expired allows', sig(['rough', 'rough'], 6), true);
check('kill switch wins', sig(['rough', 'rough', 'rough'], null, false), false);
check('safety halt wins', sig(['rough', 'rough', 'rough'], null, true, true), false);

console.log('\n── the reveal ──');
const rev = (state: EmotionalState, prev: EmotionalState[], n: number) =>
  shouldReveal({ recipient_state: state, recipient_previous_states: prev, unrevealed_act_count: n }).reveal;
check('no acts logged = no reveal, no mention', rev('good', ['rough'], 0), false);
check('still depleted = wait', rev('rough', ['rough'], 3), false);
check('came up with acts waiting', rev('good', ['rough', 'rough'], 3), true);
check('no rough stretch to come out of', rev('great', ['good', 'great'], 3), false);

console.log('\n── the pet ──');
const pet = (total: number, hatched: string | null) => derivePetState({
  name: 'Mochi', species: 'cat', hatched_at: hatched, xp: 0,
  total_half_days: total, you_fed_today: true, both_fed_today: false,
});
check('unhatched egg stays stage 0', [pet(5, null).stage, pet(5, null).hatched, pet(5, null).species], [0, false, null]);
check('hatched at 2 half-days', [pet(2, '2026-10-17').stage_key, pet(2, '2026-10-17').bond_name], ['hatchling', 'Warming Up']);
check('bond rungs 1/2/4/8', [pet(1, 'x').bond_level, pet(2, 'x').bond_level, pet(4, 'x').bond_level, pet(8, 'x').bond_level], [1, 2, 3, 4]);
check('growth never regresses below best', pet(20, 'x').stage_key, 'grown');

console.log('\n── integrity guards ──');
check('verbatim span accepted', isVerbatimSpan('he made me coffee', 'honestly he made me coffee without asking'), true);
check('invented praise rejected', isVerbatimSpan('he always supports me', 'honestly he made me coffee'), false);
check('too short to be a span', isVerbatimSpan('nice', 'he was nice today'), false);

console.log('\n── local day ──');
check('10pm Pacific is still the same day', localDateFor('America/Los_Angeles', new Date('2026-10-18T05:30:00Z')), '2026-10-17');

console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} CHECK(S) FAILED\n`);
if (failures > 0) process.exit(1);
