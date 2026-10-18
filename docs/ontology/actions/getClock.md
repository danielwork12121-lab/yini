<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Get the testing clock

How many whole days the app has been fast-forwarded. Everyone's "today" is their own local day plus this number. The number is public and says nothing about anyone.

| | |
|---|---|
| API name | `getClock` |
| Route | `GET /api/clock` |
| Who can call | Anyone. The action gates itself. |
| Input from | nothing |
| Writes | — |
| Reads | [App clock](../objects/appClock.md) |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `day_offset` | integer | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.

## Invariants

- Read-only. The clock is moved by hand in the Supabase SQL editor, never through the app.
- If the table does not exist yet, the answer is 0 and the app behaves as if nothing was ever fast-forwarded.
