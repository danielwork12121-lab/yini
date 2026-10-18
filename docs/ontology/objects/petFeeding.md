<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Pet feeding

Attendance. Inserted on any completed check-in regardless of mood; a brutal day feeds the pet exactly as well as a great one.

> One row per person per day they showed up.

| | |
|---|---|
| API name | `petFeeding` |
| Stored in | `public.pet_feedings` |
| Primary key | `connection_id`, `local_date`, `author_id` |
| Who can read | Both people in the connection. |
| Crosses the partner boundary | no |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `connection_id` | string (uuid) | yes |  |  |  |
| `local_date` | string | yes |  |  |  |
| `author_id` | string (uuid) | yes |  |  |  |
| `created_at` | string | yes |  |  |  |

## Invariants

- Rows are never deleted.

## Links

- **connectionFeedings** ← [Connection](../objects/connection.md) (many, via `connection_id`): Attendance rows that grow the pet.

## Actions

- Written by: [Check in](../actions/checkIn.md)
- Read by: [Check in](../actions/checkIn.md), [Get today](../actions/getToday.md)
