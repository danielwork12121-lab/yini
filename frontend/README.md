# Yini

Two private journals, one quiet thing a day worth doing. Neither person ever reads the other.

This folder is the whole app: Next.js UI, API routes, the nightly agent, and the Supabase schema. Architecture: [`docs/design_doc/architecture.md`](../docs/design_doc/architecture.md). Every object and API action has its own page in [`docs/ontology/`](../docs/ontology/README.md).

## Run it locally

```bash
npm install
supabase start          # needs Docker; applies supabase/migrations
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# from `supabase status`, and set ADMIN_TOKEN / CRON_SECRET to any long random strings
npm run dev
```

With no model key set, everything runs on a deterministic mock. Add `GEMINI_API_KEY` to use Gemini.

Open http://localhost:3000 and tap **I'm Avery**, then open a private window and tap **I'm Sam**. Check in as both people. Then use **Demo: run tonight's reflection now** to watch the overnight feedback arrive on both screens.

## Test it

| | |
|---|---|
| `npm test` | Ontology vs migrations and RLS, nightly pipeline, policy, route wrapper |
| `npm run contract:test` | Policy self-test |
| `npm run db:proof` | RLS attack proof against the local database |
| `npm run typecheck && npm run build` | Types and production build |
| `postman/` | Import both files, set `adminToken` / `cronSecret`, run the folders in order |

## Change something

1. Edit or add an object in `src/ontology/objects/`, or an action in `src/ontology/actions/`.
2. Add a migration in `supabase/migrations/` if the database changes.
3. Bind the action to its route with `actionRoute(actionTypes.yourAction, handler)`.
4. Run `npm run ontology:docs`, then `npm test`. The tests name anything that has drifted.

## Deploy

On Vercel:

1. Import the GitHub repo and set **Root Directory** to `frontend/` (this is a project setting, not something `vercel.json` can set). The framework, install and build commands come from `vercel.json`.
2. Add the variables from `.env.example` under Settings → Environment Variables. The app needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to leave the setup screen; add `CRON_SECRET` and `ADMIN_TOKEN` for the nightly routes, and a model key (e.g. `GEMINI_API_KEY`) or leave it unset to run on the mock.
3. `vercel.json` schedules the nightly sweep (`/api/cron/nightly`, daily at 09:00 UTC). Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.
4. In Supabase → Authentication → URL Configuration, add the Vercel domain to the site URL and redirect allow-list (`https://<your-domain>/auth/callback`).
5. Apply migrations to the hosted project with `npm run db:migrate`.

`NEXT_PUBLIC_DEMO_MODE=true` enables the one-tap demo login. Turn it off for any deployment with real users.
