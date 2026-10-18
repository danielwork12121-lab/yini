<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Nudge message

A private coaching thread attached to one nudge.

> The focused chat under a nudge: "how do I actually move forward on this?"

| | |
|---|---|
| API name | `nudgeMessage` |
| Stored in | `public.nudge_messages` |
| Primary key | `id` |
| Who can read | Only the person it was written for. |
| Crosses the partner boundary | no |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `id` | string (uuid) | yes |  |  |  |
| `nudge_id` | string (uuid) | yes |  |  |  |
| `role` | `user` \| `coach` | yes |  |  | The coach only. This thread never reaches the partner, in either direction. |
| `body` | string | yes |  | len 1..4000 |  |
| `created_at` | string | yes |  |  |  |

## Links

- **nudgeMessages** ← [Nudge](../objects/nudge.md) (many, via `nudge_id`): The private coaching thread under a nudge.
