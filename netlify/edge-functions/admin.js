// Admin API for craftush.netlify.app/admin. Every request must carry the admin
// password, which lives only in the ADMIN_PASSWORD environment variable on Netlify.
import { openStore, json, fail, safeEqual, env, readSettings, readUsage, activeKey, checkKey, VERSION } from "../lib/shared.js";

const view = (settings, usage) => {
  const key = activeKey(settings);
  return {
    key: {
      set: !!key,
      last4: key ? key.slice(-4) : "",
      source: settings.runwareKey ? "admin" : key ? "environment" : "none",
      updated: settings.keyUpdated || null,
    },
    teamCode: settings.teamCode || "",
    usage,
    version: VERSION,
  };
};

export default async (req) => {
  if (req.method !== "POST") return fail("Method not allowed", 405);
  const password = env("ADMIN_PASSWORD");
  if (!password)
    return fail("ADMIN_PASSWORD isn't set yet. In Netlify, add it under Project configuration → Environment variables, then redeploy.", 500);
  if (!safeEqual(req.headers.get("x-admin-password") || "", password)) {
    await new Promise((r) => setTimeout(r, 900)); // slows down password guessing
    return fail("Wrong password", 401);
  }

  const body = await req.json().catch(() => ({}));
  const store = openStore();
  const settings = await readSettings(store);
  let usage = await readUsage(store);

  switch (body.action) {
    case "get":
      return json(view(settings, usage));

    case "saveKey": {
      const key = String(body.key || "").trim();
      if (!key) return fail("Paste a Runware key first.", 400);
      const check = await checkKey(key);
      if (!check.ok) return fail("Runware didn't accept that key: " + check.message, 400);
      settings.runwareKey = key;
      settings.keyUpdated = new Date().toISOString();
      await store.setJSON("settings", settings);
      return json(view(settings, usage));
    }

    case "removeKey":
      delete settings.runwareKey;
      delete settings.keyUpdated;
      await store.setJSON("settings", settings);
      return json(view(settings, usage));

    case "testKey": {
      const key = activeKey(settings);
      if (!key) return fail("No key saved yet.", 400);
      const check = await checkKey(key);
      return check.ok ? json({ ok: true }) : fail(check.message, 400);
    }

    case "saveCode":
      settings.teamCode = String(body.code || "").trim().slice(0, 64);
      await store.setJSON("settings", settings);
      return json(view(settings, usage));

    case "resetUsage":
      usage = { images: 0, prompts: 0, cost: 0, since: new Date().toISOString() };
      await store.setJSON("usage", usage);
      return json(view(settings, usage));

    default:
      return fail("Unknown action", 400);
  }
};

export const config = { path: "/api/admin" };
