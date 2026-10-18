import { z } from 'zod';
import { defineObject } from '../define';
import { zTimestamp, zUuid } from './_fields';

export const ConnectionMemberSchema = z.object({
  connection_id: zUuid,
  user_id: zUuid,
  joined_at: zTimestamp.describe('The earlier member is "side A" for the nightly run and decides its timezone.'),
}).describe('Membership of one person in one connection.');
export type ConnectionMember = z.infer<typeof ConnectionMemberSchema>;

export const connectionMember = defineObject({
  apiName: 'connectionMember',
  title: 'Connection member',
  table: 'connection_members',
  primaryKey: ['connection_id', 'user_id'],
  description: 'Join table between profiles and connections.',
  schema: ConnectionMemberSchema,
  visibility: 'members',
  crossesBoundary: false,
  invariants: ['At most two rows per connection, enforced by the connection_members_max_two trigger.'],
});
