import { z } from "zod";

// Schema for /identify
export const IdentifyData = z.object({
  userId: z.string(),
  traits: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export type IdentifyDataType = z.infer<typeof IdentifyData>;

// Schema for /track
export const TrackData = z.object({
  userId: z.string(),
  event: z.string(),
  properties: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export type TrackDataType = z.infer<typeof TrackData>;

// Response schemas
export const BaseMessageResponse = z.object({
  message: z.string(),
});
export type BaseMessageResponseType = z.infer<typeof BaseMessageResponse>;