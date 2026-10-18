<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Nightly sweep (cron)

Vercel Cron calls this once a day. For every connection with two members and mediation not paused, analyse its target day (yesterday in side A's timezone) unless that day already has a finished run.

| | |
|---|---|
| API name | `runNightlySweep` |
| Route | `GET /api/cron/nightly` |
| Who can call | Vercel Cron, with header `Authorization: Bearer $CRON_SECRET`. |
| Input from | nothing |
| Writes | [Analysis run](../objects/analysisRun.md), [Daily feedback](../objects/dailyFeedback.md), [Journal entry](../objects/journalEntry.md) |
| Reads | [Connection](../objects/connection.md), [Connection member](../objects/connectionMember.md), [Profile](../objects/profile.md), [Journal entry](../objects/journalEntry.md), [Analysis run](../objects/analysisRun.md) |

## What a model sees

The nightly agent reads both people's raw text for the day, their recent ai_summary lines and the last pair_summary, and may call three pair-scoped read tools. Nobody triggers it from their own session. Each person's feedback is shingle-checked against the OTHER person's raw text, then (with a real provider) adversarially checked, before insert.

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `runs` | object[] | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.

## Invariants

- Idempotent per (connection, day). Running it twice does nothing the second time.
