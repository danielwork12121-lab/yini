<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Safety event

Written when an entry trips a safety flag. Never rendered to the partner.

> Audit trail for safety triage.

| | |
|---|---|
| API name | `safetyEvent` |
| Stored in | `public.safety_events` |
| Primary key | `id` |
| Who can read | No client role. Service role only. |
| Crosses the partner boundary | no |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `id` | string (uuid) | yes |  |  |  |
| `connection_id` | string (uuid) | yes |  |  |  |
| `user_id` | string (uuid) | yes |  |  |  |
| `entry_id` | string (uuid) \| null | yes |  |  |  |
| `flag` | `none` \| `distress` \| `fear_coercion_abuse` | yes |  |  |  |
| `created_at` | string | yes |  |  |  |

## Links

- **safetyEventEntry** → [Journal entry](../objects/journalEntry.md) (one, via `entry_id`): The entry that tripped the flag.

## Actions

- Written by: [Check in](../actions/checkIn.md)
