import { z } from 'zod';
import { defineObject } from '../define';
import { zUuid } from './_fields';

export const ConnectionPeerSchema = z.object({
  connection_id: zUuid,
  user_id: zUuid,
  display_name: z.string().describe('The one column of another person that a client may read.'),
}).describe("Your partner's name, and nothing else.");
export type ConnectionPeer = z.infer<typeof ConnectionPeerSchema>;

export const connectionPeer = defineObject({
  apiName: 'connectionPeer',
  title: 'Connection peer (view)',
  table: 'connection_peers',
  primaryKey: ['connection_id', 'user_id'],
  description: 'A definer view over members + profiles, filtered to connections the caller belongs to.',
  schema: ConnectionPeerSchema,
  visibility: 'members',
  crossesBoundary: true,
  invariants: ['Widening the SELECT list of this view is how you would turn it into a leak.'],
});
