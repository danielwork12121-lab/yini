/**
 * Writes docs/ontology/ from src/ontology.
 *
 *   npm run ontology:docs          # write
 *   npm run ontology:docs -- --check   # exit 1 if the committed docs are stale
 */
import fs from 'node:fs';
import path from 'node:path';
import { renderOntologyDocs } from '../src/ontology/docs';

const outDir = path.resolve(import.meta.dirname, '../../docs/ontology');
const check = process.argv.includes('--check');
const files = renderOntologyDocs();

const existing = ['', 'objects', 'actions'].flatMap((d) => {
  const dir = path.join(outDir, d);
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => path.join(d, f)) : [];
});
const stale = existing.filter((f) => !files.has(f));
const changed = [...files].filter(([f, body]) => {
  const p = path.join(outDir, f);
  return !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== body;
}).map(([f]) => f);

if (check) {
  if (stale.length || changed.length) {
    console.error(`docs/ontology is stale. Run \`npm run ontology:docs\`.\n  changed: ${changed.join(', ') || '-'}\n  removed: ${stale.join(', ') || '-'}`);
    process.exit(1);
  }
  console.log(`docs/ontology is up to date (${files.size} pages).`);
} else {
  for (const f of stale) fs.rmSync(path.join(outDir, f));
  for (const [f, body] of files) {
    fs.mkdirSync(path.dirname(path.join(outDir, f)), { recursive: true });
    fs.writeFileSync(path.join(outDir, f), body);
  }
  console.log(`Wrote ${files.size} pages to docs/ontology (${changed.length} changed, ${stale.length} removed).`);
}
