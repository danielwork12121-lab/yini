/** Shared field types. One definition of "a local day" for the whole ontology. */
import { z } from 'zod';

export const zUuid = z.string().uuid();
/** The author's LOCAL calendar day, `YYYY-MM-DD`. Never derive this from a UTC timestamp. */
export const zLocalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
export const zTimestamp = z.string();
export const zSeverity = z.number().int().min(0).max(3);
