<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->

# Demo login

One tap into a seeded couple (Avery and Sam). Seeds idempotently, then signs in and sets the Supabase session cookie.

| | |
|---|---|
| API name | `demoLogin` |
| Route | `POST /api/demo/login` |
| Who can call | Anyone. The action gates itself. |
| Input from | JSON body |
| Writes | [Profile](../objects/profile.md), [Connection](../objects/connection.md), [Connection member](../objects/connectionMember.md), [Pet](../objects/pet.md) |
| Reads | [Profile](../objects/profile.md), [Connection](../objects/connection.md) |

## Input

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `role` | `avery` \| `sam` | yes |  |  |  |

## Output

| Field | Type | Required | Default | Bounds | Description |
|---|---|---|---|---|---|
| `ok` | `true` | yes |  |  |  |
| `display_name` | string | yes |  |  |  |

Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.

## Invariants

- 403 unless NEXT_PUBLIC_DEMO_MODE=true. Must be off anywhere real people have data.
