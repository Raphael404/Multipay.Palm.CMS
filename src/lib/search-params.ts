import { z } from 'zod';

/** Optional URL search param that falls back to `undefined` when invalid. */
export const optionalParam = <T extends z.ZodType>(schema: T) =>
  schema.optional().catch(undefined);

/** Optional GUID param (entity / user ids). */
export const guidParam = optionalParam(z.guid());

/** Optional ISO date-time param; a malformed value is dropped instead of crashing date formatting. */
export const isoDateParam = optionalParam(z.iso.datetime());

/** Shared `page` + `search` params for list pages. */
export const listSearchParams = {
  page: optionalParam(z.number().int().min(1)),
  search: optionalParam(z.string()),
};
