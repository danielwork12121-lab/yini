<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Run tonight's analysis now (demo)

Demo mode only. Runs the nightly agent for your own connection on today (or a given day), forced, so a judge sees the cross-partner feedback land without waiting for midnight.

| | |
|---|---|
| API name | `runMyAnalysis` |
| Route | `POST /api/feedback/run` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | JSON body |
| Writes | [Analysis run](../objects/analysisRun.md), [Daily feedback](../objects/dailyFeedback.md), [Journal entry](../objects/journalEntry.md) |
| Reads | [Connection](../objects/connection.md), [Connection member](../objects/connectionMember.md), [Profile](../objects/profile.md), [Journal entry](../objects/journalEntry.md), [Analysis run](../objects/analysisRun.md) |

## What a model sees

Same as runNightlySweep.

## Input

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `local_date` | string | no |  |  |  |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `runs` | object[] | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.

## Invariants

- 403 unless NEXT_PUBLIC_DEMO_MODE=true.
