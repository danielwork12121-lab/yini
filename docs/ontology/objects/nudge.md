<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Nudge

The immediate, same-breath output of a check-in that is meant for one person.

> One delivered item for the recipient, produced during a check-in.

| | |
|---|---|
| API name | `nudge` |
| Stored in | `public.nudges` |
| Primary key | `id` |
| Who can read | Only the person it was written for. |
| Crosses the partner boundary | yes — generated, capped and checked before it does |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `id` | string (uuid) | yes |  |  |  |
| `connection_id` | string (uuid) | yes |  |  |  |
| `recipient_id` | string (uuid) | yes |  |  |  |
| `concern_id` | string (uuid) \| null | yes |  |  | Null for self_care, context and reveal. |
| `kind` | `self_care` \| `partner_need` \| `partner_context` \| `reveal` \| `conversation` | yes |  |  |  |
| `body_text` | string | yes |  | len 1..900 | Written for the recipient, framed as something that helps them. Never quotes the partner. |
| `delivered_on` | string | yes |  |  | Recipient's local day. |
| `theme` | `quality_time` \| `communication` \| `chores_logistics` \| `affection` \| `space_autonomy` \| `money` \| `family_friends` \| `work_stress` \| `health_energy` \| `future_plans` \| `appreciation` \| `conflict_repair` \| `other` \| null | yes |  |  |  |
| `status` | `new` \| `working` \| `set_down` \| `done` | yes | `"new"` |  |  |
| `acted_at` | string \| null | yes |  |  |  |
| `acted_note` | string \| null | yes |  |  | The recipient's own words about what they did. |
| `leak_verdict` | `pass` \| `fail` \| `skipped` \| `error` | yes | `"skipped"` |  |  |
| `leak_score` | number \| null | yes |  |  |  |
| `leak_rewrites` | integer | yes | `0` | ≥ 0 |  |
| `created_at` | string | yes |  |  |  |

## Invariants

- Passed the adversarial leak check (or was dropped) before insert.

## Links

- **nudgeConcern** → [Concern](../objects/concern.md) (one, via `concern_id`): The concern a partner_need nudge delivers, if any.
- **nudgeRecipient** → [Profile](../objects/profile.md) (one, via `recipient_id`): Who the nudge is for.
- **nudgeMessages** → [Nudge message](../objects/nudgeMessage.md) (many, via `nudge_id`): The private coaching thread under a nudge.

## Actions

- Written by: [Check in](../actions/checkIn.md)
- Read by: [Check in](../actions/checkIn.md), [Get my Grow](../actions/getGrow.md), [Get today](../actions/getToday.md)
