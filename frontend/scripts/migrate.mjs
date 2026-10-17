/**
 * Applies supabase/migrations/*.sql to the project in .env.local, in order.
 *
 *   node scripts/migrate.mjs            # apply
 *   node scripts/migrate.mjs --dry      # print what would run
 *
 * Uses the SESSION pooler (port 5432), not the transaction pooler (6543):
 * transaction mode cannot hold the session state that multi-statement DDL needs.
 * Direct db.<ref>.supabase.co is IPv6-only now and will not resolve on most
 * networks, which is why this goes through the pooler at all.
 *
 * Each file runs inside a single transaction, so a migration either lands whole
 * or not at all.
 */
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dry = process.argv.includes('--dry');

const env = Object.fromEntries(
  fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')
    .filter((l) => /^[A-Za-z_]+=/.test(l))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }));

const ref = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, '').split('.')[0];
const password = env.SUPABASE_DB_PASSWORD;
if (!ref || !password) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_DB_PASSWORD in .env.local');
  process.exit(1);
}

/** Supabase does not publish the pooler region anywhere in the project URL. */
async function connect() {
  const hosts = env.SUPABASE_POOLER_HOST
    ? [env.SUPABASE_POOLER_HOST]
    : ['aws-1', 'aws-0'].flatMap((p) =>
        ['us-west-1', 'us-west-2', 'us-east-1', 'us-east-2'].map((r) => `${p}-${r}.pooler.supabase.com`));
  for (const host of hosts) {
    const client = new pg.Client({
      host, port: 5432, user: `postgres.${ref}`, password, database: 'postgres',
      ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000,
    });
    try { await client.connect(); console.log(`connected: ${host}:5432`); return client; }
    catch { try { await client.end(); } catch {} }
  }
  throw new Error('Could not reach the database on any pooler host. Set SUPABASE_POOLER_HOST in .env.local from the dashboard connection string.');
}

const dir = path.join(root, 'supabase', 'migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
if (!files.length) { console.log('no migrations'); process.exit(0); }

const client = await connect();
await client.query(`create table if not exists public.schema_migrations (
  name text primary key, applied_at timestamptz not null default now())`);
const { rows } = await client.query('select name from public.schema_migrations');
const done = new Set(rows.map((r) => r.name));

let applied = 0;
for (const f of files) {
  if (done.has(f)) { console.log(`  skip  ${f} (already applied)`); continue; }
  const sql = fs.readFileSync(path.join(dir, f), 'utf8');
  if (dry) { console.log(`  would apply ${f} (${sql.length} bytes)`); continue; }
  process.stdout.write(`  apply ${f} ... `);
  try {
    await client.query('begin');
    await client.query(sql);
    await client.query('insert into public.schema_migrations(name) values ($1)', [f]);
    await client.query('commit');
    console.log('ok');
    applied++;
  } catch (e) {
    await client.query('rollback').catch(() => {});
    console.log('FAILED');
    console.error(`\n${e.message}`);
    if (e.position) {
      const upto = sql.slice(0, Number(e.position));
      console.error(`at line ${upto.split('\n').length}: ${sql.split('\n')[upto.split('\n').length - 1]?.trim()}`);
    }
    await client.end();
    process.exit(1);
  }
}
await client.end();
console.log(dry ? 'dry run complete' : `${applied} migration(s) applied`);
