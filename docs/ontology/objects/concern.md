<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Concern

The only representation of a need that a partner-facing path may read. What reaches the partner is a nudge built from it, never the row.

> A distilled need, derived from one entry at write time.

| | |
|---|---|
| API name | `concern` |
| Stored in | `public.concerns` |
| Primary key | `id` |
| Who can read | Only the person who wrote it. |
| Crosses the partner boundary | yes — generated, capped and checked before it does |
| Server-only fields | `source_entry_id` |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `id` | string (uuid) | yes |  |  |  |
| `connection_id` | string (uuid) | yes |  |  |  |
| `author_id` | string (uuid) | yes |  |  | Who needs this. The recipient is the other member. |
| `source_entry_id` | string (uuid) | yes |  |  | SERVER ONLY. Never leaves the server. |
| `distilled_text` | string | yes |  | len 1..200 | The need, abstracted: no quotes, names, dates, numbers or incident detail. Length is itself a leak channel. |
| `theme` | `quality_time` \| `communication` \| `chores_logistics` \| `affection` \| `space_autonomy` \| `money` \| `family_friends` \| `work_stress` \| `health_energy` \| `future_plans` \| `appreciation` \| `conflict_repair` \| `other` | yes |  |  |  |
| `severity` | integer | yes |  | 0..3 |  |
| `status` | `open` \| `queued` \| `delivered` \| `resolved` \| `withdrawn` \| `escalated` | yes | `"open"` |  |  |
| `times_held` | integer | yes | `0` | ≥ 0 | Days we chose not to deliver. Drives the "stop waiting" rule. |
| `last_hold_reason` | `recipient_rough_day` \| `recipient_already_received_today` \| `severity_too_low_for_now` \| `safety_hold` \| `leak_check_failed` \| `escalated_to_conversation` \| null | yes |  |  |  |
| `times_raised` | integer | yes | `1` |  | High counts escalate to a staged conversation. |
| `first_raised_at` | string | yes |  |  |  |
| `delivered_at` | string \| null | yes |  |  |  |
| `created_at` | string | yes |  |  |  |

## Invariants

- The author may read their own rows ("waiting for a good moment"). The recipient has no policy on this table.

## Links

- **concernSourceEntry** → [Journal entry](../objects/journalEntry.md) (one, via `source_entry_id`): SERVER ONLY. The entry a concern was distilled from.
- **concernAuthor** → [Profile](../objects/profile.md) (one, via `author_id`): Who needs this.
- **nudgeConcern** ← [Nudge](../objects/nudge.md) (one, via `concern_id`): The concern a partner_need nudge delivers, if any.

## Actions

- Written by: [Check in](../actions/checkIn.md)
- Read by: [Check in](../actions/checkIn.md)
