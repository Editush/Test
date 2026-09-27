// Relay: the browser sends image/prompt tasks here, the server adds the secret
// Runware key and forwards them. The key never reaches anyone's browser.
import { openStore, json, fail, safeEqual, readSettings, readUsage, activeKey, RUNWARE_URL, VERSION } from "../lib/shared.js";

const ALLOWED = new Set(["imageInference", "promptEnhance"]);
const MAX_TASKS = 12;

export default async (req) => {
  const store = openStore();
  const settings = await readSettings(store);
  const apiKey = activeKey(settings);
  const code = settings.teamCode || "";

  // GET: tells the page whether a team code is needed and whether a key is set.
  if (req.method === "GET") return json({ configured: !!apiKey, codeRequired: !!code, version: VERSION });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  if (code && !safeEqual(req.headers.get("x-team-code") || "", code))
    return fail("Wrong team access code. Ask your admin for the current code.", 401);
  if (!apiKey) return fail("The admin hasn't added a Runware API key yet. Open /admin to add it.", 503);

  let tasks;
  try { tasks = await req.json(); } catch { return fail("Invalid request", 400); }
  if (!Array.isArray(tasks) || !tasks.length || tasks.length > MAX_TASKS)
    return fail(`Send between 1 and ${MAX_TASKS} tasks per request.`, 400);
  if (tasks.some((t) => !t || typeof t !== "object" || !ALLOWED.has(t.taskType)))
    return fail("Only image generation and prompt tasks are allowed.", 400);
  const clean = tasks.map(({ apiKey: _ignored, ...t }) => t);

  let upstream;
  try {
    upstream = await fetch(RUNWARE_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([{ taskType: "authentication", apiKey }, ...clean]),
    });
  } catch {
    return fail("Couldn't reach Runware. Try again in a moment.", 502);
  }

  let data;
  try { data = await upstream.json(); } catch { return fail("Runware answered with HTTP " + upstream.status, 502); }
  // Drop the authentication result (with or without a taskType) before it reaches the browser.
  if (Array.isArray(data.data)) data.data = data.data.filter((d) => d && d.taskType !== "authentication" && !("connectionSessionUUID" in d));
  if (Array.isArray(data.errors)) data.errors = data.errors.map(({ apiKey: _k, ...e }) => e);

  // Usage totals for the admin page (best effort, never blocks the reply).
  try {
    const items = Array.isArray(data.data) ? data.data : [];
    const images = items.filter((d) => d.taskType === "imageInference" && (d.imageBase64Data || d.imageURL)).length;
    const prompts = items.filter((d) => d.taskType === "promptEnhance").length;
    const cost = items.reduce((s, d) => s + (typeof d.cost === "number" ? d.cost : 0), 0);
    if (images || prompts || cost) {
      const usage = await readUsage(store);
      usage.images += images; usage.prompts += prompts; usage.cost += cost;
      usage.last = new Date().toISOString();
      await store.setJSON("usage", usage);
    }
  } catch { /* ignore */ }

  return json(data, upstream.status);
};

export const config = { path: "/api/runware" };
