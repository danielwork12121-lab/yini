import { DemoLoginRequestSchema, DemoLoginResponseSchema } from '../../contract/api';
import { defineAction } from '../define';

export const demoLogin = defineAction({
  apiName: 'demoLogin',
  title: 'Demo login',
  description: 'One tap into a seeded couple (Avery and Sam). Seeds idempotently, then signs in and sets the Supabase session cookie.',
  actor: 'public',
  route: { method: 'POST', path: '/api/demo/login' },
  input: DemoLoginRequestSchema,
  inputFrom: 'json',
  output: DemoLoginResponseSchema,
  writes: ['profile', 'connection', 'connectionMember', 'pet'],
  reads: ['profile', 'connection'],
  invariants: ['403 unless NEXT_PUBLIC_DEMO_MODE=true. Must be off anywhere real people have data.'],
});
