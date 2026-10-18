<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Connection member

Join table between profiles and connections.

> Membership of one person in one connection.

| | |
|---|---|
| API name | `connectionMember` |
| Stored in | `public.connection_members` |
| Primary key | `connection_id`, `user_id` |
| Who can read | Both people in the connection. |
| Crosses the partner boundary | no |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `connection_id` | string (uuid) | yes |  |  |  |
| `user_id` | string (uuid) | yes |  |  |  |
| `joined_at` | string | yes |  |  | The earlier member is "side A" for the nightly run and decides its timezone. |

## Invariants

- At most two rows per connection, enforced by the connection_members_max_two trigger.

## Links

- **profileMemberships** ← [Profile](../objects/profile.md) (many, via `user_id`): Every connection a person belongs to.
- **connectionMembers** ← [Connection](../objects/connection.md) (many, via `connection_id`): The two people in a connection. Never more than two.

## Actions

- Written by: [Create connection](../actions/createConnection.md), [Demo login](../actions/demoLogin.md), [Join connection](../actions/joinConnection.md)
- Read by: [Analyse now (admin)](../actions/analyzeNow.md), [Check in](../actions/checkIn.md), [Get connection status](../actions/getConnection.md), [Get my Glow](../actions/getGlow.md), [Get my Grow](../actions/getGrow.md), [Get my love notes](../actions/getLoveNotes.md), [Get today](../actions/getToday.md), [Join connection](../actions/joinConnection.md), [Run tonight's analysis now (demo)](../actions/runMyAnalysis.md), [Nightly sweep (cron)](../actions/runNightlySweep.md), [Send a love note](../actions/sendLoveNote.md)
