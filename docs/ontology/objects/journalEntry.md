<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Journal entry

What one person wrote or said on one day. The most protected object in the system.

> A private journal entry.

| | |
|---|---|
| API name | `journalEntry` |
| Stored in | `public.entries` |
| Primary key | `id` |
| Who can read | Only the person who wrote it. |
| Crosses the partner boundary | no |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `id` | string (uuid) | yes |  |  |  |
| `author_id` | string (uuid) | yes |  |  |  |
| `connection_id` | string (uuid) | yes |  |  |  |
| `local_date` | string | yes |  |  | The author's local day. Several entries on one day are allowed; the nightly run reads them all. |
| `raw_text` | string | yes |  | len 1..8000 | The user's own words. The AI never writes into this column. |
| `input_mode` | `voice` \| `text` | yes |  |  |  |
| `audio_path` | string \| null | yes |  |  | Storage key; the audio is the artifact. |
| `audio_duration_ms` | integer \| null | yes |  |  |  |
| `transcript_failed` | boolean | yes | `false` |  | The entry still saves; the transcript is a convenience. |
| `state` | `rough` \| `strained` \| `steady` \| `good` \| `great` \| null | yes |  |  | Classifier output, as private as the text. |
| `severity` | integer \| null | yes |  |  |  |
| `themes` | `quality_time` \| `communication` \| `chores_logistics` \| `affection` \| `space_autonomy` \| `money` \| `family_friends` \| `work_stress` \| `health_energy` \| `future_plans` \| `appreciation` \| `conflict_repair` \| `other`[] | yes | `[]` | 0..3 items |  |
| `mood_face` | integer \| null | yes |  |  |  |
| `safety_flag` | `none` \| `distress` \| `fear_coercion_abuse` | yes | `"none"` |  |  |
| `classifier_model` | string \| null | yes |  |  |  |
| `classified_at` | string \| null | yes |  |  |  |
| `ai_summary` | string \| null | yes |  |  | 2-3 sentence third-person summary written by the nightly agent. This is the per-person memory later runs read instead of old raw text. |
| `created_at` | string | yes |  |  |  |

## Invariants

- RLS: author_id = auth.uid() for select/insert/update/delete. No policy lets a partner select this row.
- raw_text reaches a model in exactly two places: the classifier inside the author's own check-in, and the nightly agent, which no user triggers and whose output is leak-checked twice.

## Links

- **entryAuthor** → [Profile](../objects/profile.md) (one, via `author_id`): Who wrote it. The only person who may read it.
- **entryConnection** → [Connection](../objects/connection.md) (one, via `connection_id`): Which relationship the entry is about.
- **concernSourceEntry** ← [Concern](../objects/concern.md) (one, via `source_entry_id`): SERVER ONLY. The entry a concern was distilled from.
- **kindWordSourceEntry** ← [Kind word](../objects/kindWord.md) (one, via `source_entry_id`): SERVER ONLY. The entry the words were lifted from verbatim.
- **careActSourceEntry** ← [Care act](../objects/careAct.md) (one, via `source_entry_id`): SERVER ONLY. The entry holding the evidence span.
- **safetyEventEntry** ← [Safety event](../objects/safetyEvent.md) (one, via `entry_id`): The entry that tripped the flag.

## Actions

- Written by: [Analyse now (admin)](../actions/analyzeNow.md), [Check in](../actions/checkIn.md), [Run tonight's analysis now (demo)](../actions/runMyAnalysis.md), [Nightly sweep (cron)](../actions/runNightlySweep.md)
- Read by: [Analyse now (admin)](../actions/analyzeNow.md), [Get today](../actions/getToday.md), [List my entries](../actions/listEntries.md), [Run tonight's analysis now (demo)](../actions/runMyAnalysis.md), [Nightly sweep (cron)](../actions/runNightlySweep.md)
