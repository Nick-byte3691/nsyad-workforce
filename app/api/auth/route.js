import { NextResponse } from 'next/server';
import { db, dbReady, enc } from '../../../lib/db';
import { COOKIE, secretOk, normPhone, pinOk, hashPin, checkPin, makeSession, getMe, tooMany, failed, cleared } from '../../../lib/auth';
import { countryOf } from '../../../lib/world';
export const dynamic = 'force-dynamic';
// Errors carry a short "code" so the page can show them in the person's own language.
const fail = (error, status = 400, code) => NextResponse.json({ error, code }, { status });
const s = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const withCookie = (body, userId) => { const r = NextResponse.json(body); const t = makeSession(userId); r.cookies.set(COOKIE, t.value, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: t.maxAge }); return r; };
const FOCUS = ['att', 'stock', 'gate', 'machines'];
const home = (role, focus) => (role === 'worker' ? '/me' : '/app' + (FOCUS.includes(focus) ? '#' + focus : ''));

export async function GET(req) {
  try { const me = await getMe(req); if (!me) return NextResponse.json({ me: null }); return NextResponse.json({ me: { name: me.name, role: me.role, phone: me.phone }, company: me.co }); }
  catch { return NextResponse.json({ me: null }); }
}
export async function POST(req) {
  if (!dbReady() || !secretOk()) return fail('NSYAD is being set up. Please try again soon.', 503);
  const b = await req.json().catch(() => ({}));
  if (b.action === 'logout') { const r = NextResponse.json({ ok: true }); r.cookies.set(COOKIE, '', { path: '/', maxAge: 0 }); return r; }
  const country = countryOf(b.country);
  const phone = normPhone(b.phone, b.cc || country[2]);
  if (!phone) return fail('Please enter a correct mobile number.', 400, 'phoneBad');
  try {
    if (b.action === 'signup') {
      const company = s(b.company, 100), name = s(b.name, 60), city = s(b.city, 60) || null;
      if (!company || !name) return fail('Please write the company name and your name.');
      if (!pinOk(b.pin, 6)) return fail('PIN must be 6 digits.');
      if (b.consent !== true) return fail('Please tick the box to agree.');
      const ex = await db('ks_users?phone=eq.' + enc(phone) + '&select=id');
      if (ex && ex[0]) return fail('This number is already registered. Please log in.', 409);
      const c = await db('ks_companies', { method: 'POST', prefer: 'return=representation', body: { name: company, city, country: country[0], cc: country[2], currency: country[3], tz: country[4], focus: FOCUS.includes(b.focus) ? b.focus : 'att' } });
      await db('ks_sites', { method: 'POST', body: { company_id: c[0].id, name: s(b.site, 60) || 'Main site' } });
      const u = await db('ks_users', { method: 'POST', prefer: 'return=representation', body: { company_id: c[0].id, role: 'owner', name, phone, pin_hash: hashPin(b.pin) } });
      return withCookie({ ok: true, go: home('owner', b.focus) }, u[0].id);
    }
    if (b.action === 'login') {
      if (await tooMany(phone)) return fail('Too many wrong PINs. Please wait 15 minutes.', 429, 'tooMany');
      const r = await db('ks_users?phone=eq.' + enc(phone) + '&active=eq.true&select=id,role,pin_hash');
      const u = r && r[0];
      if (!u || !checkPin(String(b.pin || ''), u.pin_hash)) { await failed(phone); return fail('Wrong number or PIN.', 401, 'badLogin'); }
      await cleared(phone);
      return withCookie({ ok: true, go: home(u.role, b.focus) }, u.id);
    }
    return fail('Unknown action.');
  } catch (e) { console.error('auth', e && e.message); return fail('Could not connect. Please try again.', 503); }
}
