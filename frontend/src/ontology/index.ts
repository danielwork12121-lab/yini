/**
 * Yini — the ontology registry.
 *
 *   import { ontology, actions } from '@/ontology';
 *
 * Objects, links and actions, collected in one place so docs, tests and the route
 * wrapper all read the same definitions.
 */
import * as objectModule from './objects';
import * as actionModule from './actions';
import { links } from './links';
import type { ActionType, LinkType, ObjectType } from './define';

const isObject = (v: unknown): v is ObjectType => (v as ObjectType)?.kind === 'object';
const isAction = (v: unknown): v is ActionType => (v as ActionType)?.kind === 'action';

// Sorted, because module-namespace key order differs between bundlers and runtimes.
const byName = (a: { apiName: string }, b: { apiName: string }) => a.apiName.localeCompare(b.apiName);
export const objects: readonly ObjectType[] = (Object.values(objectModule) as unknown[]).filter(isObject).sort(byName);
export const actions: readonly ActionType[] = (Object.values(actionModule) as unknown[]).filter(isAction).sort(byName);

export const ontology = {
  objects,
  links: links as readonly LinkType[],
  actions,
  object: (apiName: string) => objects.find((o) => o.apiName === apiName),
  action: (apiName: string) => actions.find((a) => a.apiName === apiName),
};

export * from './define';
export * as objectTypes from './objects';
export * as actionTypes from './actions';
