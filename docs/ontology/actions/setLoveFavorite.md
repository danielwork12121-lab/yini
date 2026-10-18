<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Favorite a love note

Keeps a note you received close, or lets it go.

| | |
|---|---|
| API name | `setLoveFavorite` |
| Route | `POST /api/love/favorite` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | JSON body |
| Writes | [Love note](../objects/loveNote.md) |
| Reads | [Love note](../objects/loveNote.md) |

## Input

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `id` | string (uuid) | yes |  |  |  |
| `favorite` | boolean | yes |  |  |  |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `id` | string (uuid) | yes |  |  |  |
| `is_favorite` | boolean | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.

## Invariants

- Only the recipient of a note may favorite it. The sender never sees whether it was.
