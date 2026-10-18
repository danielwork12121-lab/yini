import { z } from 'zod';
import {
  ConnectionStatusResponseSchema, CreateConnectionRequestSchema, CreateConnectionResponseSchema,
  JoinRequestSchema, JoinResponseSchema,
} from '../../contract/api';
import { defineAction } from '../define';

export const getConnection = defineAction({
  apiName: 'getConnection',
  title: 'Get connection status',
  description: 'Am I paired, what is my invite code, and what is my partner called.',
  actor: 'user',
  route: { method: 'GET', path: '/api/connection' },
  input: z.object({}),
  inputFrom: 'none',
  output: ConnectionStatusResponseSchema,
  writes: [],
  reads: ['profile', 'connection', 'connectionMember', 'pet'],
});

export const createConnection = defineAction({
  apiName: 'createConnection',
  title: 'Create connection',
  description: 'Start a connection and get a 6-character code to hand to the other person. Idempotent: returns the existing code if you already have one.',
  actor: 'user',
  route: { method: 'POST', path: '/api/connection' },
  input: CreateConnectionRequestSchema,
  inputFrom: 'json',
  output: CreateConnectionResponseSchema,
  writes: ['connection', 'connectionMember', 'pet', 'profile'],
  reads: ['profile', 'connection'],
});

export const joinConnection = defineAction({
  apiName: 'joinConnection',
  title: 'Join connection',
  description: 'Join the other person\'s connection with their invite code.',
  actor: 'user',
  route: { method: 'POST', path: '/api/connection/join' },
  input: JoinRequestSchema,
  inputFrom: 'json',
  output: JoinResponseSchema,
  writes: ['connectionMember', 'profile'],
  reads: ['connection', 'connectionMember'],
  invariants: ['A full connection (two members) rejects a third with 409; the DB trigger enforces it under races too.'],
});
