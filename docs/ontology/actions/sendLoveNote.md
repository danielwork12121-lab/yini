<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Send a love note

Sends your person a note you wrote, or a voice note you recorded and confirmed. Goes to them as it is.

| | |
|---|---|
| API name | `sendLoveNote` |
| Route | `POST /api/love` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | multipart form |
| Writes | [Love note](../objects/loveNote.md) |
| Reads | [Profile](../objects/profile.md), [Connection member](../objects/connectionMember.md) |

## Input

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `title` | string | no |  | len 0..60 |  |
| `body` | string | no | `""` | len 0..4000 |  |
| `audio` | any | no |  |  | webm, mp4 or wav, up to 3 minutes. |
| `duration_ms` | integer | no | `0` | ≥ 0 |  |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `note` | object | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.

## Invariants

- The recipient is always the other person in the caller's connection. It cannot be aimed anywhere else.
- A note needs words or a recording. The words are stored exactly as sent; no model reads or changes them.
