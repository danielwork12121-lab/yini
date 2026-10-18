import { actionTypes } from '@/ontology';
import { actionRoute } from '@/lib/http/action-route';
import { getDayOffset } from '@/lib/clock';

export const dynamic = 'force-dynamic';

export const GET = actionRoute(actionTypes.getClock, async () => ({ day_offset: await getDayOffset() }));
