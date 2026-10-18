<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Get latest feedback

The most recent nightly feedback written for you. Clients also subscribe to Supabase Realtime on daily_feedback to hear about new rows.

| | |
|---|---|
| API name | `getLatestFeedback` |
| Route | `GET /api/feedback/latest` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | nothing |
| Writes | — |
| Reads | [Daily feedback](../objects/dailyFeedback.md) |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `feedback` | object \| null | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.

## Invariants

- Read through the user's own client; RLS limits rows to recipient_id = auth.uid().
