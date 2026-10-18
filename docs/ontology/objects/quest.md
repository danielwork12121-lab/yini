<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Quest

Keeps the supply of kind words from running dry.

> A short prompt that banks compliments for the other person and feeds the pet.

| | |
|---|---|
| API name | `quest` |
| Stored in | `public.quests` |
| Primary key | `id` |
| Who can read | Only the person who wrote it. |
| Crosses the partner boundary | no |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `id` | string (uuid) | yes |  |  |  |
| `connection_id` | string (uuid) | yes |  |  |  |
| `author_id` | string (uuid) | yes |  |  |  |
| `prompt_key` | string | yes |  | len 1..60 |  |
| `prompt_text` | string | yes |  | len 1..300 |  |
| `completed_at` | string \| null | yes |  |  |  |
| `created_at` | string | yes |  |  |  |

## Links

- **questAuthor** → [Profile](../objects/profile.md) (one, via `author_id`): Whose quest it is.
