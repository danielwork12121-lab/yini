<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Join connection

Join the other person's connection with their invite code.

| | |
|---|---|
| API name | `joinConnection` |
| Route | `POST /api/connection/join` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | JSON body |
| Writes | [Connection member](../objects/connectionMember.md), [Profile](../objects/profile.md) |
| Reads | [Connection](../objects/connection.md), [Connection member](../objects/connectionMember.md) |

## Input

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `invite_code` | string | yes |  | len 6..6 |  |
| `display_name` | string | no |  | len 0..40 | Optional. Sets your display name in the same step. |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `ok` | `true` | yes |  |  |  |
| `already` | boolean | yes | `false` |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.

## Invariants

- A full connection (two members) rejects a third with 409; the DB trigger enforces it under races too.
