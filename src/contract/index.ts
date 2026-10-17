/**
 * Corner — the data contract.
 *
 *   import { CheckinResponseSchema, type PetState, decideDelivery } from '@/contract';
 *
 * Both halves of the team import from here and nowhere else. If a shape needs to
 * change, it changes in this folder and the other half of the app stops compiling —
 * which is the entire point.
 */
export * from './enums';
export * from './models';
export * from './ai';
export * from './api';
export * from './policy';
