<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# App clock

A single row that moves "today" forwards for everyone, so a demo can skip to the next day. Moved by hand from the Supabase SQL editor, never from inside the app.

> The testing clock: how many days the whole app has been fast-forwarded.

| | |
|---|---|
| API name | `appClock` |
| Stored in | `public.app_clock` |
| Primary key | `id` |
| Who can read | No client role. Service role only. |
| Crosses the partner boundary | no |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `id` | integer | yes |  | 1..1 | Always 1. There is exactly one clock. |
| `day_offset` | integer | yes |  | -400..400 | Whole days added to "today" for every user. 0 in normal life. |
| `updated_at` | string | yes |  |  |  |

## Invariants

- CHECK (id = 1): one row only.
- No client grant and no policy. The browser learns the offset from GET /api/clock, which exposes the number and nothing else.

## Actions

- Read by: [Get the testing clock](../actions/getClock.md)
