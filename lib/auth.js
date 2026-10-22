// NSYAD login: phone + PIN. PINs are stored only as scrypt hashes. Session = signed cookie.
// Env: NSYAD_SECRET (any long random text, 16+ characters).
import crypto from 'crypto';
import { db, enc } from './db';

export const COOKIE = 'ks_session';
const secret = () => String(process.env.NSYAD_SECRET || process.env.KS_SECRET || '');
export const secretOk = () => secret().length >= 16;
export { normPhone } from './world';
export const pinOk = (p, n = 4) => new RegExp('^\\d{' + n + ',6}$').test(String(p || ''));

export function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(String(pin), salt, 32).toString('hex');
}
export function checkPin(pin, stored) {
  const [salt, h] = String(stored || '').split(':');
  if (!salt || !h) return false;
  const a = Buffer.from(crypto.scryptSync(String(pin), salt, 32).toString('hex')), b = Buffer.from(h);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const sign = (m) => crypto.createHmac('sha256', secret()).update(m).digest('hex');
export function makeSession(userId, days = 30) {
  const exp = Date.now() + days * 86400e3;
  return { value: userId + '.' + exp + '.' + sign('ks|' + userId + '|' + exp), maxAge: days * 86400 };
}
// The logged-in person (owner / supervisor / worker), or null.
export async function getMe(req) {
  if (!secretOk()) return null;
  const v = req.cookies.get(COOKIE)?.value || '';
  const [id, exp, sig] = v.split('.');
  if (!id || !(Number(exp) > Date.now()) || !sig) return null;
  const want = sign('ks|' + id + '|' + exp);
  if (want.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  const r = await db('ks_users?id=eq.' + enc(id) + '&active=eq.true&select=id,company_id,role,name,phone,sites,worker_id');
  const u = r && r[0]; if (!u) return null;
  const c = await db('ks_companies?id=eq.' + enc(u.company_id) + '&select=name,country,currency,tz,cc,focus');
  u.co = (c && c[0]) || { name: '', country: 'IN', currency: 'INR', tz: 'Asia/Kolkata', cc: '91', focus: 'att' };
  return u;
}
// Wrong-PIN protection: 5 wrong tries = 15 minutes locked for that phone.
export async function tooMany(phone) {
  const r = await db('ks_login_fails?phone=eq.' + enc(phone) + '&select=tries,until').catch(() => []);
  const f = r && r[0];
  return !!(f && f.tries >= 5 && f.until && new Date(f.until).getTime() > Date.now());
}
export async function failed(phone) {
  const r = await db('ks_login_fails?phone=eq.' + enc(phone) + '&select=tries,until').catch(() => []);
  const f = r && r[0];
  const fresh = !f || !f.until || new Date(f.until).getTime() < Date.now();
  const tries = fresh ? 1 : f.tries + 1;
  await db('ks_login_fails?on_conflict=phone', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: { phone, tries, until: new Date(Date.now() + 15 * 60e3).toISOString() } }).catch(() => {});
}
export async function cleared(phone) { await db('ks_login_fails?phone=eq.' + enc(phone), { method: 'DELETE' }).catch(() => {}); }
