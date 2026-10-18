<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Get today

Everything the home screen needs: whether you checked in, the pet, today's nudge, the shared streak.

| | |
|---|---|
| API name | `getToday` |
| Route | `GET /api/today` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | nothing |
| Writes | — |
| Reads | [Profile](../objects/profile.md), [Connection](../objects/connection.md), [Connection member](../objects/connectionMember.md), [Pet](../objects/pet.md), [Pet feeding](../objects/petFeeding.md), [Journal entry](../objects/journalEntry.md), [Nudge](../objects/nudge.md) |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `you_checked_in` | boolean | yes |  |  |  |
| `local_date` | string | yes |  |  |  |
| `display_name` | string | yes |  |  |  |
| `partner_display_name` | string | yes |  |  |  |
| `connection_kind` | `partner` \| `parent` \| `sibling` \| `friend` \| `other` | yes |  |  |  |
| `pet` | object | yes |  |  | What the client renders for the pet, derived on every read. |
| `today_nudge` | object \| null | yes |  |  |  |
| `shared_streak` | integer | yes |  | ≥ 0 |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.

## Invariants

- Never says whether the partner checked in. The streak counts shared days only.
