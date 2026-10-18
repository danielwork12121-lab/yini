<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Transcribe audio

Audio in, text out. A failure returns 200 with failed: true so the client keeps the recording and offers typing.

| | |
|---|---|
| API name | `transcribe` |
| Route | `POST /api/transcribe` |
| Who can call | A signed-in user (Supabase session cookie). |
| Input from | multipart form |
| Writes | — |
| Reads | — |

## What a model sees

Whisper or Gemini sees the audio of the caller's own entry.

## Input

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `audio` | any | yes |  |  | webm, mp4 or wav, up to 25MB. |
| `duration_ms` | integer | no | `0` | ≥ 0 |  |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `text` | string | yes |  |  |  |
| `duration_ms` | integer | yes |  | ≥ 0 |  |
| `audio_path` | string \| null | yes |  |  |  |
| `failed` | boolean | yes | `false` |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.
