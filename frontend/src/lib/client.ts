"use client";

/**
 * Client (customer) magic-link auth. Deliberately separate from the admin
 * token storage (css_admin_token in src/lib/admin.ts) so a client session
 * never collides with an admin session in the same browser.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "css_client_token";

export function getClientToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setClientToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}

export function clearClientToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/** Authenticated fetch for client endpoints. Throws "NOT_AUTHENTICATED" on 401 (stale/expired JWT). */
export async function clientFetch<T>(path: string, token: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let body: { error?: string } = {};
    try {
      body = await res.json();
    } catch {
      /* empty */
    }
    if (res.status === 401) throw new Error("NOT_AUTHENTICATED");
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export interface ClientProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

export interface ClientBooking {
  id: string;
  reference: string;
  serviceName: string;
  eventDate: string | null;
  location: string | null;
  budgetRange: string | null;
  status: string;
  createdAt: string;
}

export interface ClientAccount {
  client: ClientProfile;
  bookings: ClientBooking[];
}
