import { z } from 'zod';

export const AnalyticsEventSchema = z.object({
  eventId: z.string().uuid(),
  metricName: z.string().min(1).max(255),
  value: z.number(),
  timestamp: z.string().datetime(),
});

export const AnalyticsEventBatchSchema = z.array(AnalyticsEventSchema).max(500);

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
export type AnalyticsEventBatch = z.infer<typeof AnalyticsEventBatchSchema>;
