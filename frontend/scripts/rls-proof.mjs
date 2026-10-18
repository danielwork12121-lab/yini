/**
 * Runs supabase/tests/rls_proof.sql through node-postgres, so no psql install is needed.
 *
 *   npm run db:proof                                  # local Supabase (supabase start)
 *   DATABASE_URL=postgres://... npm run db:proof      # any other database
 *
 * psql meta-commands (\set, \pset) are stripped; the proof itself is plain SQL.
 */
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql = fs.readFileSync(path.join(root, 'supabase/tests/rls_proof.sql'), 'utf8')
  .split('\n').filter((l) => !l.startsWith('\\')).join('\n');

const client = new pg.Client({ connectionString: url });
client.on('notice', (n) => console.log(n.message));
await client.connect();
try {
  await client.query(sql);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
