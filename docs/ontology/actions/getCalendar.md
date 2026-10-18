<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Get my calendar month

One month of your own calendar: a mood face and short jot notes per day, what you said that day, and the little steps from Grow you did.

| | |
|---|---|
| API name | `getCalendar` |
| Route | `GET /api/calendar` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | query string |
| Writes | — |
| Reads | [Mood day](../objects/moodDay.md), [Journal entry](../objects/journalEntry.md), [Grow: what you did](../objects/growDone.md) |

## Input

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `month` | string | yes |  |  |  |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `month` | string | yes |  |  |  |
| `days` | object[] | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.

## Invariants

- Runs through the user's own Supabase client, so RLS (author_id = auth.uid()) is what filters it. A partner's days never appear.
