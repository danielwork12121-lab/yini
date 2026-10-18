<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Get connection status

Am I paired, what is my invite code, and what is my partner called.

| | |
|---|---|
| API name | `getConnection` |
| Route | `GET /api/connection` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | nothing |
| Writes | — |
| Reads | [Profile](../objects/profile.md), [Connection](../objects/connection.md), [Connection member](../objects/connectionMember.md), [Pet](../objects/pet.md) |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `paired` | boolean | yes |  |  |  |
| `display_name` | string \| null | yes |  |  |  |
| `invite_code` | string \| null | yes |  |  |  |
| `partner_display_name` | string \| null | yes |  |  |  |
| `pet_species` | string \| null | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.
