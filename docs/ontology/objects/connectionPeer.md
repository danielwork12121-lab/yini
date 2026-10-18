<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Connection peer (view)

A definer view over members + profiles, filtered to connections the caller belongs to.

> Your partner's name, and nothing else.

| | |
|---|---|
| API name | `connectionPeer` |
| Stored in | `public.connection_peers` |
| Primary key | `connection_id`, `user_id` |
| Who can read | Both people in the connection. |
| Crosses the partner boundary | yes — generated, capped and checked before it does |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `connection_id` | string (uuid) | yes |  |  |  |
| `user_id` | string (uuid) | yes |  |  |  |
| `display_name` | string | yes |  |  | The one column of another person that a client may read. |

## Invariants

- Widening the SELECT list of this view is how you would turn it into a leak.

## Links

- **connectionPeers** ← [Connection](../objects/connection.md) (many, via `connection_id`): Names of the people in a connection, one column wide.
