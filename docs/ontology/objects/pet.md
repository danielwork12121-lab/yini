<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Pet

The only honest shared object in the product. It reveals nothing private about either person.

> The shared pet. Identity only; progression is derived.

| | |
|---|---|
| API name | `pet` |
| Stored in | `public.pets` |
| Primary key | `connection_id` |
| Who can read | Both people in the connection. |
| Crosses the partner boundary | no |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `connection_id` | string (uuid) | yes |  |  |  |
| `name` | string | yes |  | len 1..24 |  |
| `species` | `blob-bird` \| `cat` \| `bunny` \| `frog` \| `axolotl` \| `capybara` \| `penguin` \| `fox` \| null | yes |  |  | Null until chosen. The egg defers the decision. |
| `hatched_at` | string \| null | yes |  |  | Set on the first day BOTH people logged. |
| `xp` | integer | yes | `0` | ≥ 0 | Follow-through on nudges and quests. Separate from feedings, which are attendance. |
| `created_at` | string | yes |  |  |  |

## Invariants

- No column anyone could decrement. "Never dies" is a property of the schema.

## Links

- **connectionPet** ← [Connection](../objects/connection.md) (many, via `connection_id`): The shared pet (exactly one per connection; keyed by connection_id).

## Actions

- Written by: [Check in](../actions/checkIn.md), [Create connection](../actions/createConnection.md), [Demo login](../actions/demoLogin.md)
- Read by: [Check in](../actions/checkIn.md), [Get today](../actions/getToday.md)
