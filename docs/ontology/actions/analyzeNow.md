<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Analyse now (admin)

Operator trigger for the same pipeline: one connection or all, any day, optionally forced.

| | |
|---|---|
| API name | `analyzeNow` |
| Route | `POST /api/admin/analyze` |
| Who can call | Operator, with header `x-admin-token: $ADMIN_TOKEN`. |
| Input from | JSON body |
| Writes | [Analysis run](../objects/analysisRun.md), [Daily feedback](../objects/dailyFeedback.md), [Journal entry](../objects/journalEntry.md) |
| Reads | [Connection](../objects/connection.md), [Connection member](../objects/connectionMember.md), [Profile](../objects/profile.md), [Journal entry](../objects/journalEntry.md), [Analysis run](../objects/analysisRun.md) |

## What a model sees

The nightly agent reads both people's raw text for the day, their recent ai_summary lines and the last pair_summary, and may call three pair-scoped read tools. Nobody triggers it from their own session. Each person's feedback is shingle-checked against the OTHER person's raw text, then (with a real provider) adversarially checked, before insert.

## Input

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `connection_id` | string (uuid) | no |  |  |  |
| `local_date` | string | no |  |  |  |
| `force` | boolean | no | `false` |  |  |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `runs` | object[] | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.
