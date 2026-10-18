<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Change a day's mood

Replaces the face Yini picked for one of your days with the one you choose. It is marked as changed by you.

| | |
|---|---|
| API name | `setDayMood` |
| Route | `POST /api/calendar/mood` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | JSON body |
| Writes | [Mood day](../objects/moodDay.md) |
| Reads | [Mood day](../objects/moodDay.md) |

## Input

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `local_date` | string | yes |  |  |  |
| `mood` | `happy` \| `down` \| `stressed` | yes |  |  |  |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `local_date` | string | yes |  |  |  |
| `mood` | `happy` \| `down` \| `stressed` | yes |  |  |  |
| `mood_by` | `"you"` | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.

## Invariants

- Runs through the user's own client, so RLS (author_id = auth.uid()) means it can only change their own day.
