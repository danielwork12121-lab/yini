<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Profile

One row per person. Identity comes from Supabase Auth; the app never stores a password.

> A person. Created by a trigger when a Supabase auth user is created.

| | |
|---|---|
| API name | `profile` |
| Stored in | `public.profiles` |
| Primary key | `id` |
| Who can read | Only the person the row is about. |
| Crosses the partner boundary | no |

## Fields

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `id` | string (uuid) | yes |  |  | Same value as auth.users.id. Supabase owns sign-in; this row owns everything else. |
| `display_name` | string | yes |  | len 1..40 | What the partner sees. The only profile field that ever crosses over, via connection_peers. |
| `timezone` | string | yes | `"America/Los_Angeles"` |  | IANA zone. Decides the local day for check-ins and the nightly run. |
| `default_connection_id` | string (uuid) \| null | yes |  |  | So the daily log opens with zero taps to choose who. |
| `coach_tone` | `warm` \| `plain` \| `playful` \| `brief` | yes | `"warm"` |  | Changes how the coach talks to you. Never what gets delivered. |
| `notify_at` | string | yes | `"20:00"` |  | Preferred notification window, local HH:MM. |
| `created_at` | string | yes |  |  |  |

## Invariants

- A partner never selects a row here. Their name reaches you through the connection_peers view, one column wide.

## Links

- **profileMemberships** → [Connection member](../objects/connectionMember.md) (many, via `user_id`): Every connection a person belongs to.
- **profileDefaultConnection** → [Connection](../objects/connection.md) (one, via `default_connection_id`): The connection the daily log opens on.
- **entryAuthor** ← [Journal entry](../objects/journalEntry.md) (one, via `author_id`): Who wrote it. The only person who may read it.
- **concernAuthor** ← [Concern](../objects/concern.md) (one, via `author_id`): Who needs this.
- **nudgeRecipient** ← [Nudge](../objects/nudge.md) (one, via `recipient_id`): Who the nudge is for.
- **kindWordRecipient** ← [Kind word](../objects/kindWord.md) (one, via `recipient_id`): Who the kind words are about.
- **careActBeneficiary** ← [Care act](../objects/careAct.md) (one, via `beneficiary_id`): Who the act was for; the person the reveal is shown to.
- **questAuthor** ← [Quest](../objects/quest.md) (one, via `author_id`): Whose quest it is.
- **moodDayAuthor** ← [Mood day](../objects/moodDay.md) (one, via `author_id`): Whose calendar the day belongs to.
- **feedbackRecipient** ← [Daily feedback](../objects/dailyFeedback.md) (one, via `recipient_id`): The one person who may read it.

## Actions

- Written by: [Create connection](../actions/createConnection.md), [Demo login](../actions/demoLogin.md), [Join connection](../actions/joinConnection.md)
- Read by: [Analyse now (admin)](../actions/analyzeNow.md), [Check in](../actions/checkIn.md), [Create connection](../actions/createConnection.md), [Demo login](../actions/demoLogin.md), [Get connection status](../actions/getConnection.md), [Get my Glow](../actions/getGlow.md), [Get my Grow](../actions/getGrow.md), [Get today](../actions/getToday.md), [Run tonight's analysis now (demo)](../actions/runMyAnalysis.md), [Nightly sweep (cron)](../actions/runNightlySweep.md), [Tick off a Grow suggestion](../actions/setGrowDone.md)
