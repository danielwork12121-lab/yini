<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Grow: done

Which Grow suggestions someone has done. Keyed by the suggestion's words, so it survives Yini rewriting a day's list.

> A Grow suggestion one person has marked as done.

| | |
|---|---|
| API name | `growDone` |
| Stored in | `public.grow_done` |
| Primary key | `id` |
| Who can read | No client role. Service role only. |
| Crosses the partner boundary | no |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `id` | string (uuid) | yes |  |  |  |
| `recipient_id` | string (uuid) | yes |  |  |  |
| `connection_id` | string (uuid) | yes |  |  |  |
| `body_text` | string | yes |  | len 1..900 | The Grow suggestion, word for word, as it stood when it was ticked off. |
| `done_at` | string | yes |  |  |  |

## Invariants

- UNIQUE(recipient_id, body_text): ticking the same suggestion twice is one row.
- No client grant and no policy. Only POST /api/grow/done writes it, and only for text that is one of the caller's own daily_feedback bullets.

## Actions

- Written by: [Tick off a Grow suggestion](../actions/setGrowDone.md)
- Read by: [Get my Grow](../actions/getGrow.md), [Tick off a Grow suggestion](../actions/setGrowDone.md)
