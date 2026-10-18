<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Pet state (derived)

Computed from pet + pet feedings by derivePetState(). Nothing stored means nothing can desync.

> What the client renders for the pet, derived on every read.

| | |
|---|---|
| API name | `petState` |
| Stored in | _derived, never stored_ |
| Primary key | — |
| Who can read | Both people in the connection. |
| Crosses the partner boundary | no |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `name` | string | yes |  |  |  |
| `species` | string \| null | yes |  |  |  |
| `hatched` | boolean | yes |  |  |  |
| `total_half_days` | integer | yes |  | ≥ 0 |  |
| `xp` | integer | yes |  | ≥ 0 |  |
| `stage` | integer | yes |  | 0..4 |  |
| `stage_key` | string | yes |  |  |  |
| `bond_level` | integer | yes |  | 0..10 |  |
| `bond_name` | string | yes |  |  |  |
| `next_threshold` | integer \| null | yes |  |  |  |
| `you_fed_today` | boolean | yes |  |  | Whether YOU fed today. We never report whether your partner did. |
| `both_fed_today` | boolean | yes |  |  | True only when both halves are in. Drives the paired animation. |
