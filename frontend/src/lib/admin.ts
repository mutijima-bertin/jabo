"use client";

import { useEffect, useState } from "react";
import type { Booking, DashboardStats } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "css_admin_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function useAdminAuth() {
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTokenState(getToken());
    setReady(true);
  }, []);

  const set = (t: string | null) => {
    if (t) setToken(t);
    else clearToken();
    setTokenState(t);
  };

  return { token, ready, setToken: set };
}

export async function adminFetch<T>(path: string, token: string, opts: RequestInit = {}): Promise<T> {
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

export const adminApi = {
  get: <T>(p: string, token: string) => adminFetch<T>(p, token),
  post: <T>(p: string, token: string, body: unknown) => adminFetch<T>(p, token, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(p: string, token: string, body: unknown) => adminFetch<T>(p, token, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(p: string, token: string, body: unknown) => adminFetch<T>(p, token, { method: "PUT", body: JSON.stringify(body) }),
  del: <T>(p: string, token: string) => adminFetch<T>(p, token, { method: "DELETE" }),
};

export function useDashboard(token: string | null) {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    adminApi
      .get<DashboardStats>("/admin/dashboard", token)
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, [token]);

  return { data, error };
}

export function useBookings(token: string | null) {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    if (!token) return;
    try {
      setBookings(await adminApi.get<Booking[]>("/admin/bookings", token));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  return { bookings, error, reload: load };
}
