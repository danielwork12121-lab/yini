<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Tick off a Grow suggestion

Marks one of your own Grow suggestions as done, or takes that back. Done ones move to a quiet list at the bottom of Grow.

| | |
|---|---|
| API name | `setGrowDone` |
| Route | `POST /api/grow/done` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | JSON body |
| Writes | [Grow: what you did](../objects/growDone.md) |
| Reads | [Daily feedback](../objects/dailyFeedback.md), [Grow: what you did](../objects/growDone.md), [Profile](../objects/profile.md) |

## Input

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `text` | string | yes |  | len 1..900 |  |
| `done` | boolean | yes |  |  |  |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `done` | object[] | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.

## Invariants

- Only text that is one of the caller's own current daily_feedback bullets can be ticked off. Anything else is refused.
- Taking it back deletes only the caller's own row. Ticking twice is one row.
