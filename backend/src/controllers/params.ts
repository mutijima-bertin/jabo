import type { Request } from "express";

/**
 * Express 5's types widen route params to `string | string[]`; every route in
 * this app matches a single non-repeated segment, so the value is always a
 * string at runtime. Mirrors the Array.isArray guard previously written inline
 * in routes/public.ts and routes/clients.ts.
 */
export function pathParam(req: Request, name: string): string {
  const value = (req.params as Record<string, string | string[]>)[name];
  return Array.isArray(value) ? value[0] : value;
}
