<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Analysis run

The nightly agent's bookkeeping and the pair-level memory chain.

> One nightly agent run for one connection and one day.

| | |
|---|---|
| API name | `analysisRun` |
| Stored in | `public.analysis_runs` |
| Primary key | `id` |
| Who can read | No client role. Service role only. |
| Crosses the partner boundary | no |
| Server-only fields | `pair_summary` |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `id` | string (uuid) | yes |  |  |  |
| `connection_id` | string (uuid) | yes |  |  |  |
| `local_date` | string | yes |  |  | The day analysed, in side A's timezone. |
| `status` | `running` \| `done` \| `skipped` \| `failed` | yes |  |  | running → done \| skipped \| failed. A done run is never repeated unless forced. |
| `model` | string \| null | yes |  |  | Provider and model that wrote it, e.g. gemini:gemini-2.5-flash. |
| `pair_summary` | string \| null | yes |  |  | 2-3 sentence relationship summary. The rolling memory: each night reads the last one and writes the next, so context carries forward without growing. |
| `tool_calls` | integer | yes | `0` | ≥ 0 | How many database tools the agent called. For the demo panel and cost tracking. |
| `error` | string \| null | yes |  |  |  |
| `started_at` | string | yes |  |  |  |
| `finished_at` | string \| null | yes |  |  |  |

## Invariants

- UNIQUE(connection_id, local_date): the run is idempotent per pair per day.
- pair_summary describes both people, so no client role may read it. Ungranted.

## Links

- **runFeedback** → [Daily feedback](../objects/dailyFeedback.md) (many, via `run_id`): The two feedback rows a run produced, one per person.
- **connectionRuns** ← [Connection](../objects/connection.md) (many, via `connection_id`): One nightly run per day. The latest done run holds the rolling pair_summary.

## Actions

- Written by: [Analyse now (admin)](../actions/analyzeNow.md), [Get my Grow](../actions/getGrow.md), [Run tonight's analysis now (demo)](../actions/runMyAnalysis.md), [Nightly sweep (cron)](../actions/runNightlySweep.md)
- Read by: [Analyse now (admin)](../actions/analyzeNow.md), [Get my Grow](../actions/getGrow.md), [Run tonight's analysis now (demo)](../actions/runMyAnalysis.md), [Nightly sweep (cron)](../actions/runNightlySweep.md)
