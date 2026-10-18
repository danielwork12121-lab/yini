import { z } from 'zod';
import { ANALYSIS_STATUSES } from '../../contract/enums';
import { defineObject } from '../define';
import { zLocalDate, zTimestamp, zUuid } from './_fields';

export const AnalysisRunSchema = z.object({
  id: zUuid,
  connection_id: zUuid,
  local_date: zLocalDate.describe("The day analysed, in side A's timezone."),
  status: z.enum(ANALYSIS_STATUSES).describe('running → done | skipped | failed. A done run is never repeated unless forced.'),
  model: z.string().nullable().describe('Provider and model that wrote it, e.g. gemini:gemini-2.5-flash.'),
  pair_summary: z.string().max(1200).nullable().describe('2-3 sentence relationship summary. The rolling memory: each night reads the last one and writes the next, so context carries forward without growing.'),
  tool_calls: z.number().int().nonnegative().default(0).describe('How many database tools the agent called. For the demo panel and cost tracking.'),
  error: z.string().max(1000).nullable(),
  started_at: zTimestamp,
  finished_at: zTimestamp.nullable(),
}).describe('One nightly agent run for one connection and one day.');
export type AnalysisRun = z.infer<typeof AnalysisRunSchema>;

export const analysisRun = defineObject({
  apiName: 'analysisRun',
  title: 'Analysis run',
  table: 'analysis_runs',
  primaryKey: ['id'],
  description: 'The nightly agent\'s bookkeeping and the pair-level memory chain.',
  schema: AnalysisRunSchema,
  visibility: 'server',
  crossesBoundary: false,
  serverOnlyFields: ['pair_summary'],
  invariants: [
    'UNIQUE(connection_id, local_date): the run is idempotent per pair per day.',
    'pair_summary describes both people, so no client role may read it. Ungranted.',
  ],
});
