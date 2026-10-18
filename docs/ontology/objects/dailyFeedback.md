<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Daily feedback

Lands the morning after: cross-partner mediation written from both diaries, without revealing either.

> The nightly agent's private feedback for one person.

| | |
|---|---|
| API name | `dailyFeedback` |
| Stored in | `public.daily_feedback` |
| Primary key | `id` |
| Who can read | Only the person it was written for. |
| Crosses the partner boundary | yes — generated, capped and checked before it does |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `id` | string (uuid) | yes |  |  |  |
| `run_id` | string (uuid) | yes |  |  |  |
| `connection_id` | string (uuid) | yes |  |  |  |
| `recipient_id` | string (uuid) | yes |  |  | The one person who may read this row. |
| `local_date` | string | yes |  |  | The day the feedback is about. |
| `headline` | string | yes |  | len 1..160 |  |
| `bullets` | string[] | yes |  | 1..5 items | 2-5 concrete, kind, doable things, in the second person. |
| `leak_dropped` | integer | yes | `0` | ≥ 0 | Bullets removed because they shared 6+ consecutive words with the partner's raw text. |
| `leak_verdict` | `pass` \| `fail` \| `skipped` \| `error` | yes | `"skipped"` |  | Result of the adversarial reconstruction check on the final text. |
| `created_at` | string | yes |  |  |  |

## Invariants

- UNIQUE(recipient_id, connection_id, local_date).
- Every bullet passed the shingle check against the partner's raw text; the whole text passed the adversarial check or was replaced with self-care.
- Published to Supabase Realtime, which applies the same RLS, so only the recipient is notified.

## Links

- **feedbackRecipient** → [Profile](../objects/profile.md) (one, via `recipient_id`): The one person who may read it.
- **runFeedback** ← [Analysis run](../objects/analysisRun.md) (many, via `run_id`): The two feedback rows a run produced, one per person.

## Actions

- Written by: [Analyse now (admin)](../actions/analyzeNow.md), [Get my Grow](../actions/getGrow.md), [Run tonight's analysis now (demo)](../actions/runMyAnalysis.md), [Nightly sweep (cron)](../actions/runNightlySweep.md)
- Read by: [Get my Grow](../actions/getGrow.md), [Get latest feedback](../actions/getLatestFeedback.md), [List feedback](../actions/listFeedback.md), [Tick off a Grow suggestion](../actions/setGrowDone.md)
