<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Get my Glow

The kind things your partner has said about you, in their own words. Opening it marks them surfaced.

| | |
|---|---|
| API name | `getGlow` |
| Route | `GET /api/glow` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | nothing |
| Writes | [Kind word](../objects/kindWord.md) |
| Reads | [Kind word](../objects/kindWord.md), [Journal entry](../objects/journalEntry.md), [Profile](../objects/profile.md), [Connection member](../objects/connectionMember.md) |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `partner_display_name` | string | yes |  |  |  |
| `compliments` | object[] | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.

## Invariants

- Only rows where recipient_id is the caller, and only ones the extractor verified as a literal substring of what the author wrote.
- Nothing about the entry other than the day it was written is sent: no entry text, no id.
- status moves approved → surfaced the first time the recipient opens Glow, which is what the kind_words RLS policy waits for.
