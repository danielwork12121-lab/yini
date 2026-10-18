<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Get my Grow

Small things you could do for the relationship, written overnight from both people's logs. Also nudges the overnight read to start if a finished day has not been read yet.

| | |
|---|---|
| API name | `getGrow` |
| Route | `GET /api/grow` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | nothing |
| Writes | [Analysis run](../objects/analysisRun.md), [Daily feedback](../objects/dailyFeedback.md), [Journal entry](../objects/journalEntry.md) |
| Reads | [Daily feedback](../objects/dailyFeedback.md), [Nudge](../objects/nudge.md), [Analysis run](../objects/analysisRun.md), [Journal entry](../objects/journalEntry.md), [Grow: done](../objects/growDone.md), [Profile](../objects/profile.md), [Connection member](../objects/connectionMember.md) |

## What a model sees

Only when it starts the overnight read, and then exactly what runNightlySweep sees. The response itself carries just the recipient's own feedback rows and the already leak-checked nudges.

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `partner_display_name` | string | yes |  |  |  |
| `status` | `empty` \| `waiting` \| `working` \| `ready` \| `failed` | yes |  |  |  |
| `feedback` | object[] | yes |  |  |  |
| `from_partner` | object[] | yes |  |  |  |
| `done` | object[] | yes |  |  |  |
| `problem` | string \| null | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.

## Invariants

- Feedback and nudges are read through the user's own client, so RLS (recipient_id = auth.uid()) is what filters them.
- Starting the read is idempotent per (connection, day): a finished or already-running day is never started twice, and a failed one waits a few minutes before it retries.
- The read runs after the response is sent, so opening Grow never waits on a model.
- A day that already has a finished read is read again when something new was saved after it, so Grow keeps up with the day.
