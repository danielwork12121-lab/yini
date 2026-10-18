<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Kind word

The one place a partner's literal words reach the other person, deliberately: a paraphrase here would be the app inventing affection.

> Something one person actually said about the other, in their own words.

| | |
|---|---|
| API name | `kindWord` |
| Stored in | `public.kind_words` |
| Primary key | `id` |
| Who can read | Only the person it was written for. |
| Crosses the partner boundary | yes — generated, capped and checked before it does |
| Server-only fields | `source_entry_id` |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `id` | string (uuid) | yes |  |  |  |
| `connection_id` | string (uuid) | yes |  |  |  |
| `author_id` | string (uuid) | yes |  |  | Who said it. |
| `recipient_id` | string (uuid) | yes |  |  | Who it is about. |
| `source_entry_id` | string (uuid) \| null | yes |  |  | SERVER ONLY. |
| `quest_id` | string (uuid) \| null | yes |  |  |  |
| `source` | `entry` \| `quest` | yes | `"entry"` |  |  |
| `text` | string | yes |  | len 1..300 | Verified literal substring of what the author wrote. |
| `verbatim` | `true` | yes |  |  | Typed true so a paraphrase cannot be constructed. |
| `status` | `candidate` \| `approved` \| `surfaced` \| `rejected` | yes | `"candidate"` |  |  |
| `surfaced_at` | string \| null | yes |  |  |  |
| `created_at` | string | yes |  |  |  |

## Invariants

- Readable by the recipient only once status = surfaced.

## Links

- **kindWordSourceEntry** → [Journal entry](../objects/journalEntry.md) (one, via `source_entry_id`): SERVER ONLY. The entry the words were lifted from verbatim.
- **kindWordRecipient** → [Profile](../objects/profile.md) (one, via `recipient_id`): Who the kind words are about.

## Actions

- Written by: [Check in](../actions/checkIn.md), [Get my Glow](../actions/getGlow.md)
- Read by: [Get my Glow](../actions/getGlow.md)
