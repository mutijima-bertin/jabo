import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function requiredWithGuard(name: string, forbiddenValues: string[] = []): string {
  const value = required(name);
  if (forbiddenValues.includes(value)) {
    throw new Error(`Environment variable ${name} is set to a known-insecure value; refusing to start.`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  zavuApiKey: process.env.ZAVU_API_KEY ?? "",
  zavuSender: process.env.ZAVU_SENDER ?? "",
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
  },
  mailFrom: process.env.MAIL_FROM ?? "Creative Sound Studio",
  adminEmails: (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean),
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  apiUrl: process.env.API_URL ?? "http://localhost:4000",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  magicLinkTtlHours: Number(process.env.MAGIC_LINK_TTL_HOURS ?? 168),
  jwtSecret: requiredWithGuard("JWT_SECRET", ["change-me-in-production"]),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  adminEmail: process.env.ADMIN_EMAIL ?? "",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
};
