/**
 * Renders the ontology to Markdown: one page per object type, one per action type,
 * and an index with the link graph. `npm run ontology:docs` writes them to
 * `docs/ontology/`; `ontology.test.ts` fails if the committed pages are stale.
 */
import { z } from 'zod';
import { ontology } from './index';
import type { ActionType, ObjectType } from './define';

type JsonSchema = {
  type?: string | string[];
  enum?: unknown[];
  const?: unknown;
  format?: string;
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  description?: string;
  default?: unknown;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
};

const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

function typeOf(p: JsonSchema): string {
  if (p.anyOf) return p.anyOf.map(typeOf).join(' \\| ');
  if (p.const !== undefined) return `\`${JSON.stringify(p.const)}\``;
  if (p.enum) return p.enum.map((v) => `\`${v}\``).join(' \\| ');
  const types = Array.isArray(p.type) ? p.type : p.type ? [p.type] : ['any'];
  return types.map((t) => {
    if (t === 'array') return `${p.items ? typeOf(p.items) : 'any'}[]`;
    if (t === 'string' && p.format) return `string (${p.format})`;
    return t;
  }).join(' \\| ');
}

function bounds(p: JsonSchema): string {
  const parts: string[] = [];
  if (p.minLength !== undefined || p.maxLength !== undefined) parts.push(`len ${p.minLength ?? 0}..${p.maxLength ?? '∞'}`);
  const big = Number.MAX_SAFE_INTEGER;
  const min = p.minimum !== undefined && p.minimum > -big ? p.minimum : undefined;
  const max = p.maximum !== undefined && p.maximum < big ? p.maximum : undefined;
  if (min !== undefined || max !== undefined) parts.push(max === undefined ? `≥ ${min}` : `${min ?? '-∞'}..${max}`);
  if (p.minItems !== undefined || p.maxItems !== undefined) parts.push(`${p.minItems ?? 0}..${p.maxItems ?? '∞'} items`);
  return parts.join(', ');
}

function fieldTable(schema: z.ZodType, io: 'input' | 'output'): string {
  const js = z.toJSONSchema(schema, { io, unrepresentable: 'any' }) as JsonSchema;
  const props = Object.entries(js.properties ?? {});
  if (!props.length) return '_No fields._\n';
  const req = new Set(js.required ?? []);
  const rows = props.map(([name, p]) => {
    const def = p.default !== undefined ? `\`${JSON.stringify(p.default)}\`` : '';
    return `| \`${name}\` | ${typeOf(p)} | ${req.has(name) ? 'yes' : 'no'} | ${def} | ${esc(bounds(p))} | ${esc(p.description ?? '')} |`;
  });
  return ['| Field | Type | Required | Default | Bounds | Description |', '|---|---|---|---|---|---|', ...rows].join('\n') + '\n';
}

const objLink = (apiName: string, from: 'root' | 'sub') => {
  const o = ontology.object(apiName);
  const href = from === 'root' ? `objects/${apiName}.md` : `../objects/${apiName}.md`;
  return o ? `[${o.title}](${href})` : `\`${apiName}\``;
};
const actLink = (a: ActionType, from: 'root' | 'sub') =>
  `[${a.title}](${from === 'root' ? `actions/${a.apiName}.md` : `../actions/${a.apiName}.md`})`;

const VISIBILITY: Record<ObjectType['visibility'], string> = {
  self: 'Only the person the row is about.',
  author: 'Only the person who wrote it.',
  recipient: 'Only the person it was written for.',
  members: 'Both people in the connection.',
  server: 'No client role. Service role only.',
};

const HEADER = '<!-- Generated from src/ontology by `npm run ontology:docs`. Edit the TypeScript, not this file. -->\n\n';

function renderObject(o: ObjectType): string {
  const outLinks = ontology.links.filter((l) => l.from === o.apiName);
  const inLinks = ontology.links.filter((l) => l.to === o.apiName);
  const writers = ontology.actions.filter((a) => a.writes.includes(o.apiName));
  const readers = ontology.actions.filter((a) => a.reads.includes(o.apiName));
  const lines = [
    `# ${o.title}`, '',
    o.description, '',
    o.schema.description ? `> ${o.schema.description}\n` : '',
    '| | |', '|---|---|',
    `| API name | \`${o.apiName}\` |`,
    `| Stored in | ${o.table ? `\`public.${o.table}\`` : '_derived, never stored_'} |`,
    `| Primary key | ${o.primaryKey.length ? o.primaryKey.map((k) => `\`${k}\``).join(', ') : '—'} |`,
    `| Who can read | ${VISIBILITY[o.visibility]} |`,
    `| Crosses the partner boundary | ${o.crossesBoundary ? 'yes — generated, capped and checked before it does' : 'no'} |`,
    o.serverOnlyFields?.length ? `| Server-only fields | ${o.serverOnlyFields.map((f) => `\`${f}\``).join(', ')} |` : '',
    '', '## Fields', '', fieldTable(o.schema, 'output'),
  ];
  if (o.invariants?.length) lines.push('## Invariants', '', ...o.invariants.map((i) => `- ${i}`), '');
  if (outLinks.length || inLinks.length) {
    lines.push('## Links', '');
    for (const l of outLinks) lines.push(`- **${l.apiName}** → ${objLink(l.to, 'sub')} (${l.cardinality}, via \`${l.foreignKey}\`): ${l.description}`);
    for (const l of inLinks) lines.push(`- **${l.apiName}** ← ${objLink(l.from, 'sub')} (${l.cardinality}, via \`${l.foreignKey}\`): ${l.description}`);
    lines.push('');
  }
  if (writers.length || readers.length) {
    lines.push('## Actions', '');
    if (writers.length) lines.push(`- Written by: ${writers.map((a) => actLink(a, 'sub')).join(', ')}`);
    if (readers.length) lines.push(`- Read by: ${readers.map((a) => actLink(a, 'sub')).join(', ')}`);
    lines.push('');
  }
  return HEADER + lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
}

const ACTOR: Record<ActionType['actor'], string> = {
  user: 'A signed-in user (Supabase session cookie).',
  public: 'Anyone. The action gates itself.',
  admin: 'Operator, with header `x-admin-token: $ADMIN_TOKEN`.',
  cron: 'Vercel Cron, with header `Authorization: Bearer $CRON_SECRET`.',
};

function renderAction(a: ActionType): string {
  const lines = [
    `# ${a.title}`, '',
    a.description, '',
    '| | |', '|---|---|',
    `| API name | \`${a.apiName}\` |`,
    `| Route | \`${a.route.method} ${a.route.path}\` |`,
    `| Who can call | ${ACTOR[a.actor]} |`,
    `| Input from | ${a.inputFrom === 'none' ? 'nothing' : a.inputFrom === 'query' ? 'query string' : a.inputFrom === 'multipart' ? 'multipart form' : 'JSON body'} |`,
    `| Writes | ${a.writes.length ? a.writes.map((w) => objLink(w, 'sub')).join(', ') : '—'} |`,
    `| Reads | ${a.reads.length ? a.reads.map((r) => objLink(r, 'sub')).join(', ') : '—'} |`,
    '',
  ];
  if (a.modelAccess) lines.push('## What a model sees', '', a.modelAccess, '');
  if (a.inputFrom !== 'none') lines.push('## Input', '', fieldTable(a.input, 'input'));
  lines.push('## Output', '', fieldTable(a.output, 'output'));
  lines.push('Errors use one envelope: `{ "error": string, "code": ApiErrorCode, "recoverable": boolean }`.', '');
  if (a.invariants?.length) lines.push('## Invariants', '', ...a.invariants.map((i) => `- ${i}`), '');
  return HEADER + lines.join('\n');
}

function renderIndex(): string {
  const objectRows = ontology.objects.map((o) =>
    `| ${objLink(o.apiName, 'root')} | ${o.table ? `\`${o.table}\`` : '_derived_'} | ${o.visibility} | ${o.crossesBoundary ? 'yes' : ''} |`);
  const actionRows = ontology.actions.map((a) =>
    `| ${actLink(a, 'root')} | \`${a.route.method} ${a.route.path}\` | ${a.actor} |`);
  const graph = ontology.links.map((l) => `  ${l.from} ${l.cardinality === 'many' ? '||--o{' : '}o--||'} ${l.to} : ${l.foreignKey}`);
  return HEADER + [
    '# Corner ontology', '',
    'Everything the app knows about, as three kinds of thing:', '',
    '- **Objects**: the nouns. Each is a Zod schema with a doc string on every field, stored in one table.',
    '- **Links**: typed relationships between objects, each backed by a foreign key.',
    '- **Actions**: the verbs. Every API route is exactly one action, and the route validates its input and output against the action\'s schemas.', '',
    'Source of truth: `frontend/src/ontology/`. One file per object in `objects/`, one per action in `actions/`, links in `links.ts`.',
    'Regenerate these pages with `npm run ontology:docs` (in `frontend/`). The test suite fails when they are stale.', '',
    '## Objects', '',
    '| Object | Table | Who can read | Crosses boundary |', '|---|---|---|---|', ...objectRows, '',
    '## Actions', '',
    '| Action | Route | Actor |', '|---|---|---|', ...actionRows, '',
    '## Links', '',
    '```mermaid', 'erDiagram', ...graph, '```', '',
  ].join('\n');
}

/** Relative path under docs/ontology → file contents. */
export function renderOntologyDocs(): Map<string, string> {
  const files = new Map<string, string>([['README.md', renderIndex()]]);
  for (const o of ontology.objects) files.set(`objects/${o.apiName}.md`, renderObject(o));
  for (const a of ontology.actions) files.set(`actions/${a.apiName}.md`, renderAction(a));
  return files;
}
