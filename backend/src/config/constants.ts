/**
 * App-wide constants. Values must match what routes/services used inline before
 * the layered restructure — changing them changes API behavior.
 */

/** Default HTTP port (overridable via PORT env — see config/env.ts). */
export const DEFAULT_PORT = 4000;

/** Admin JWT lifetime (was inline in lib/auth.ts). */
export const ADMIN_JWT_EXPIRES_IN = "12h";

/** Client portal JWT lifetime (was inline in lib/auth.ts). */
export const CLIENT_JWT_EXPIRES_IN = "7d";
