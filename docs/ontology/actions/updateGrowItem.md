<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Bookmark, do, skip or reflect on a Grow suggestion

Bookmarks one of your own Grow suggestions (it stays at the top), marks it done or skipped, takes that back, and saves how it went. Send only what changes.

| | |
|---|---|
| API name | `updateGrowItem` |
| Route | `POST /api/grow/item` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | JSON body |
| Writes | [Grow: what you did](../objects/growDone.md) |
| Reads | [Daily feedback](../objects/dailyFeedback.md), [Grow: what you did](../objects/growDone.md), [Profile](../objects/profile.md) |

## Input

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `text` | string | yes |  | len 1..900 |  |
| `saved` | boolean | no |  |  |  |
| `status` | `done` \| `skipped` \| `open` | no |  |  |  |
| `outcome` | `went_well` \| `okay` \| `hard` \| `no_time` \| `not_right` \| null | no |  |  |  |
| `reflection` | string \| null | no |  |  |  |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `items` | object[] | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.

## Invariants

- Only text that is one of the caller's own current daily_feedback bullets can be bookmarked, done or skipped. Anything else is refused.
- A reflection is private to its writer. The calendar shows it to them alone.
- Taking a status back clears its outcome and reflection. A row with nothing left on it is deleted.
