<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Create connection

Start a connection and get a 6-character code to hand to the other person. Idempotent: returns the existing code if you already have one.

| | |
|---|---|
| API name | `createConnection` |
| Route | `POST /api/connection` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | JSON body |
| Writes | [Connection](../objects/connection.md), [Connection member](../objects/connectionMember.md), [Pet](../objects/pet.md), [Profile](../objects/profile.md) |
| Reads | [Profile](../objects/profile.md), [Connection](../objects/connection.md) |

## Input

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `display_name` | string | no |  | len 0..40 | Optional. Sets your display name in the same step. |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `invite_code` | string | yes |  | len 6..6 |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.
