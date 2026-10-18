<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# List feedback

Your nightly feedback history, newest first.

| | |
|---|---|
| API name | `listFeedback` |
| Route | `GET /api/feedback` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | query string |
| Writes | — |
| Reads | [Daily feedback](../objects/dailyFeedback.md) |

## Input

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `limit` | integer | no | `7` | 1..30 |  |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `feedback` | object[] | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.
