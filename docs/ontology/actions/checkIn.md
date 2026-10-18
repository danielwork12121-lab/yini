<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Check in

Save today's entry and reply in the same breath: classify, feed the pet, decide whether one partner item can land, compose, leak-check.

| | |
|---|---|
| API name | `checkIn` |
| Route | `POST /api/checkin` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | JSON body |
| Writes | [Journal entry](../objects/journalEntry.md), [Mood day](../objects/moodDay.md), [Pet feeding](../objects/petFeeding.md), [Pet](../objects/pet.md), [Concern](../objects/concern.md), [Kind word](../objects/kindWord.md), [Care act](../objects/careAct.md), [Nudge](../objects/nudge.md), [Safety event](../objects/safetyEvent.md), [Connection](../objects/connection.md) |
| Reads | [Profile](../objects/profile.md), [Connection](../objects/connection.md), [Connection member](../objects/connectionMember.md), [Concern](../objects/concern.md), [Care act](../objects/careAct.md), [Nudge](../objects/nudge.md), [Pet feeding](../objects/petFeeding.md), [Pet](../objects/pet.md) |

## What a model sees

The classifier sees the author's own raw text, inside the author's own request. The composer sees distilled concerns and the author's own words, never the partner's raw text. The leak checker sees only the finished output.

## Input

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `text` | string | yes |  | len 1..8000 | The user's own words. Required either way; voice arrives already transcribed. |
| `input_mode` | `voice` \| `text` | yes |  |  |  |
| `connection_id` | string (uuid) \| null | no | `null` |  | Null means your default connection. |
| `audio_path` | string \| null | no | `null` |  |  |
| `audio_duration_ms` | integer \| null | no | `null` |  |  |
| `transcript_failed` | boolean | no | `false` |  |  |
| `local_date` | string | yes |  |  | Computed client-side from the device clock, YYYY-MM-DD. |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `entry_id` | string (uuid) | yes |  |  |  |
| `mood_face` | integer | yes |  | 1..5 |  |
| `reply` | object | yes |  |  |  |
| `pet` | object | yes |  |  | What the client renders for the pet, derived on every read. |
| `pet_hatched_now` | boolean | yes | `false` |  |  |
| `safety` | object \| null | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.

## Invariants

- The entry is saved before any model call, so an outage costs the reply, never the journal.
- Safety is checked before any mediation work exists to leak.
- At most one partner item per recipient per day.
