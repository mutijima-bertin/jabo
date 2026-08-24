import { api, type PostFull, type PostSummary, type Service, type PortfolioItem, type SiteSetting } from "./api";

export type SettingsMap = Map<string, string>;

export async function fetchPublic(path: string) {
  return api.get<unknown>(path);
}

export async function fetchSettings(): Promise<SettingsMap> {
  try {
    const items = await api.get<SiteSetting[]>("/public/settings");
    return new Map(items.map((s) => [`${s.key}/${s.locale}`, s.value]));
  } catch {
    return new Map();
  }
}

export async function fetchServices(): Promise<Service[]> {
  try {
    return await api.get<Service[]>("/public/services");
  } catch {
    return [];
  }
}

export async function fetchPortfolio(): Promise<PortfolioItem[]> {
  try {
    return await api.get<PortfolioItem[]>("/public/portfolio");
  } catch {
    return [];
  }
}

export async function fetchPosts(): Promise<PostSummary[]> {
  try {
    return await api.get<PostSummary[]>("/public/posts");
  } catch {
    return [];
  }
}

export async function fetchPost(slug: string): Promise<PostFull | null> {
  try {
    return await api.get<PostFull>(`/public/posts/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

export function s(settings: SettingsMap, key: string, locale: "en" | "rw"): string {
  return settings.get(`${key}/${locale}`) ?? settings.get(`${key}/en`) ?? "";
}
