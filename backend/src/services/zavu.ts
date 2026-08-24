import { env } from "../config/env";

const ZAVU_API_BASE = "https://api.zavu.dev/v1";

interface ZavuMessageResult {
  id?: string;
  status?: string;
}

export async function sendWhatsApp(opts: { to: string; text: string }): Promise<{ sent: boolean; error?: string }> {
  if (!env.zavuApiKey) {
    return { sent: false, error: "Zavu API key not configured" };
  }
  if (!/^\+[1-9]\d{7,14}$/.test(opts.to)) {
    return { sent: false, error: "Phone must be E.164 format (e.g. +2507xxxxxxxx)" };
  }
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${env.zavuApiKey}`,
      "Content-Type": "application/json",
    };
    if (env.zavuSender) {
      headers["Zavu-Sender"] = env.zavuSender;
    }
    const res = await fetch(`${ZAVU_API_BASE}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        to: opts.to,
        text: opts.text,
        channel: "whatsapp",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { sent: false, error: `Zavu API ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = (await res.json()) as ZavuMessageResult;
    return { sent: true, error: undefined };
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }
}
