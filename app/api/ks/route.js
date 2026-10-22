import { NextResponse } from 'next/server';
import { db, dbReady, enc } from '../../../lib/db';
import { getMe, normPhone, pinOk, hashPin } from '../../../lib/auth';
import { payFor, monthOf, daysInMonth, r2 } from '../../../lib/calc';
import { todayIn } from '../../../lib/world';
export const dynamic = 'force-dynamic';

// One door for the owner, supervisors and workers. Every query is limited to the person's own company,
// and a supervisor only sees the sites given to them. Workers only see their own record.
const fail = (error, status = 400) => NextResponse.json({ error }, { status });
const s = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const num = (v, max = 1e7) => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? Math.min(max, Math.round(x * 100) / 100) : 0; };
const dayOk = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
const monthOk = (m) => /^\d{4}-\d{2}$/.test(String(m || ''));
const uuid = (v) => (/^[0-9a-f-]{36}$/i.test(String(v || '')) ? String(v) : null);
const inList = (ids) => '(' + ids.map(enc).join(',') + ')';
const monthRange = (m) => ['gte.' + m + '-01', 'lte.' + m + '-' + String(daysInMonth(m)).padStart(2, '0')];

async function scope(me) {
  const cid = enc(me.company_id);
  const sites = await db('ks_sites?company_id=eq.' + cid + '&select=id,name,address,active&order=created_at');
  const mine = me.role === 'owner' ? sites : sites.filter((x) => (me.sites || []).includes(x.id));
  return { cid, sites, mine, ids: mine.map((x) => x.id) };
}
async function workersOf(me, sc, all) {
  if (!sc.ids.length && me.role !== 'owner') return [];
  const q = 'ks_workers?company_id=eq.' + sc.cid + (all ? '' : '&active=eq.true') + (me.role === 'owner' ? '' : '&site_id=in.' + inList(sc.ids)) + '&select=*&order=code';
  return db(q);
}
async function attOf(cid, from, to, workerIds) {
  if (workerIds && !workerIds.length) return [];
  return db('ks_attendance?company_id=eq.' + cid + '&day=gte.' + from + '&day=lte.' + to + (workerIds ? '&worker_id=in.' + inList(workerIds) : '') + '&select=worker_id,day,status,ot_hours,site_id&limit=100000');
}
async function moneyOf(cid, m, workerIds) {
  if (workerIds && !workerIds.length) return [];
  const [a, b] = monthRange(m);
  return db('ks_money?company_id=eq.' + cid + '&day=' + a + '&day=' + b + (workerIds ? '&worker_id=in.' + inList(workerIds) : '') + '&select=id,worker_id,day,kind,amount,note&order=day.desc&limit=20000');
}
const shiftDay = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

export async function GET(req) {
  if (!dbReady()) return fail('Not ready', 503);
  const me = await getMe(req).catch(() => null);
  if (!me) return fail('login', 401);
  const q = new URL(req.url).searchParams, view = q.get('view');
  const todayIST = () => todayIn(me.co.tz);
  const co = { name: me.co.name, currency: me.co.currency || 'INR', cc: me.co.cc || '91', country: me.co.country || 'IN' };
  try {
    if (me.role === 'worker' || view === 'me') {
      if (!me.worker_id) return fail('No worker record.', 404);
      const m = monthOk(q.get('month')) ? q.get('month') : monthOf(todayIST());
      const w = (await db('ks_workers?id=eq.' + enc(me.worker_id) + '&select=code,name,skill,daily_wage,ot_rate,site_id,company_id'))[0];
      const [a, b] = monthRange(m);
      const att = await db('ks_attendance?worker_id=eq.' + enc(me.worker_id) + '&day=' + a + '&day=' + b + '&select=day,status,ot_hours&order=day');
      const money = await db('ks_money?worker_id=eq.' + enc(me.worker_id) + '&day=' + a + '&day=' + b + '&select=day,kind,amount,note&order=day.desc');
      const site = w.site_id ? (await db('ks_sites?id=eq.' + enc(w.site_id) + '&select=name'))[0] : null;
      const c = (await db('ks_companies?id=eq.' + enc(w.company_id) + '&select=name'))[0];
      return NextResponse.json({ today: todayIST(), currency: co.currency, month: m, worker: { code: w.code, name: w.name, skill: w.skill, daily_wage: w.daily_wage, ot_rate: w.ot_rate, site: site && site.name, company: c && c.name }, att, money, pay: payFor(w, att, money) });
    }
    const sc = await scope(me);
    const base = { me: { name: me.name, role: me.role }, co, today: todayIST(), sites: sc.mine, allSites: me.role === 'owner' ? sc.sites : sc.mine };
    if (view === 'dash') {
      const today = todayIST(), from = shiftDay(today, -13), m = monthOf(today);
      const ws = await workersOf(me, sc);
      const ids = ws.map((w) => w.id);
      const att = await attOf(sc.cid, from < m + '-01' ? from : m + '-01', today, me.role === 'owner' ? null : ids);
      const money = await moneyOf(sc.cid, m, me.role === 'owner' ? null : ids);
      const monthAtt = att.filter((a) => a.day >= m + '-01');
      let wages = 0, ot = 0, adv = 0;
      for (const w of ws) { const p = payFor(w, monthAtt.filter((a) => a.worker_id === w.id), money.filter((x) => x.worker_id === w.id)); wages += p.earned; ot += p.ot; adv += p.adv; }
      const days = []; for (let i = 13; i >= 0; i--) { const d = shiftDay(today, -i); const da = att.filter((a) => a.day === d); days.push({ day: d, p: da.filter((a) => a.status === 'P').length, h: da.filter((a) => a.status === 'H').length, a: da.filter((a) => a.status === 'A').length }); }
      const tAtt = att.filter((a) => a.day === today);
      const perSite = sc.mine.map((st) => { const sw = ws.filter((w) => w.site_id === st.id); const sa = tAtt.filter((a) => sw.some((w) => w.id === a.worker_id)); return { id: st.id, name: st.name, workers: sw.length, p: sa.filter((a) => a.status === 'P').length, h: sa.filter((a) => a.status === 'H').length, a: sa.filter((a) => a.status === 'A').length, marked: sa.length }; });
      const noWage = ws.filter((w) => !(Number(w.daily_wage) > 0)).length;
      return NextResponse.json({ ...base, today, month: m, workers: ws.length, present: tAtt.filter((a) => a.status === 'P').length, half: tAtt.filter((a) => a.status === 'H').length, absent: tAtt.filter((a) => a.status === 'A').length, unmarked: ws.length - tAtt.length, wages: r2(wages), ot: r2(ot), adv: r2(adv), days, perSite, noWage });
    }
    if (view === 'att') {
      const day = dayOk(q.get('day')) ? q.get('day') : todayIST();
      const site = uuid(q.get('site')) || (sc.mine[0] && sc.mine[0].id);
      if (!site || !sc.mine.some((x) => x.id === site)) return NextResponse.json({ ...base, day, site: null, workers: [], att: [] });
      const ws = (await workersOf(me, sc)).filter((w) => w.site_id === site);
      const att = await attOf(sc.cid, day, day, ws.map((w) => w.id));
      return NextResponse.json({ ...base, day, site, workers: ws.map((w) => ({ id: w.id, code: w.code, name: w.name, skill: w.skill })), att });
    }
    if (view === 'workers') {
      const ws = await workersOf(me, sc, true);
      const logins = ws.length ? await db('ks_users?company_id=eq.' + sc.cid + '&role=eq.worker&select=worker_id,phone') : [];
      return NextResponse.json({ ...base, workers: ws.map((w) => ({ ...w, login: logins.some((l) => l.worker_id === w.id) })) });
    }
    if (view === 'pay') {
      const m = monthOk(q.get('month')) ? q.get('month') : monthOf(todayIST());
      const ws = await workersOf(me, sc, true);
      const ids = ws.map((w) => w.id);
      const [a, b] = monthRange(m);
      const att = await attOf(sc.cid, a.slice(4), b.slice(4), me.role === 'owner' ? null : ids);
      const money = await moneyOf(sc.cid, m, me.role === 'owner' ? null : ids);
      const rows = ws.map((w) => ({ id: w.id, code: w.code, name: w.name, site_id: w.site_id, daily_wage: w.daily_wage, ot_rate: w.ot_rate, active: w.active, ...payFor(w, att.filter((x) => x.worker_id === w.id), money.filter((x) => x.worker_id === w.id)) })).filter((r) => r.active || r.days > 0 || r.adv > 0 || r.paid > 0);
      return NextResponse.json({ ...base, month: m, rows, money });
    }
    if (view === 'team') {
      if (me.role !== 'owner') return fail('Only the owner can see this.', 403);
      const team = await db('ks_users?company_id=eq.' + sc.cid + '&role=neq.worker&select=id,role,name,phone,sites,active,created_at&order=created_at');
      return NextResponse.json({ ...base, team });
    }
    return NextResponse.json(base);
  } catch (e) { console.error('ks get', view, e && e.message); return fail('Could not load. Please try again.', 503); }
}

export async function POST(req) {
  if (!dbReady()) return fail('Not ready', 503);
  const me = await getMe(req).catch(() => null);
  if (!me) return fail('login', 401);
  if (me.role === 'worker') return fail('Not allowed.', 403);
  const b = await req.json().catch(() => ({}));
  const owner = me.role === 'owner';
  const todayIST = () => todayIn(me.co.tz);
  const cc = me.co.cc || '91';
  try {
    const sc = await scope(me);
    const myWorker = async (id) => { const w = (await db('ks_workers?id=eq.' + enc(uuid(id) || '00000000-0000-0000-0000-000000000000') + '&company_id=eq.' + sc.cid + '&select=*'))[0]; if (!w) return null; if (!owner && !sc.ids.includes(w.site_id)) return null; return w; };
    switch (b.action) {
      case 'site_add': {
        if (!owner) return fail('Only the owner can add sites.', 403);
        const name = s(b.name, 60); if (!name) return fail('Please write the site name.');
        if (sc.sites.length >= 50) return fail('Up to 50 sites.');
        await db('ks_sites', { method: 'POST', body: { company_id: me.company_id, name, address: s(b.address, 160) || null } });
        break;
      }
      case 'site_edit': {
        if (!owner) return fail('Only the owner can do this.', 403);
        const id = uuid(b.id); if (!id) return fail('Site?');
        await db('ks_sites?id=eq.' + id + '&company_id=eq.' + sc.cid, { method: 'PATCH', body: { name: s(b.name, 60) || undefined, address: s(b.address, 160) || null, active: b.active !== false } });
        break;
      }
      case 'worker_save': {
        const name = s(b.name, 60); if (!name) return fail('Please write the worker name.');
        const site = uuid(b.site_id);
        if (!site || !sc.mine.some((x) => x.id === site)) return fail('Please choose a site.');
        const row = { name, phone: normPhone(b.phone, cc) || null, skill: s(b.skill, 40) || null, site_id: site, joined: dayOk(b.joined) ? b.joined : null, active: b.active !== false };
        if (owner) { row.daily_wage = num(b.daily_wage, 100000); row.ot_rate = num(b.ot_rate, 10000); }
        if (b.id) {
          const w = await myWorker(b.id); if (!w) return fail('Worker not found.', 404);
          await db('ks_workers?id=eq.' + enc(w.id), { method: 'PATCH', body: row });
        } else {
          const n = await db('ks_workers?company_id=eq.' + sc.cid + '&select=code');
          if (n.length >= 5000) return fail('Up to 5,000 workers.');
          let next = n.reduce((mx, x) => Math.max(mx, parseInt(String(x.code).replace(/\D/g, ''), 10) || 0), 0) + 1;
          for (let i = 0; i < 3; i++) {
            try { await db('ks_workers', { method: 'POST', body: { company_id: me.company_id, code: 'W-' + String(next).padStart(3, '0'), ...row } }); break; }
            catch (e) { if (e.code === '23505' && i < 2) { next++; continue; } throw e; }
          }
        }
        break;
      }
      case 'worker_login': {
        const w = await myWorker(b.id); if (!w) return fail('Worker not found.', 404);
        const phone = normPhone(b.phone, cc); if (!phone) return fail('Please enter the worker’s correct mobile number.');
        if (!pinOk(b.pin, 4)) return fail('PIN must be 4 to 6 digits.');
        const ex = await db('ks_users?phone=eq.' + enc(phone) + '&select=id,worker_id');
        if (ex[0] && ex[0].worker_id !== w.id) return fail('This number is already used by another login.');
        if (ex[0]) await db('ks_users?id=eq.' + enc(ex[0].id), { method: 'PATCH', body: { pin_hash: hashPin(b.pin), active: true, name: w.name } });
        else await db('ks_users?worker_id=eq.' + enc(w.id), { method: 'DELETE' }).then(() => db('ks_users', { method: 'POST', body: { company_id: me.company_id, role: 'worker', name: w.name, phone, pin_hash: hashPin(b.pin), worker_id: w.id } }));
        await db('ks_workers?id=eq.' + enc(w.id), { method: 'PATCH', body: { phone } });
        break;
      }
      case 'att_save': {
        const day = dayOk(b.day) ? b.day : null; const site = uuid(b.site);
        if (!day || day > todayIST()) return fail('Please choose today or an earlier date.');
        if (!owner && day < shiftDay(todayIST(), -7)) return fail('Supervisors can change only the last 7 days. Ask the owner for older days.', 403);
        if (!site || !sc.mine.some((x) => x.id === site)) return fail('Site?');
        const ws = (await workersOf(me, sc)).filter((w) => w.site_id === site);
        const rows = (Array.isArray(b.rows) ? b.rows : []).filter((r) => ws.some((w) => w.id === r.worker_id));
        const put = rows.filter((r) => ['P', 'A', 'H'].includes(r.status)).map((r) => ({ worker_id: r.worker_id, day, company_id: me.company_id, site_id: site, status: r.status, ot_hours: r.status === 'A' ? 0 : num(r.ot_hours, 16), marked_by: me.id, marked_at: new Date().toISOString() }));
        const clear = rows.filter((r) => !r.status).map((r) => r.worker_id);
        if (put.length) await db('ks_attendance?on_conflict=worker_id,day', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: put });
        if (clear.length) await db('ks_attendance?day=eq.' + day + '&worker_id=in.' + inList(clear), { method: 'DELETE' });
        return NextResponse.json({ ok: true, saved: put.length });
      }
      case 'money_add': {
        const w = await myWorker(b.worker_id); if (!w) return fail('Worker not found.', 404);
        const kind = b.kind === 'payment' ? 'payment' : 'advance';
        if (kind === 'payment' && !owner) return fail('Only the owner can record wage payments.', 403);
        const amount = num(b.amount, 1000000); if (!(amount > 0)) return fail('Please write the amount.');
        await db('ks_money', { method: 'POST', body: { company_id: me.company_id, worker_id: w.id, day: dayOk(b.day) ? b.day : todayIST(), kind, amount, note: s(b.note, 120) || null, created_by: me.id } });
        break;
      }
      case 'money_del': {
        if (!owner) return fail('Only the owner can delete entries.', 403);
        await db('ks_money?id=eq.' + enc(uuid(b.id) || '') + '&company_id=eq.' + sc.cid, { method: 'DELETE' });
        break;
      }
      case 'team_add': {
        if (!owner) return fail('Only the owner can add supervisors.', 403);
        const name = s(b.name, 60), phone = normPhone(b.phone, cc);
        if (!name) return fail('Please write the name.');
        if (!phone) return fail('Please enter a correct mobile number.');
        if (!pinOk(b.pin, 4)) return fail('PIN must be 4 to 6 digits.');
        const ex = await db('ks_users?phone=eq.' + enc(phone) + '&select=id');
        if (ex[0]) return fail('This number already has a login.');
        const sites = (Array.isArray(b.sites) ? b.sites : []).map(uuid).filter((x) => x && sc.sites.some((y) => y.id === x));
        await db('ks_users', { method: 'POST', body: { company_id: me.company_id, role: 'supervisor', name, phone, pin_hash: hashPin(b.pin), sites } });
        break;
      }
      case 'team_edit': {
        if (!owner) return fail('Only the owner can do this.', 403);
        const id = uuid(b.id); if (!id || id === me.id) return fail('Not allowed.');
        const body = { active: b.active !== false };
        if (Array.isArray(b.sites)) body.sites = b.sites.map(uuid).filter((x) => x && sc.sites.some((y) => y.id === x));
        if (b.pin) { if (!pinOk(b.pin, 4)) return fail('PIN must be 4 to 6 digits.'); body.pin_hash = hashPin(b.pin); }
        await db('ks_users?id=eq.' + id + '&company_id=eq.' + sc.cid + '&role=eq.supervisor', { method: 'PATCH', body });
        break;
      }
      default: return fail('Unknown action.');
    }
    return NextResponse.json({ ok: true });
  } catch (e) { console.error('ks post', b.action, e && e.message); return fail('Could not save. Please try again.', 503); }
}
