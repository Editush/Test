// Shared helpers for the Craftush edge functions.
import { getStore } from "@netlify/blobs";

// Shown on the admin page so you can confirm which backend version is live.
export const VERSION = "3";

export const RUNWARE_URL = "https://api.runware.ai/v1";

// One private store holds the settings (Runware key, team code) and usage totals.
export const openStore = () => getStore({ name: "craftush", consistency: "strong" });

export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export const fail = (message, status) => json({ errors: [{ message }] }, status);

// Constant-time comparison so passwords/codes can't be guessed by timing.
export function safeEqual(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

export const env = (name) => {
  try { return Netlify.env.get(name) || ""; } catch { return ""; }
};

export async function readSettings(store) {
  return (await store.get("settings", { type: "json" })) || {};
}

export async function readUsage(store) {
  return (await store.get("usage", { type: "json" })) ||
    { images: 0, prompts: 0, cost: 0, since: new Date().toISOString() };
}

// The key saved in /admin wins; a RUNWARE_API_KEY environment variable is the fallback.
export const activeKey = (settings) => settings.runwareKey || env("RUNWARE_API_KEY");

// Checks a Runware key with an authentication-only request (free, generates nothing).
export async function checkKey(apiKey) {
  try {
    const res = await fetch(RUNWARE_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([{ taskType: "authentication", apiKey }]),
    });
    const data = await res.json().catch(() => ({}));
    // Runware reports a bad key as an error; a successful reply without errors means the key works.
    if (data.errors && data.errors.length) return { ok: false, message: data.errors[0].message || "Runware rejected the key" };
    if (data.error) return { ok: false, message: String(data.error.message || data.error) };
    return res.ok ? { ok: true } : { ok: false, message: "Runware returned HTTP " + res.status };
  } catch {
    return { ok: false, message: "Couldn't reach Runware from the server" };
  }
}
