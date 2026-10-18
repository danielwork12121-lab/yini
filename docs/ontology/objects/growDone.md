<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Grow: what you did

What someone did with each Grow suggestion. Keyed by the suggestion's words, so it survives Yini rewriting a day's list.

> What one person did with a Grow suggestion: bookmarked it, did it, skipped it, and how it went.

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
| `saved` | boolean | yes |  |  | Bookmarked: it stays at the top of Grow. |
| `status` | `done` \| `skipped` \| null | yes |  |  | null while it is still open. |
| `outcome` | `went_well` \| `okay` \| `hard` \| `no_time` \| `not_right` \| null | yes |  |  | How it went, from the reflection. |
| `reflection` | string \| null | yes |  |  | What they wanted Yini to remember. Only they see it. |
| `done_at` | string \| null | yes |  |  |  |
| `done_on` | string \| null | yes |  |  | The app-clock day it was done, so the calendar can place it. |
| `updated_at` | string | yes |  |  |  |

## Invariants

- UNIQUE(recipient_id, body_text): ticking the same suggestion twice is one row.
- No client grant and no policy. Only POST /api/grow/item writes it, and only for text that is one of the caller's own daily_feedback bullets.
- A row with nothing on it (not bookmarked, no status) is deleted, so the table only holds things someone actually touched.

## Actions

- Written by: [Tick off a Grow suggestion](../actions/setGrowDone.md), [Bookmark, do, skip or reflect on a Grow suggestion](../actions/updateGrowItem.md)
- Read by: [Get my calendar month](../actions/getCalendar.md), [Get my Grow](../actions/getGrow.md), [Tick off a Grow suggestion](../actions/setGrowDone.md), [Bookmark, do, skip or reflect on a Grow suggestion](../actions/updateGrowItem.md)
