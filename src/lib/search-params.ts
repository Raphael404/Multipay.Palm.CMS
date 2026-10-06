import { z } from 'zod';

/** Optional URL search param that falls back to `undefined` when invalid. */
export const optionalParam = <T extends z.ZodType>(schema: T) =>
  schema.optional().catch(undefined);

/** Shared `page` + `search` params for list pages. */
export const listSearchParams = {
  page: optionalParam(z.number().int().min(1)),
  search: optionalParam(z.string()),
};
