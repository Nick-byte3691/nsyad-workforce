// Supabase (server only). Env: SUPABASE_URL, SUPABASE_SERVICE_KEY (secret key).
export function dbReady() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}
function headers(extra) {
  const k = String(process.env.SUPABASE_SERVICE_KEY || '').trim();
  const h = { apikey: k, 'Content-Type': 'application/json', ...(extra || {}) };
  if (/^eyJ/.test(k)) h.Authorization = 'Bearer ' + k; // old-style JWT key; new sb_secret_ keys go in apikey only
  return h;
}
// Accepts the Project URL in any common form: https://abc.supabase.co, .../rest/v1/, or the dashboard link.
export function baseUrl() {
  const raw = String(process.env.SUPABASE_URL || '').trim().replace(/^["']|["']$/g, '');
  const dash = raw.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dash) return 'https://' + dash[1] + '.supabase.co';
  try { return new URL(raw.startsWith('http') ? raw : 'https://' + raw).origin; } catch { return raw.replace(/\/+$/, ''); }
}
// db('jobs?select=*', { method, body, prefer })
export async function db(path, opt = {}) {
  if (!dbReady()) throw new Error('Database is not set up yet (SUPABASE_URL / SUPABASE_SERVICE_KEY missing).');
  const url = baseUrl() + '/rest/v1/' + path;
  const r = await fetch(url, {
    method: opt.method || 'GET',
    headers: headers(opt.prefer ? { Prefer: opt.prefer } : null),
    body: opt.body === undefined ? undefined : JSON.stringify(opt.body),
    cache: 'no-store',
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) {
    console.error('DB error', r.status, path.split('?')[0], text.slice(0, 300));
    const e = new Error((data && data.message) || 'Database error (' + r.status + ')');
    e.status = r.status; e.code = data && data.code;
    throw e;
  }
  return data;
}
export const enc = encodeURIComponent;

