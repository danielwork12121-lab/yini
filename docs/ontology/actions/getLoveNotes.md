<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Get my love notes

The notes your person sent you, and the ones you sent them. Opening it marks new ones seen.

| | |
|---|---|
| API name | `getLoveNotes` |
| Route | `GET /api/love` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | nothing |
| Writes | [Love note](../objects/loveNote.md) |
| Reads | [Love note](../objects/loveNote.md), [Profile](../objects/profile.md), [Connection member](../objects/connectionMember.md) |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `partner_display_name` | string | yes |  |  |  |
| `received` | object[] | yes |  |  |  |
| `sent` | object[] | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.

## Invariants

- Only rows where the caller is the sender or the recipient. Favorites on sent notes are never shown to the sender.
- Voice notes come back as short-lived signed links, never as storage paths.
