/**
 * The ontology is only useful if it is true. These tests hold it to the database
 * (migrations), the routes (src/app/api) and the docs (docs/ontology).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ontology } from './index';
import { renderOntologyDocs } from './docs';

const root = path.resolve(__dirname, '../..');
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).sort()
  .map((f) => fs.readFileSync(path.join(root, 'supabase/migrations', f), 'utf8')).join('\n');

const SQL_TYPES = /^(uuid|text|date|timestamptz|integer|smallint|boolean|real)\b/;

function sqlColumns(): Map<string, Set<string>> {
  const tables = new Map<string, Set<string>>();
  for (const m of migrations.matchAll(/create table public\.(\w+)\s*\(([\s\S]*?)\n\);/g)) {
    const cols = new Set<string>();
    for (const line of m[2].split('\n')) {
      const t = line.trim().match(/^([a-z_]+)\s+(.*)$/);
      if (t && SQL_TYPES.test(t[2])) cols.add(t[1]);
    }
    tables.set(m[1], cols);
  }
  for (const m of migrations.matchAll(/alter table public\.(\w+)\s+add column (\w+)/g)) tables.get(m[1])?.add(m[2]);
  return tables;
}
const views = new Set([...migrations.matchAll(/create or replace view public\.(\w+)/g)].map((m) => m[1]));
const selectPolicies = [...migrations.matchAll(/create policy \w+ on public\.(\w+)\s+for select using \(([\s\S]*?)\);/g)]
  .map((m) => ({ table: m[1], predicate: m[2] }));
const clientGrants = [...migrations.matchAll(/grant\s+([a-z, ]+?)\s+on\s+public\.(\w+)\s+to\s+authenticated/g)]
  .map((m) => ({ table: m[2], privileges: m[1] }));

describe('ontology registry', () => {
  it('has unique api names', () => {
    const names = [...ontology.objects, ...ontology.actions, ...ontology.links].map((x) => x.apiName);
    expect(new Set(names).size).toBe(names.length);
  });

  it('links point at real objects through real fields', () => {
    for (const l of ontology.links) {
      const from = ontology.object(l.from), to = ontology.object(l.to);
      expect(from, `${l.apiName}.from`).toBeDefined();
      expect(to, `${l.apiName}.to`).toBeDefined();
      const holder = l.cardinality === 'one' ? from! : to!;
      expect(Object.keys(holder.schema.shape), `${l.apiName}.foreignKey on ${holder.apiName}`).toContain(l.foreignKey);
    }
  });

  it('actions only name real objects', () => {
    for (const a of ontology.actions) {
      for (const o of [...a.writes, ...a.reads]) expect(ontology.object(o), `${a.apiName} → ${o}`).toBeDefined();
    }
  });

  it('every primary key and server-only field is a schema field', () => {
    for (const o of ontology.objects) {
      const fields = Object.keys(o.schema.shape);
      for (const k of [...o.primaryKey, ...(o.serverOnlyFields ?? [])]) expect(fields, `${o.apiName}.${k}`).toContain(k);
    }
  });
});

describe('ontology ↔ database', () => {
  const tables = sqlColumns();

  it.each(ontology.objects.filter((o) => o.table && !views.has(o.table)).map((o) => [o.apiName, o] as const))(
    '%s: schema fields are exactly the table columns', (_, o) => {
      const cols = tables.get(o.table!);
      expect(cols, `table public.${o.table} exists`).toBeDefined();
      expect([...cols!].sort()).toEqual(Object.keys(o.schema.shape).sort());
    });

  it('view-backed objects point at real views', () => {
    for (const o of ontology.objects.filter((x) => x.table && !tables.has(x.table))) {
      expect(views.has(o.table!), `${o.table} is a view`).toBe(true);
    }
  });

  const EXPECT_PREDICATE: Record<string, RegExp> = {
    self: /\bid = \(select auth\.uid\(\)\)/,
    author: /author_id = \(select auth\.uid\(\)\)/,
    recipient: /recipient_id = \(select auth\.uid\(\)\)/,
    members: /app\.is_member|app\.my_connections/,
  };

  it.each(ontology.objects.filter((o) => o.table && !views.has(o.table)).map((o) => [o.apiName, o] as const))(
    '%s: RLS matches the declared visibility', (_, o) => {
      const grants = clientGrants.filter((g) => g.table === o.table);
      const policies = selectPolicies.filter((p) => p.table === o.table);
      if (o.visibility === 'server') {
        expect(grants, `no client grant on ${o.table}`).toEqual([]);
        expect(policies).toEqual([]);
        return;
      }
      expect(grants.some((g) => g.privileges.includes('select')), `select granted on ${o.table}`).toBe(true);
      expect(policies.length, `a select policy on ${o.table}`).toBeGreaterThan(0);
      for (const p of policies) expect(p.predicate).toMatch(EXPECT_PREDICATE[o.visibility]);
    });
});

describe('ontology ↔ routes', () => {
  it.each(ontology.actions.map((a) => [a.apiName, a] as const))('%s is served by its route file', (_, a) => {
    const file = path.join(root, 'src/app', a.route.path, 'route.ts');
    expect(fs.existsSync(file), file).toBe(true);
    const src = fs.readFileSync(file, 'utf8');
    expect(src).toMatch(new RegExp(`export const ${a.route.method} = actionRoute\\(actionTypes\\.${a.apiName}\\b`));
  });

  it('every API route is an ontology action', () => {
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) walk(path.join(dir, e.name));
        else if (e.name === 'route.ts') found.push(path.relative(path.join(root, 'src/app'), dir));
      }
    };
    walk(path.join(root, 'src/app/api'));
    const declared = new Set(ontology.actions.map((a) => a.route.path.slice(1)));
    expect(found.filter((r) => !declared.has(r))).toEqual([]);
  });
});

describe('ontology docs', () => {
  it('docs/ontology matches the definitions (run `npm run ontology:docs`)', () => {
    const outDir = path.resolve(root, '../docs/ontology');
    for (const [f, body] of renderOntologyDocs()) {
      const p = path.join(outDir, f);
      expect(fs.existsSync(p), `${f} exists`).toBe(true);
      expect(fs.readFileSync(p, 'utf8'), f).toBe(body);
    }
  });
});
