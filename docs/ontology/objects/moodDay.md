<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Mood day

Your calendar. There is no partner-visible view.

> One face per day on your own calendar.

| | |
|---|---|
| API name | `moodDay` |
| Stored in | `public.mood_days` |
| Primary key | `author_id`, `connection_id`, `local_date` |
| Who can read | Only the person who wrote it. |
| Crosses the partner boundary | no |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `author_id` | string (uuid) | yes |  |  |  |
| `connection_id` | string (uuid) | yes |  |  |  |
| `local_date` | string | yes |  |  |  |
| `mood_face` | integer | yes |  | 1..5 |  |
| `source` | `self` \| `derived` | yes | `"derived"` |  |  |
| `note` | string \| null | yes |  |  | The coach's short private note on that day. |
| `created_at` | string | yes |  |  |  |

## Links

- **moodDayAuthor** → [Profile](../objects/profile.md) (one, via `author_id`): Whose calendar the day belongs to.

## Actions

- Written by: [Check in](../actions/checkIn.md)
