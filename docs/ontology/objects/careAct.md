<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Care act

The invisible labour the reveal makes visible. Nothing lands here without a verbatim evidence span.

> Something one person actually did for the other.

| | |
|---|---|
| API name | `careAct` |
| Stored in | `public.care_acts` |
| Primary key | `id` |
| Who can read | No client role. Service role only. |
| Crosses the partner boundary | yes — generated, capped and checked before it does |
| Server-only fields | `source_span`, `source_entry_id` |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `id` | string (uuid) | yes |  |  |  |
| `connection_id` | string (uuid) | yes |  |  |  |
| `actor_id` | string (uuid) | yes |  |  | Who did it. |
| `beneficiary_id` | string (uuid) | yes |  |  | Who it was for. |
| `source` | `entry` \| `nudge_followthrough` \| `quest` | yes |  |  |  |
| `source_entry_id` | string (uuid) \| null | yes |  |  | SERVER ONLY. |
| `source_nudge_id` | string (uuid) \| null | yes |  |  |  |
| `source_span` | string | yes |  | len 1..300 | Verified substring of the actor's own text. Never shown raw; proves the act happened. |
| `description` | string | yes |  | len 1..160 | Third-person rendering shown in the reveal, e.g. "covered dinner twice". |
| `occurred_on` | string | yes |  |  |  |
| `revealed_at` | string \| null | yes |  |  |  |
| `created_at` | string | yes |  |  |  |

## Invariants

- Ungranted to every client role. The reveal is server-rendered prose.

## Links

- **careActSourceEntry** → [Journal entry](../objects/journalEntry.md) (one, via `source_entry_id`): SERVER ONLY. The entry holding the evidence span.
- **careActBeneficiary** → [Profile](../objects/profile.md) (one, via `beneficiary_id`): Who the act was for; the person the reveal is shown to.

## Actions

- Written by: [Check in](../actions/checkIn.md)
- Read by: [Check in](../actions/checkIn.md)
