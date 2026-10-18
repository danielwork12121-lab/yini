/**
 * Yini — the ontology primitives.
 *
 * The app is described as three kinds of thing, and nothing else:
 *
 *   ObjectType  a noun the product has: a journal entry, a nudge, the pet. Zod schema
 *               is the definition (the Pydantic role); every field carries its own doc.
 *   LinkType    a typed relationship between two object types, backed by a foreign key.
 *   ActionType  a verb: the only ways an object comes into being or changes. Every API
 *               route is an action, and the route validates against the action's schemas.
 *
 * Each object and action lives in its own file and renders to its own Markdown page
 * (`npm run ontology:docs`), so a feature can be read on its own without the rest.
 *
 * This file is pure: no I/O, no `server-only`, safe to import from tests and scripts.
 */
import type { z } from 'zod';

/**
 * Who may read rows of an object. This is a claim the RLS migration must honour;
 * `ontology.test.ts` checks the claim against the SQL so the two cannot drift.
 */
export type Visibility =
  | 'self'        // only the user the row is about (profiles)
  | 'author'      // only the person who wrote it
  | 'recipient'   // only the person it was written for
  | 'members'     // both people in the connection
  | 'server';     // no client role at all; service role only

export interface ObjectType<S extends z.ZodObject = z.ZodObject> {
  kind: 'object';
  /** camelCase identifier used in links, actions and docs. */
  apiName: string;
  /** Human title for docs. */
  title: string;
  /** Postgres table (or view) that stores it. Null for derived, never-stored objects. */
  table: string | null;
  primaryKey: readonly string[];
  description: string;
  schema: S;
  visibility: Visibility;
  /** True when content derived from one person can reach the other through this object. */
  crossesBoundary: boolean;
  /** Fields that must never leave the server, even to the row's own reader. */
  serverOnlyFields?: readonly string[];
  /** Plain-language invariants a reviewer should check. Rendered into the doc. */
  invariants?: readonly string[];
}

export type Cardinality = 'one' | 'many';

export interface LinkType {
  kind: 'link';
  apiName: string;
  from: string;       // ObjectType.apiName
  to: string;         // ObjectType.apiName
  /** How many `to` objects one `from` object has. */
  cardinality: Cardinality;
  /** Column on the `from` table (cardinality one) or the `to` table (cardinality many). */
  foreignKey: string;
  description: string;
}

/**
 * Who may invoke an action. The route wrapper enforces this before the handler runs.
 *   user    a signed-in Supabase session (cookie)
 *   public  anyone; the action gates itself (demo login)
 *   admin   `x-admin-token: $ADMIN_TOKEN`
 *   cron    `authorization: Bearer $CRON_SECRET` (what Vercel Cron sends)
 */
export type Actor = 'user' | 'public' | 'admin' | 'cron';

export interface ActionType<
  I extends z.ZodType = z.ZodType,
  O extends z.ZodType = z.ZodType,
  Act extends Actor = Actor,
> {
  kind: 'action';
  apiName: string;
  title: string;
  description: string;
  actor: Act;
  /** HTTP binding. Every action has exactly one. */
  route: { method: 'GET' | 'POST' | 'PATCH'; path: string };
  /** `json` body, `query` string, or `multipart` (handler reads the form itself). */
  input: I;
  inputFrom: 'json' | 'query' | 'multipart' | 'none';
  output: O;
  /** Object types this action creates or changes. */
  writes: readonly string[];
  /** Object types this action reads. */
  reads: readonly string[];
  /** Does a model see anything during this action? Which data, and why it is allowed. */
  modelAccess?: string;
  invariants?: readonly string[];
}

export function defineObject<S extends z.ZodObject>(o: Omit<ObjectType<S>, 'kind'>): ObjectType<S> {
  return { kind: 'object', ...o };
}

export function defineLink(l: Omit<LinkType, 'kind'>): LinkType {
  return { kind: 'link', ...l };
}

export function defineAction<I extends z.ZodType, O extends z.ZodType, const Act extends Actor>(
  a: Omit<ActionType<I, O, Act>, 'kind'>,
): ActionType<I, O, Act> {
  return { kind: 'action', ...a };
}
