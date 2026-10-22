import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db, dbReady, enc } from '../../../lib/db';
import { getMe, normPhone } from '../../../lib/auth';
import { todayIn } from '../../../lib/world';
export const dynamic = 'force-dynamic';

// Step 2: stock / warehouse, gate pass, machines, and "your data" (download everything, delete for ever).
// Every query is limited to the person's own company; supervisors work only on their own sites.
const fail = (error, status = 400, code) => NextResponse.json({ error, code }, { status });
const s = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const num = (v, max = 1e9, min = 0) => { const x = Number(String(v == null ? '' : v).replace(/,/g, '')); return Number.isFinite(x) ? Math.max(min, Math.min(max, Math.round(x * 1000) / 1000)) : 0; };
const dayOk = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
const uuid = (v) => (/^[0-9a-f-]{36}$/i.test(String(v || '')) ? String(v) : null);
const inList = (ids) => '(' + ids.map(enc).join(',') + ')';
const UNITS = ['pcs', 'kg', 'g', 'ton', 'ltr', 'ml', 'm', 'ft', 'sqm', 'bag', 'box', 'roll', 'set', 'pair', 'drum', 'bundle', 'sheet', 'nos'];
const KINDS = ['out_ret', 'out', 'in', 'vehicle', 'visitor'];

async function scope(me) {
  const cid = enc(me.company_id);
  const sites = await db('ks_sites?company_id=eq.' + cid + '&select=id,name&order=created_at');
  const mine = me.role === 'owner' ? sites : sites.filter((x) => (me.sites || []).includes(x.id));
  return { cid, sites, mine, ids: mine.map((x) => x.id), owner: me.role === 'owner' };
}
// Stock = everything that came in − everything that went out ± corrections, per item and site.
function stockOf(moves) {
  const m = {};
  for (const x of moves) { const k = x.item_id + '|' + (x.site_id || ''); const q = Number(x.qty) || 0; m[k] = (m[k] || 0) + (x.kind === 'out' ? -q : q); }
  return m;
}
async function nextNo(table, cid, field) {
  const r = await db(table + '?company_id=eq.' + cid + '&select=' + field + '&order=' + field + '.desc&limit=1');
  return r && r[0] ? r[0][field] : null;
}
const codeNext = (last, pre) => pre + '-' + String((parseInt(String(last || '').replace(/\D/g, ''), 10) || 0) + 1).padStart(3, '0');

export async function GET(req) {
  if (!dbReady()) return fail('Not ready', 503);
  const me = await getMe(req).catch(() => null);
  if (!me) return fail('login', 401);
  if (me.role === 'worker') return fail('Not allowed.', 403);
  const q = new URL(req.url).searchParams, view = q.get('view');
  try {
    const sc = await scope(me);
    const base = { sites: sc.mine, today: todayIn(me.co.tz), currency: me.co.currency || 'INR', owner: sc.owner };
    if (view === 'stock') {
      const items = await db('ks_items?company_id=eq.' + sc.cid + '&select=*&order=code&limit=20000');
      const moves = await db('ks_moves?company_id=eq.' + sc.cid + (sc.owner ? '' : '&site_id=in.' + inList(sc.ids.length ? sc.ids : ['00000000-0000-0000-0000-000000000000'])) + '&select=item_id,site_id,kind,qty&limit=200000');
      const st = stockOf(moves);
      const site = q.get('site');
      const rows = items.map((it) => {
        const per = sc.mine.map((x) => ({ site: x.id, qty: Math.round((st[it.id + '|' + x.id] || 0) * 1000) / 1000 }));
        const qty = site ? (per.find((p) => p.site === site) || { qty: 0 }).qty : per.reduce((a, p) => a + p.qty, 0);
        return { ...it, qty: Math.round(qty * 1000) / 1000, per, low: it.active && Number(it.min_qty) > 0 && qty <= Number(it.min_qty) };
      });
      const recent = await db('ks_moves?company_id=eq.' + sc.cid + (sc.owner ? '' : '&site_id=in.' + inList(sc.ids.length ? sc.ids : ['00000000-0000-0000-0000-000000000000'])) + '&select=id,item_id,site_id,kind,qty,day,party,ref,note,created_at&order=created_at.desc&limit=150');
      return NextResponse.json({ ...base, items: rows, recent, units: UNITS });
    }
    if (view === 'passes') {
      const r = await db('ks_passes?company_id=eq.' + sc.cid + (sc.owner ? '' : '&site_id=in.' + inList(sc.ids.length ? sc.ids : ['00000000-0000-0000-0000-000000000000'])) + '&select=*&order=no.desc&limit=300');
      const items = await db('ks_items?company_id=eq.' + sc.cid + '&active=eq.true&select=id,code,name,unit&order=name&limit=20000');
      return NextResponse.json({ ...base, passes: r, items });
    }
    if (view === 'machines') {
      const ms = await db('ks_machines?company_id=eq.' + sc.cid + (sc.owner ? '' : '&site_id=in.' + inList(sc.ids.length ? sc.ids : ['00000000-0000-0000-0000-000000000000'])) + '&select=*&order=code');
      const logs = ms.length ? await db('ks_mlogs?company_id=eq.' + sc.cid + '&machine_id=in.' + inList(ms.map((m) => m.id)) + '&select=*&order=day.desc,created_at.desc&limit=500') : [];
      const today = base.today;
      const rows = ms.map((m) => { let due = null; if (m.every_days > 0) { const t = new Date((m.last_service || m.created_at.slice(0, 10)) + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + m.every_days); due = t.toISOString().slice(0, 10); } return { ...m, due, overdue: !!(due && due <= today) }; });
      return NextResponse.json({ ...base, machines: rows, logs });
    }
    if (view === 'summary') {
      const [items, moves, passes, ms] = await Promise.all([
        db('ks_items?company_id=eq.' + sc.cid + '&active=eq.true&select=id,min_qty&limit=20000'),
        db('ks_moves?company_id=eq.' + sc.cid + (sc.owner ? '' : '&site_id=in.' + inList(sc.ids.length ? sc.ids : ['00000000-0000-0000-0000-000000000000'])) + '&select=item_id,site_id,kind,qty&limit=200000'),
        db('ks_passes?company_id=eq.' + sc.cid + '&status=in.(open,out)&select=kind,status,expected&limit=2000'),
        db('ks_machines?company_id=eq.' + sc.cid + '&active=eq.true&select=status,every_days,last_service,created_at&limit=5000'),
      ]);
      const st = stockOf(moves); const tot = {}; for (const [k, v] of Object.entries(st)) { const id = k.split('|')[0]; tot[id] = (tot[id] || 0) + v; }
      const low = items.filter((it) => Number(it.min_qty) > 0 && (tot[it.id] || 0) <= Number(it.min_qty)).length;
      const today = base.today;
      const due = ms.filter((m) => { if (!(m.every_days > 0)) return false; const t = new Date((m.last_service || m.created_at.slice(0, 10)) + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + m.every_days); return t.toISOString().slice(0, 10) <= today; }).length;
      return NextResponse.json({ items: items.length, low, passesOpen: passes.length, notBack: passes.filter((p) => p.kind === 'out_ret' && p.status === 'out' && p.expected && p.expected < today).length, machines: ms.length, down: ms.filter((m) => m.status === 'down').length, due });
    }
    if (view === 'export') {
      if (!sc.owner) return fail('Only the owner can download all data.', 403);
      const t = ['ks_sites', 'ks_workers', 'ks_attendance', 'ks_money', 'ks_items', 'ks_moves', 'ks_passes', 'ks_machines', 'ks_mlogs'];
      const out = { company: me.co, exported_at: new Date().toISOString() };
      for (const x of t) out[x.replace('ks_', '')] = await db(x + '?company_id=eq.' + sc.cid + '&select=*&limit=200000');
      out.team = await db('ks_users?company_id=eq.' + sc.cid + '&select=role,name,phone,active,created_at');
      return new Response(JSON.stringify(out, null, 1), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="nsyad-all-data-' + base.today + '.json"' } });
    }
    return NextResponse.json(base);
  } catch (e) { console.error('ops get', view, e && e.message); return fail('Could not load. Please try again.', 503); }
}

export async function POST(req) {
  if (!dbReady()) return fail('Not ready', 503);
  const me = await getMe(req).catch(() => null);
  if (!me) return fail('login', 401);
  if (me.role === 'worker') return fail('Not allowed.', 403);
  const b = await req.json().catch(() => ({}));
  const today = todayIn(me.co.tz);
  try {
    const sc = await scope(me);
    const mySite = (id) => (uuid(id) && sc.mine.some((x) => x.id === id) ? id : null);
    const item = async (id) => (await db('ks_items?id=eq.' + enc(uuid(id) || '00000000-0000-0000-0000-000000000000') + '&company_id=eq.' + sc.cid + '&select=*'))[0];
    const addMove = (row) => db('ks_moves', { method: 'POST', prefer: 'return=minimal', body: { company_id: me.company_id, by_user: me.id, day: today, ...row } });
    const stockAt = async (itemId, site) => { const r = await db('ks_moves?item_id=eq.' + enc(itemId) + '&site_id=eq.' + enc(site) + '&select=kind,qty&limit=100000'); return r.reduce((a, x) => a + (x.kind === 'out' ? -x.qty : Number(x.qty)), 0); };
    switch (b.action) {
      // ---------- Stock ----------
      case 'item_save': {
        const name = s(b.name, 80); if (!name) return fail('Please write the item name.');
        const row = { name, unit: UNITS.includes(b.unit) ? b.unit : s(b.unit, 12) || 'pcs', category: s(b.category, 40) || null, location: s(b.location, 40) || null, barcode: s(b.barcode, 60) || null, min_qty: num(b.min_qty), rate: num(b.rate), active: b.active !== false };
        if (b.id) { const it = await item(b.id); if (!it) return fail('Item not found.', 404); await db('ks_items?id=eq.' + enc(it.id), { method: 'PATCH', body: row }); return NextResponse.json({ ok: true, id: it.id }); }
        const n = await db('ks_items?company_id=eq.' + sc.cid + '&select=id&limit=20001'); if (n.length >= 20000) return fail('Up to 20,000 items.');
        let code = s(b.code, 30).toUpperCase() || codeNext(await nextNo('ks_items', sc.cid, 'code'), 'I');
        const r = await db('ks_items', { method: 'POST', prefer: 'return=representation', body: { company_id: me.company_id, code, ...row } }).catch((e) => { if (e.code === '23505') return null; throw e; });
        if (!r) return fail('This item code is already used.', 409);
        const site = mySite(b.site_id), q = num(b.opening);
        if (site && q > 0) await addMove({ item_id: r[0].id, site_id: site, kind: 'in', qty: q, ref: 'Opening stock' });
        return NextResponse.json({ ok: true, id: r[0].id });
      }
      case 'item_import': {
        // Rows pasted from Excel / Google Sheets: new items are created, existing ones (same code or name) updated; quantity = stock in.
        const site = mySite(b.site_id); if (!site) return fail('Please choose a site / warehouse.');
        const rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, 2000);
        if (!rows.length) return fail('Nothing to import.');
        const items = await db('ks_items?company_id=eq.' + sc.cid + '&select=id,code,name&limit=20000');
        let last = await nextNo('ks_items', sc.cid, 'code'); let made = 0, upd = 0, moved = 0;
        for (const x of rows) {
          const name = s(x.name, 80); if (!name) continue;
          const code = s(x.code, 30).toUpperCase();
          let it = items.find((i) => (code && i.code === code) || i.name.toLowerCase() === name.toLowerCase());
          const row = { name, unit: s(x.unit, 12) || 'pcs', ...(x.category ? { category: s(x.category, 40) } : {}), ...(x.location ? { location: s(x.location, 40) } : {}), ...(x.min_qty !== undefined && x.min_qty !== '' ? { min_qty: num(x.min_qty) } : {}), ...(x.rate !== undefined && x.rate !== '' ? { rate: num(x.rate) } : {}), ...(x.barcode ? { barcode: s(x.barcode, 60) } : {}) };
          if (it) { await db('ks_items?id=eq.' + enc(it.id), { method: 'PATCH', body: row }); upd++; }
          else { const c = code || (last = codeNext(last, 'I')); const r = await db('ks_items', { method: 'POST', prefer: 'return=representation', body: { company_id: me.company_id, code: c, ...row } }); it = r[0]; items.push(it); made++; }
          const q = num(x.qty); if (q > 0) { await addMove({ item_id: it.id, site_id: site, kind: 'in', qty: q, ref: s(b.ref, 60) || 'Excel import' }); moved++; }
        }
        return NextResponse.json({ ok: true, made, upd, moved });
      }
      case 'move_add': {
        const it = await item(b.item_id); if (!it) return fail('Item not found.', 404);
        const site = mySite(b.site_id); if (!site) return fail('Please choose a site / warehouse.');
        const kind = ['in', 'out', 'adjust'].includes(b.kind) ? b.kind : 'in';
        const qty = kind === 'adjust' ? num(b.qty, 1e9, -1e9) : num(b.qty); if (!qty) return fail('Please write the quantity.');
        if (kind === 'out' && !b.force) { const have = await stockAt(it.id, site); if (qty > have) return fail('Only ' + have + ' ' + it.unit + ' in stock here.', 409, 'notEnough'); }
        await addMove({ item_id: it.id, site_id: site, kind, qty, day: dayOk(b.day) && b.day <= today ? b.day : today, party: s(b.party, 80) || null, ref: s(b.ref, 60) || null, note: s(b.note, 200) || null });
        return NextResponse.json({ ok: true });
      }
      case 'transfer': {
        const it = await item(b.item_id); if (!it) return fail('Item not found.', 404);
        const from = mySite(b.from), to = uuid(b.to) && sc.sites.some((x) => x.id === b.to) ? b.to : null;
        if (!from || !to || from === to) return fail('Please choose two different sites.');
        const qty = num(b.qty); if (!qty) return fail('Please write the quantity.');
        const have = await stockAt(it.id, from); if (qty > have) return fail('Only ' + have + ' ' + it.unit + ' in stock here.', 409, 'notEnough');
        const ref = 'TR-' + Date.now().toString(36).toUpperCase();
        await addMove({ item_id: it.id, site_id: from, kind: 'out', qty, ref, note: 'Transfer to ' + (sc.sites.find((x) => x.id === to) || {}).name });
        await addMove({ item_id: it.id, site_id: to, kind: 'in', qty, ref, note: 'Transfer from ' + (sc.sites.find((x) => x.id === from) || {}).name });
        return NextResponse.json({ ok: true });
      }
      case 'move_del': {
        if (!sc.owner) return fail('Only the owner can delete entries.', 403);
        await db('ks_moves?id=eq.' + enc(uuid(b.id) || '') + '&company_id=eq.' + sc.cid, { method: 'DELETE' });
        return NextResponse.json({ ok: true });
      }
      // ---------- Gate pass ----------
      case 'pass_save': {
        const kind = KINDS.includes(b.kind) ? b.kind : 'out';
        const site = mySite(b.site_id); if (!site) return fail('Please choose a site / gate.');
        const party = s(b.party, 80); if (!party) return fail('Please write the person or company name.');
        const lines = (Array.isArray(b.lines) ? b.lines : []).slice(0, 50).map((l) => ({ item_id: uuid(l.item_id), name: s(l.name, 80), qty: num(l.qty), unit: s(l.unit, 12) })).filter((l) => l.name && l.qty > 0);
        if (['out_ret', 'out', 'in'].includes(kind) && !lines.length) return fail('Please add at least one item.');
        const row = { company_id: me.company_id, site_id: site, kind, party, phone: b.phone ? normPhone(b.phone, me.co.cc) || s(b.phone, 20) : null, vehicle: s(b.vehicle, 20).toUpperCase() || null, purpose: s(b.purpose, 200) || null, lines, expected: kind === 'out_ret' && dayOk(b.expected) ? b.expected : null, by_user: me.id, token: crypto.randomBytes(12).toString('hex') };
        let no = ((await nextNo('ks_passes', sc.cid, 'no')) || 0) + 1, r = null;
        for (let i = 0; i < 3 && !r; i++) { r = await db('ks_passes', { method: 'POST', prefer: 'return=representation', body: { ...row, no } }).catch((e) => { if (e.code === '23505') { no++; return null; } throw e; }); }
        return NextResponse.json({ ok: true, pass: r && r[0] });
      }
      case 'pass_status': {
        const p = (await db('ks_passes?company_id=eq.' + sc.cid + '&' + (b.token ? 'token=eq.' + enc(s(b.token, 40)) : 'id=eq.' + enc(uuid(b.id) || '')) + '&select=*'))[0];
        if (!p) return fail('Pass not found.', 404);
        if (!sc.owner && !sc.ids.includes(p.site_id)) return fail('Not your site.', 403);
        const to = ['out', 'closed', 'cancelled'].includes(b.status) ? b.status : null; if (!to) return fail('Status?');
        if (p.status === 'closed' || p.status === 'cancelled') return fail('This pass is already ' + p.status + '.', 409);
        const body = { status: to };
        // Stock follows the gate: goods going out leave the stock; returnable goods come back in when the pass is closed.
        const stockLines = (p.lines || []).filter((l) => l.item_id);
        if (to === 'out' && p.status === 'open') { body.out_at = new Date().toISOString(); if (['out_ret', 'out'].includes(p.kind)) for (const l of stockLines) await addMove({ item_id: l.item_id, site_id: p.site_id, kind: 'out', qty: l.qty, party: p.party, ref: 'GP-' + p.no, pass_id: p.id }); }
        if (to === 'closed') { body.closed_at = new Date().toISOString(); if (p.kind === 'out_ret' && p.status === 'out') for (const l of stockLines) await addMove({ item_id: l.item_id, site_id: p.site_id, kind: 'in', qty: l.qty, party: p.party, ref: 'GP-' + p.no + ' returned', pass_id: p.id }); if (p.kind === 'in') for (const l of stockLines) await addMove({ item_id: l.item_id, site_id: p.site_id, kind: 'in', qty: l.qty, party: p.party, ref: 'GP-' + p.no, pass_id: p.id }); }
        await db('ks_passes?id=eq.' + enc(p.id), { method: 'PATCH', body });
        return NextResponse.json({ ok: true });
      }
      // ---------- Machines ----------
      case 'machine_save': {
        const name = s(b.name, 80); if (!name) return fail('Please write the machine name.');
        const site = mySite(b.site_id); if (!site) return fail('Please choose a site.');
        const row = { name, site_id: site, make: s(b.make, 60) || null, serial: s(b.serial, 60) || null, every_days: Math.round(num(b.every_days, 3650)), last_service: dayOk(b.last_service) ? b.last_service : null, active: b.active !== false };
        if (b.id) { await db('ks_machines?id=eq.' + enc(uuid(b.id) || '') + '&company_id=eq.' + sc.cid, { method: 'PATCH', body: row }); return NextResponse.json({ ok: true }); }
        const code = s(b.code, 30).toUpperCase() || codeNext(await nextNo('ks_machines', sc.cid, 'code'), 'M');
        await db('ks_machines', { method: 'POST', body: { company_id: me.company_id, code, ...row } }).catch((e) => { if (e.code === '23505') throw new Error('code'); throw e; });
        return NextResponse.json({ ok: true });
      }
      case 'mlog_add': {
        const m = (await db('ks_machines?id=eq.' + enc(uuid(b.machine_id) || '') + '&company_id=eq.' + sc.cid + '&select=*'))[0];
        if (!m || (!sc.owner && !sc.ids.includes(m.site_id))) return fail('Machine not found.', 404);
        const kind = ['service', 'breakdown', 'repair', 'check'].includes(b.kind) ? b.kind : 'check';
        const day = dayOk(b.day) && b.day <= today ? b.day : today;
        await db('ks_mlogs', { method: 'POST', body: { company_id: me.company_id, machine_id: m.id, kind, day, note: s(b.note, 400) || null, cost: num(b.cost), hours_down: num(b.hours_down, 100000), by_user: me.id } });
        const patch = kind === 'service' ? { last_service: day, status: 'ok' } : kind === 'breakdown' ? { status: 'down' } : kind === 'repair' ? { status: 'ok' } : null;
        if (patch) await db('ks_machines?id=eq.' + enc(m.id), { method: 'PATCH', body: patch });
        return NextResponse.json({ ok: true });
      }
      // ---------- Your data ----------
      case 'company_delete': {
        if (!sc.owner) return fail('Only the owner can delete the company.', 403);
        if (s(b.confirm, 120).toLowerCase() !== String(me.co.name || '').trim().toLowerCase()) return fail('Please type the company name exactly to confirm.');
        await db('ks_companies?id=eq.' + sc.cid, { method: 'DELETE' }); // everything of this company is deleted with it
        const r = NextResponse.json({ ok: true }); r.cookies.set('ks_session', '', { path: '/', maxAge: 0 }); return r;
      }
      default: return fail('Unknown action.');
    }
  } catch (e) { console.error('ops post', b.action, e && e.message); return fail(e && e.message === 'code' ? 'This code is already used.' : 'Could not save. Please try again.', 503); }
}
