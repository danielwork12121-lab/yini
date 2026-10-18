<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Love note

A note one person writes or speaks on purpose and sends to their person. The recipient keeps it, can favorite it, and the sender can look back at what they sent.

> Something one person chose to send to the other: words, and optionally their voice.

| | |
|---|---|
| API name | `loveNote` |
| Stored in | `public.love_notes` |
| Primary key | `id` |
| Who can read | No client role. Service role only. |
| Crosses the partner boundary | yes — generated, capped and checked before it does |
| Server-only fields | `voice_path` |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `id` | string (uuid) | yes |  |  |  |
| `connection_id` | string (uuid) | yes |  |  |  |
| `sender_id` | string (uuid) | yes |  |  |  |
| `recipient_id` | string (uuid) | yes |  |  |  |
| `title` | string \| null | yes |  |  | Optional heading the sender gave it. |
| `body` | string | yes |  | len 0..4000 | The note, word for word. For a voice note, the transcript the sender confirmed. |
| `voice_path` | string \| null | yes |  |  | Where the voice recording lives in the private love-voice bucket. Never sent to a client; the recipient gets a short-lived link instead. |
| `voice_ms` | integer \| null | yes |  |  |  |
| `is_favorite` | boolean | yes |  |  | Set by the recipient only. |
| `seen_at` | string \| null | yes |  |  | When the recipient first opened Glow after it arrived. |
| `created_at` | string | yes |  |  |  |

## Invariants

- Written only by the sender, with their own words (typed, or transcribed from their own voice and confirmed by them). No model writes or rewrites it.
- Nothing is sent until the sender confirms. The recipient sees exactly what was confirmed.
- No client grant and no policy. The API returns a note only to its sender or its recipient, and only the recipient may favorite it.
- Voice recordings sit in a private bucket and reach the recipient through a one-hour signed link.

## Actions

- Written by: [Get my love notes](../actions/getLoveNotes.md), [Send a love note](../actions/sendLoveNote.md), [Favorite a love note](../actions/setLoveFavorite.md)
- Read by: [Get my love notes](../actions/getLoveNotes.md), [Favorite a love note](../actions/setLoveFavorite.md)
