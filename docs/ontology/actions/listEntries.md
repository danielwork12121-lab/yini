<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# List my entries

Your own journal, newest first, with the nightly ai_summary once it exists.

| | |
|---|---|
| API name | `listEntries` |
| Route | `GET /api/entries` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | query string |
| Writes | — |
| Reads | [Journal entry](../objects/journalEntry.md) |

## Input

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `limit` | integer | no | `14` | 1..60 |  |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `entries` | object[] | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.

## Invariants

- Runs through the user's own Supabase client, so RLS (author_id = auth.uid()) is what filters it.
