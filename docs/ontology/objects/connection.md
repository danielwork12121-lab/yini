<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Connection

A pair. A user may have many; they share nothing with each other.

> A sealed relationship between exactly two people.

| | |
|---|---|
| API name | `connection` |
| Stored in | `public.connections` |
| Primary key | `id` |
| Who can read | Both people in the connection. |
| Crosses the partner boundary | no |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `id` | string (uuid) | yes |  |  |  |
| `kind` | `partner` \| `parent` \| `sibling` \| `friend` \| `other` | yes | `"partner"` |  | The relationship type. The hackathon UI ships partner only. |
| `invite_code` | string | yes |  | len 6..6 | Read aloud to the other person. No I, O, 0 or 1. |
| `mediation_paused_at` | string \| null | yes |  |  | Non-null the moment anything trips fear/coercion/abuse. All mediation stops, including the nightly run. |
| `created_at` | string | yes |  |  |  |

## Invariants

- A trigger caps membership at two rows.

## Links

- **connectionMembers** → [Connection member](../objects/connectionMember.md) (many, via `connection_id`): The two people in a connection. Never more than two.
- **connectionPeers** → [Connection peer (view)](../objects/connectionPeer.md) (many, via `connection_id`): Names of the people in a connection, one column wide.
- **connectionPet** → [Pet](../objects/pet.md) (many, via `connection_id`): The shared pet (exactly one per connection; keyed by connection_id).
- **connectionFeedings** → [Pet feeding](../objects/petFeeding.md) (many, via `connection_id`): Attendance rows that grow the pet.
- **connectionRuns** → [Analysis run](../objects/analysisRun.md) (many, via `connection_id`): One nightly run per day. The latest done run holds the rolling pair_summary.
- **profileDefaultConnection** ← [Profile](../objects/profile.md) (one, via `default_connection_id`): The connection the daily log opens on.
- **entryConnection** ← [Journal entry](../objects/journalEntry.md) (one, via `connection_id`): Which relationship the entry is about.

## Actions

- Written by: [Check in](../actions/checkIn.md), [Create connection](../actions/createConnection.md), [Demo login](../actions/demoLogin.md)
- Read by: [Analyse now (admin)](../actions/analyzeNow.md), [Check in](../actions/checkIn.md), [Create connection](../actions/createConnection.md), [Demo login](../actions/demoLogin.md), [Get connection status](../actions/getConnection.md), [Get today](../actions/getToday.md), [Join connection](../actions/joinConnection.md), [Run tonight's analysis now (demo)](../actions/runMyAnalysis.md), [Nightly sweep (cron)](../actions/runNightlySweep.md)
