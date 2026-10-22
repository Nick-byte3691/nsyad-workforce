'use client';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Brand } from '../Brand';
import { useLang, LangSwitch } from '../../lib/i18n';
import { monthOf } from '../../lib/calc';
import { money } from '../../lib/world';
import { Stock, Gate, Machines, DataCard } from './Ops';
// Company settings (currency, today's date in the company's time zone) arrive with the first load.
let CUR = 'INR', TODAY = '', LOC = 'en';
const inr = (n) => money(n, CUR);
const todayIST = () => TODAY || new Date().toISOString().slice(0, 10);

const get = async (q) => { const r = await fetch('/api/ks?' + q, { cache: 'no-store' }); if (r.status === 401) { window.location.href = '/login'; return null; } const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Error'); return d; };
const post = async (body) => { const r = await fetch('/api/ks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Error'); return d; };
const dayLabel = (d) => { try { return new Date(d + 'T12:00:00Z').toLocaleDateString(LOC, { day: 'numeric', month: 'short', timeZone: 'UTC' }); } catch { return d; } };
const shift = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

const TABS = [['dash', '📊'], ['att', '🕘'], ['workers', '👷'], ['pay', '💰'], ['stock', '📦'], ['gate', '🚚'], ['machines', '⚙️'], ['team', '🏗️']];
const BOTTOM = ['dash', 'att', 'stock', 'gate']; // phone: the rest is under ☰ More

export default function App() {
  const L = useLang(); const { t, lang, locale } = L; const hi = lang === 'hi'; LOC = locale;
  const [tab, setTab] = useState('dash');
  const [base, setBase] = useState(null); const [more, setMore] = useState(false); const [passTok, setPassTok] = useState('');
  useEffect(() => { const h = window.location.hash.slice(1); if (TABS.some(([k]) => k === h)) setTab(h);
    // A printed gate pass QR opens /app?pass=… → straight to that pass.
    const pt = new URLSearchParams(window.location.search).get('pass'); if (pt && /^[a-f0-9]{24}$/.test(pt)) { setPassTok(pt); setTab('gate'); window.history.replaceState(null, '', '/app#gate'); } get('view=base').then((b) => { if (b) { CUR = (b.co && b.co.currency) || 'INR'; TODAY = b.today || ''; } setBase(b); }).catch(() => {}); }, []);
  const go = (k) => { setTab(k); setMore(false); window.history.replaceState(null, '', '#' + k); window.scrollTo(0, 0); };
  const owner = base && base.me.role === 'owner';
  const tabs = TABS.filter(([k]) => k !== 'team' || owner);
  const logout = async () => { await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"action":"logout"}' }); window.location.href = '/login'; };
  return (
    <div className="ap">
      <aside className="ap-side">
        <div className="ap-brand"><Brand light /></div>
        <nav>{tabs.map(([k, i]) => <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => go(k)}><span>{i}</span>{t(k)}</button>)}</nav>
        <div className="ap-soon"><small>{t('more')}</small><span>🤝 {t('help')} <em>{t('soon')}</em></span></div>
        <div className="ap-me">{base ? <><b>{base.me.name}</b><small>{t(base.me.role)}</small></> : null}<div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}><LangSwitch {...L} /><button type="button" className="ap-out" onClick={logout}>{t('logout')}</button></div></div>
      </aside>
      <header className="ap-mtop"><Brand light /><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><LangSwitch {...L} /><button type="button" className="ap-out" onClick={logout}>{t('logout')}</button></div></header>
      <main className="ap-main">
        {!base ? <p className="muted">{t('loading')}</p> : tab === 'dash' ? <Dash t={t} hi={hi} go={go} owner={owner} /> : tab === 'att' ? <Att t={t} hi={hi} /> : tab === 'workers' ? <Workers t={t} hi={hi} owner={owner} /> : tab === 'pay' ? <Pay t={t} hi={hi} owner={owner} /> : tab === 'stock' ? <Stock t={t} lang={lang} co={base.co} /> : tab === 'gate' ? <Gate t={t} lang={lang} co={base.co} openToken={passTok} /> : tab === 'machines' ? <Machines t={t} lang={lang} co={base.co} /> : <Team t={t} hi={hi} co={base.co} />}
      </main>
      <nav className="ap-bot">{tabs.filter(([k]) => BOTTOM.includes(k)).map(([k, i]) => <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => go(k)}><span>{i}</span><small>{t(k)}</small></button>)}
        <button type="button" className={!BOTTOM.includes(tab) || more ? 'on' : ''} onClick={() => setMore(!more)}><span>☰</span><small>{t('more')}</small></button></nav>
      {more ? <div className="more-bg" onClick={() => setMore(false)}><div className="more" onClick={(e) => e.stopPropagation()}>{tabs.filter(([k]) => !BOTTOM.includes(k)).map(([k, i]) => <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => go(k)}><span>{i}</span>{t(k)}</button>)}</div></div> : null}
      <style>{CSS}</style>
    </div>
  );
}

function useLoad(q) {
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  const load = useCallback(() => { setErr(''); get(q).then((x) => x && setD(x)).catch((e) => setErr(e.message)); }, [q]);
  useEffect(() => { load(); }, [load]);
  return [d, load, err, setD];
}

// ---------- Dashboard ----------
function Dash({ t, hi, go, owner }) {
  const [d, , err] = useLoad('view=dash');
  const [ops, setOps] = useState(null);
  useEffect(() => { fetch('/api/ops?view=summary', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then(setOps).catch(() => {}); }, []);
  if (err) return <p className="err">{err}</p>;
  if (!d) return <p className="muted">{t('loading')}</p>;
  const max = Math.max(1, ...d.days.map((x) => x.p + x.h + x.a));
  return (<>
    <div className="pg-h"><div><h1>{t('dash')}</h1><p className="muted">{dayLabel(d.today)} · {d.sites.length} {t('sites')}</p></div><button type="button" className="btn btn-main" onClick={() => go('att')}>🕘 {t('markNow')}</button></div>
    {d.unmarked > 0 && d.workers > 0 ? <div className="alert">⏳ {t('unmarkedN', { n: d.unmarked })} <button type="button" className="link" onClick={() => go('att')}>{t('markNow')} →</button></div> : null}
    {owner && d.noWage > 0 ? <div className="alert">💰 {t('noWageN', { n: d.noWage })} <button type="button" className="link" onClick={() => go('workers')}>{t('workers')} →</button></div> : null}
    <div className="kpis">
      <div className="card kpi"><small>{t('totalWorkers')}</small><b>{d.workers}</b></div>
      <div className="card kpi g"><small>{t('present')} · {t('today')}</small><b>{d.present}{d.half ? <em> +{d.half} ½</em> : null}</b><i style={{ width: (d.workers ? (d.present + d.half / 2) / d.workers * 100 : 0) + '%' }} /></div>
      <div className="card kpi r"><small>{t('absent')} · {t('today')}</small><b>{d.absent}</b></div>
      {owner ? <div className="card kpi a"><small>{t('monthWages')}</small><b>{inr(d.wages)}</b><span className="muted">{t('otHours')}: {d.ot} h · {t('advances')}: {inr(d.adv)}</span></div> : <div className="card kpi a"><small>{t('otHours')}</small><b>{d.ot} h</b></div>}
    </div>
    <div className="dgrid">
      <section className="card pad">
        <h2>{t('last14')}</h2>
        <svg viewBox="0 0 560 190" className="chart" role="img" aria-label={t('last14')}>
          {[0, 0.5, 1].map((f) => <g key={f}><line x1="34" x2="552" y1={20 + 140 * (1 - f)} y2={20 + 140 * (1 - f)} stroke="#E2E7EF" /><text x="28" y={24 + 140 * (1 - f)} textAnchor="end" fontSize="11" fill="#5B6780">{Math.round(max * f)}</text></g>)}
          {d.days.map((x, i) => { const bw = 518 / 14, X = 38 + i * bw, sc = 140 / max; let y = 160; const seg = (n, c) => { const h = n * sc; y -= h; return n ? <rect x={X} y={y} width={bw - 6} height={h} rx="3" fill={c}><title>{n}</title></rect> : null; };
            return <g key={x.day}>{seg(x.p, '#16A34A')}{seg(x.h, '#F5A524')}{seg(x.a, '#F2B8B8')}<text x={X + (bw - 6) / 2} y="178" textAnchor="middle" fontSize="10.5" fill="#5B6780">{x.day.slice(8)}</text></g>; })}
        </svg>
        <div className="legend"><span><i style={{ background: '#16A34A' }} />{t('present')}</span><span><i style={{ background: '#F5A524' }} />{t('half')}</span><span><i style={{ background: '#F2B8B8' }} />{t('absent')}</span></div>
      </section>
      <section className="card pad">
        <h2>{t('sitesToday')}</h2>
        {d.perSite.length ? d.perSite.map((s) => (
          <div key={s.id} className="srow"><div><b>{s.name}</b><small className="muted">{s.marked}/{s.workers} {t('markedOf')}</small></div>
            <div className="sbar"><i className="p" style={{ width: (s.workers ? s.p / s.workers * 100 : 0) + '%' }} /><i className="h" style={{ width: (s.workers ? s.h / s.workers * 100 : 0) + '%' }} /><i className="a" style={{ width: (s.workers ? s.a / s.workers * 100 : 0) + '%' }} /></div>
            <span className="snum"><b className="ok">{s.p}</b>/{s.workers}</span></div>)) : <p className="muted">{t('noSites')}</p>}
      </section>
    </div>
    {ops ? <section className="soon-row">
      <button type="button" className={'card soon live' + (ops.low ? ' warn' : '')} onClick={() => go('stock')}><span>📦</span><b>{t('stock')}</b><small className="muted">{ops.items} {t('items')}</small>{ops.low ? <em className="tag t-a">⚠️ {t('lowN', { n: ops.low })}</em> : null}</button>
      <button type="button" className={'card soon live' + (ops.notBack ? ' warn' : '')} onClick={() => go('gate')}><span>🚚</span><b>{t('gate')}</b><small className="muted">{t('passesOpen')}: {ops.passesOpen}</small>{ops.notBack ? <em className="tag t-a">⏰ {t('notBackN', { n: ops.notBack })}</em> : null}</button>
      <button type="button" className={'card soon live' + (ops.down || ops.due ? ' warn' : '')} onClick={() => go('machines')}><span>⚙️</span><b>{t('machines')}</b><small className="muted">{ops.machines}</small>{ops.down ? <em className="tag t-a">🔴 {t('downN', { n: ops.down })}</em> : ops.due ? <em className="tag t-amb">⏰ {t('dueN', { n: ops.due })}</em> : null}</button>
      <div className="card soon"><span>🤝</span><b>{t('help')}</b><small className="muted">{t('helpFamily')}</small><em className="tag t-amb">{t('soon')}</em></div>
    </section> : null}
  </>);
}

// ---------- Attendance ----------
function Att({ t, hi }) {
  const [day, setDay] = useState(todayIST()); const [site, setSite] = useState('');
  const [d, load, err] = useLoad('view=att&day=' + day + (site ? '&site=' + site : ''));
  useEffect(() => { setMsg(''); }, [day, site]); // eslint-disable-line react-hooks/exhaustive-deps
  const [rows, setRows] = useState({}); const [dirty, setDirty] = useState(false); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!d) return; if (!site && d.site) setSite(d.site); const m = {}; for (const w of d.workers) { const a = d.att.find((x) => x.worker_id === w.id); m[w.id] = { status: a ? a.status : '', ot: a ? String(a.ot_hours || '') : '' }; } setRows(m); setDirty(false); }, [d]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (id, k, v) => { setRows((r) => ({ ...r, [id]: { ...r[id], [k]: v } })); setDirty(true); setMsg(''); };
  const allP = () => { setRows((r) => { const n = { ...r }; for (const k of Object.keys(n)) if (!n[k].status) n[k] = { ...n[k], status: 'P' }; return n; }); setDirty(true); };
  const save = async () => { setBusy(true); setMsg(''); try { await post({ action: 'att_save', day, site: d.site, rows: Object.entries(rows).map(([worker_id, r]) => ({ worker_id, status: r.status, ot_hours: r.ot })) }); setMsg(t('saved')); setDirty(false); load(); } catch (e) { setMsg(e.message); } setBusy(false); };
  const c = useMemo(() => { const v = Object.values(rows); return { p: v.filter((x) => x.status === 'P').length, h: v.filter((x) => x.status === 'H').length, a: v.filter((x) => x.status === 'A').length, n: v.filter((x) => !x.status).length }; }, [rows]);
  if (err) return <p className="err">{err}</p>;
  return (<>
    <div className="pg-h"><h1>{t('att')}</h1></div>
    <div className="card pad bar">
      <label className="lbl">{t('site')}<select className="inp" value={site || (d && d.site) || ''} onChange={(e) => setSite(e.target.value)}>{d && d.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="lbl">{t('date')}<input className="inp" type="date" max={todayIST()} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} /></label>
      <div className="qd"><button type="button" className={'btn btn-sm ' + (day === todayIST() ? 'btn-dark' : 'btn-ghost')} onClick={() => setDay(todayIST())}>{t('today')}</button><button type="button" className={'btn btn-sm ' + (day === shift(todayIST(), -1) ? 'btn-dark' : 'btn-ghost')} onClick={() => setDay(shift(todayIST(), -1))}>{t('yesterday')}</button></div>
    </div>
    {!d ? <p className="muted">{t('loading')}</p> : !d.site ? <p className="muted">{t('noSites')}</p> : !d.workers.length ? <p className="muted">{t('noWorkersSite')}</p> : <>
      <div className="cnt"><span className="tag t-p">{t('present')} {c.p}</span><span className="tag t-h">{t('half')} {c.h}</span><span className="tag t-a">{t('absent')} {c.a}</span><span className="tag t-n">{t('notMarked')} {c.n}</span><span style={{ flex: 1 }} /><button type="button" className="btn btn-ghost btn-sm" onClick={allP}>✓ {t('allP')}</button></div>
      <div className="alist">{d.workers.map((w) => { const r = rows[w.id] || {}; return (
        <div key={w.id} className={'card arow s-' + (r.status || 'n')}>
          <div className="aw"><b>{w.name}</b><small className="muted">{w.code}{w.skill ? ' · ' + w.skill : ''}</small></div>
          <div className="seg" role="radiogroup" aria-label={w.name}>{[['P', t('present')], ['H', '½'], ['A', t('absent')]].map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={r.status === k} className={'sg-' + k + (r.status === k ? ' on' : '')} onClick={() => set(w.id, 'status', r.status === k ? '' : k)}>{k === 'P' ? t('pShort') : k === 'A' ? t('aShort') : l}</button>)}</div>
          <label className="otl"><small>{t('ot')}</small><input className="inp" inputMode="decimal" disabled={r.status === 'A' || !r.status} value={r.ot || ''} placeholder="0" onChange={(e) => set(w.id, 'ot', e.target.value.replace(/[^\d.]/g, '').slice(0, 4))} /></label>
        </div>); })}</div>
      <div className="savebar">{msg ? <span className={msg === t('saved') ? 'ok' : 'err'}>{msg}</span> : dirty ? <span className="muted">{t('unsaved')}</span> : null}<span style={{ flex: 1 }} /><button type="button" className="btn btn-main" disabled={busy || !dirty} onClick={save}>{busy ? '…' : '💾 ' + t('save')}</button></div>
    </>}
  </>);
}

// ---------- Workers ----------
const EMPTY = { name: '', phone: '', skill: '', site_id: '', daily_wage: '', ot_rate: '', joined: '', active: true };
function Workers({ t, hi, owner }) {
  const [d, load, err] = useLoad('view=workers');
  const [q, setQ] = useState(''); const [f, setF] = useState(null); const [acc, setAcc] = useState(null); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [showLeft, setShowLeft] = useState(false);
  if (err) return <p className="err">{err}</p>;
  if (!d) return <p className="muted">{t('loading')}</p>;
  const siteName = (id) => (d.allSites.find((s) => s.id === id) || {}).name || '—';
  const list = d.workers.filter((w) => (showLeft || w.active) && (!q || (w.name + ' ' + w.code + ' ' + (w.skill || '')).toLowerCase().includes(q.toLowerCase())));
  const save = async (e) => { e.preventDefault(); setBusy(true); setMsg(''); try { await post({ action: 'worker_save', ...f }); setF(null); load(); } catch (x) { setMsg(x.message); } setBusy(false); };
  const saveAcc = async (e) => { e.preventDefault(); setBusy(true); setMsg(''); try { await post({ action: 'worker_login', ...acc }); setAcc(null); load(); } catch (x) { setMsg(x.message); } setBusy(false); };
  const wage = (v) => { const w = parseFloat(v) || 0; return w ? String(Math.round(w / 8 * 2 * 100) / 100) : ''; };
  return (<>
    <div className="pg-h"><div><h1>{t('workers')}</h1><p className="muted">{d.workers.filter((w) => w.active).length} {t('active')}</p></div><button type="button" className="btn btn-main" onClick={() => { setF({ ...EMPTY, site_id: d.sites[0] && d.sites[0].id, joined: todayIST() }); setMsg(''); }}>＋ {t('addWorker')}</button></div>
    {f ? <form className="card pad form" onSubmit={save}>
      <h2>{f.id ? t('edit') + ': ' + f.code : t('addWorker')}</h2>
      <div className="fg">
        <label className="lbl">{t('name')}<input className="inp" required maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="lbl">{t('phone')}<input className="inp" inputMode="numeric" maxLength={14} value={f.phone || ''} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        <label className="lbl">{t('skill')}<input className="inp" maxLength={40} list="skills" value={f.skill || ''} onChange={(e) => setF({ ...f, skill: e.target.value })} /></label>
        <label className="lbl">{t('site')}<select className="inp" value={f.site_id || ''} onChange={(e) => setF({ ...f, site_id: e.target.value })}>{d.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        {owner ? <><label className="lbl">{t('dailyWage')} ({CUR})<input className="inp" inputMode="decimal" value={f.daily_wage} onChange={(e) => { const v = e.target.value.replace(/[^\d.]/g, ''); setF({ ...f, daily_wage: v, ot_rate: f.ot_touched ? f.ot_rate : wage(v) }); }} /></label>
          <label className="lbl">{t('otRate')} ({CUR})<input className="inp" inputMode="decimal" value={f.ot_rate} onChange={(e) => setF({ ...f, ot_rate: e.target.value.replace(/[^\d.]/g, ''), ot_touched: true })} /><small className="muted" style={{ fontWeight: 400 }}>{t('otAuto')}</small></label></> : null}
        <label className="lbl">{t('joined')}<input className="inp" type="date" value={f.joined || ''} onChange={(e) => setF({ ...f, joined: e.target.value })} /></label>
        {f.id ? <label className="lbl">{t('status')}<select className="inp" value={f.active ? '1' : '0'} onChange={(e) => setF({ ...f, active: e.target.value === '1' })}><option value="1">{t('active')}</option><option value="0">{t('left')}</option></select></label> : null}
      </div>
      <datalist id="skills">{['Helper', 'Mason', 'Welder', 'Fitter', 'Electrician', 'Operator', 'Loader', 'Carpenter', 'Painter', 'Plumber', 'Driver', 'Security', 'Cleaner', 'Cook', 'Tailor', 'Packer', 'Farm worker'].map((x) => <option key={x} value={x} />)}</datalist>
      {msg ? <p className="err">{msg}</p> : null}
      <div className="fa"><button type="button" className="btn btn-ghost" onClick={() => setF(null)}>{t('cancel')}</button><button className="btn btn-main" disabled={busy}>{busy ? '…' : t('save')}</button></div>
    </form> : null}
    {acc ? <form className="card pad form" onSubmit={saveAcc}>
      <h2>📱 {t('giveAccess')}: {acc.name}</h2>
      <p className="muted" style={{ marginTop: 0 }}>{t('accessNote')}</p>
      <div className="fg"><label className="lbl">{t('phone')}<input className="inp" required inputMode="numeric" maxLength={14} value={acc.phone} onChange={(e) => setAcc({ ...acc, phone: e.target.value })} /></label>
        <label className="lbl">{t('pin4')}<input className="inp" required inputMode="numeric" maxLength={6} value={acc.pin} onChange={(e) => setAcc({ ...acc, pin: e.target.value.replace(/\D/g, '') })} /></label></div>
      {msg ? <p className="err">{msg}</p> : null}
      <div className="fa"><button type="button" className="btn btn-ghost" onClick={() => setAcc(null)}>{t('cancel')}</button><button className="btn btn-main" disabled={busy}>{busy ? '…' : t('save')}</button></div>
    </form> : null}
    <div className="tools"><input className="inp" placeholder={'🔎 ' + t('search')} value={q} onChange={(e) => setQ(e.target.value)} /><label className="chk"><input type="checkbox" checked={showLeft} onChange={(e) => setShowLeft(e.target.checked)} /> {t('left')}</label></div>
    {!list.length ? <p className="muted">{t('nothing')}</p> : <div className="wl">{list.map((w) => (
      <div key={w.id} className={'card wcard' + (w.active ? '' : ' off')}>
        <div className="wa">{w.name.trim().slice(0, 1).toUpperCase()}</div>
        <div className="wi"><b>{w.name}</b><small className="muted">{w.code} · {siteName(w.site_id)}{w.skill ? ' · ' + w.skill : ''}</small>
          <div className="wt">{Number(w.daily_wage) > 0 ? <span className="tag t-n">{inr(w.daily_wage)}/{t('perDay')}</span> : <span className="tag t-amb">{t('noWage')}</span>}{w.login ? <span className="tag t-p">📱 {t('hasAccess')}</span> : null}{w.active ? null : <span className="tag t-a">{t('left')}</span>}</div></div>
        <div className="wb"><button type="button" className="btn btn-ghost btn-sm" onClick={() => { setF({ ...EMPTY, ...w, daily_wage: String(w.daily_wage || ''), ot_rate: String(w.ot_rate || ''), ot_touched: true }); setAcc(null); setMsg(''); window.scrollTo(0, 0); }}>{t('edit')}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAcc({ id: w.id, name: w.name, phone: w.phone || '', pin: '' }); setF(null); setMsg(''); window.scrollTo(0, 0); }}>📱</button></div>
      </div>))}</div>}
  </>);
}

// ---------- Wages ----------
function Pay({ t, hi, owner }) {
  const [month, setMonth] = useState(monthOf(todayIST()));
  const [d, load, err] = useLoad('view=pay&month=' + month);
  const [m, setM] = useState(null); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [open, setOpen] = useState('');
  if (err) return <p className="err">{err}</p>;
  const tot = d ? d.rows.reduce((a, r) => ({ days: a.days + r.days, ot: a.ot + r.ot, earned: a.earned + r.earned, adv: a.adv + r.adv, paid: a.paid + r.paid, net: a.net + r.net }), { days: 0, ot: 0, earned: 0, adv: 0, paid: 0, net: 0 }) : null;
  const csv = () => {
    const head = ['ID', 'Name', 'Site', 'Full days', 'Half days', 'Absent', 'Days', 'Daily wage', 'OT hours', 'OT rate', 'Wage', 'OT pay', 'Earned', 'Advance', 'Paid', 'To pay'];
    const site = (id) => (d.allSites.find((s) => s.id === id) || {}).name || '';
    const q = (v) => { const x = String(v == null ? '' : v); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
    const lines = [head.join(','), ...d.rows.map((r) => [r.code, r.name, site(r.site_id), r.full, r.half, r.absent, r.days, r.daily_wage, r.ot, r.ot_rate, r.wage, r.otPay, r.earned, r.adv, r.paid, r.net].map(q).join(','))];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv' })); a.download = 'nsyad-wages-' + month + '.csv'; a.click();
  };
  const addMoney = async (e) => { e.preventDefault(); setBusy(true); setMsg(''); try { await post({ action: 'money_add', ...m }); setM(null); load(); } catch (x) { setMsg(x.message); } setBusy(false); };
  const del = async (id) => { if (!confirm(t('delEntry'))) return; try { await post({ action: 'money_del', id }); load(); } catch (x) { alert(x.message); } };
  return (<>
    <div className="pg-h"><div><h1>{t('pay')}</h1><p className="muted">{t('payFormula')}</p></div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}><label className="lbl">{t('month')}<input className="inp" type="month" value={month} max={monthOf(todayIST())} onChange={(e) => e.target.value && setMonth(e.target.value)} /></label>{d ? <button type="button" className="btn btn-ghost" onClick={csv}>⬇ CSV</button> : null}</div></div>
    {m ? <form className="card pad form" onSubmit={addMoney}>
      <h2>{m.kind === 'payment' ? t('addPay') : t('addAdv')}: {m.name}</h2>
      <div className="fg"><label className="lbl">{t('amount')} ({CUR})<input className="inp" required inputMode="decimal" value={m.amount} onChange={(e) => setM({ ...m, amount: e.target.value.replace(/[^\d.]/g, '') })} autoFocus /></label>
        <label className="lbl">{t('date')}<input className="inp" type="date" max={todayIST()} value={m.day} onChange={(e) => setM({ ...m, day: e.target.value })} /></label>
        <label className="lbl">{t('note')}<input className="inp" maxLength={120} value={m.note} onChange={(e) => setM({ ...m, note: e.target.value })} /></label></div>
      {msg ? <p className="err">{msg}</p> : null}
      <div className="fa"><button type="button" className="btn btn-ghost" onClick={() => setM(null)}>{t('cancel')}</button><button className="btn btn-main" disabled={busy}>{busy ? '…' : t('save')}</button></div>
    </form> : null}
    {!d ? <p className="muted">{t('loading')}</p> : !d.rows.length ? <p className="muted">{t('nothing')}</p> : <>
      <div className="kpis"><div className="card kpi"><small>{t('earned')}</small><b>{inr(tot.earned)}</b></div><div className="card kpi"><small>{t('adv')}</small><b>{inr(tot.adv)}</b></div><div className="card kpi"><small>{t('paid')}</small><b>{inr(tot.paid)}</b></div><div className="card kpi a"><small>{t('net')}</small><b>{inr(tot.net)}</b></div></div>
      <div className="card scroll"><table className="tb">
        <thead><tr><th>{t('name')}</th><th className="r">{t('days')}</th><th className="r">OT h</th><th className="r">{t('earned')}</th><th className="r">{t('adv')}</th><th className="r">{t('paid')}</th><th className="r">{t('net')}</th><th /></tr></thead>
        <tbody>{d.rows.map((r) => (<Fragment key={r.id}>
          <tr className="prow" onClick={() => setOpen(open === r.id ? '' : r.id)}>
            <td><b>{r.name}</b><br /><small className="muted">{r.code} · {r.full}P · {r.half}H · {r.absent}A{!(Number(r.daily_wage) > 0) ? ' · ' + t('noWage') : ''}</small></td>
            <td className="r">{r.days}</td><td className="r">{r.ot}</td><td className="r">{inr(r.earned)}</td><td className="r">{inr(r.adv)}</td><td className="r">{inr(r.paid)}</td><td className="r"><b>{inr(r.net)}</b></td>
            <td className="r" onClick={(e) => e.stopPropagation()}><div className="pb"><button type="button" className="btn btn-ghost btn-sm" onClick={() => { setM({ worker_id: r.id, name: r.name, kind: 'advance', amount: '', day: todayIST(), note: '' }); setMsg(''); window.scrollTo(0, 0); }}>{t('adv')}</button>{owner ? <button type="button" className="btn btn-dark btn-sm" onClick={() => { setM({ worker_id: r.id, name: r.name, kind: 'payment', amount: r.net > 0 ? String(r.net) : '', day: todayIST(), note: '' }); setMsg(''); window.scrollTo(0, 0); }}>{t('payBtn')}</button> : null}</div></td>
          </tr>
          {open === r.id ? <tr><td colSpan={8} className="pdet">
            <span>{t('wage')}: {r.days} × {inr(r.daily_wage)} = <b>{inr(r.wage)}</b></span><span>OT: {r.ot} h × {inr(r.ot_rate)} = <b>{inr(r.otPay)}</b></span>
            {d.money.filter((x) => x.worker_id === r.id).map((x) => <span key={x.id} className="mline">{x.day.slice(5)} · {x.kind === 'payment' ? t('paid') : t('adv')} {inr(x.amount)}{x.note ? ' · ' + x.note : ''}{owner ? <button type="button" className="link" onClick={() => del(x.id)}>✕</button> : null}</span>)}
          </td></tr> : null}
        </Fragment>))}</tbody>
        <tfoot><tr><td><b>{t('total')}</b></td><td className="r">{tot.days}</td><td className="r">{Math.round(tot.ot * 100) / 100}</td><td className="r">{inr(tot.earned)}</td><td className="r">{inr(tot.adv)}</td><td className="r">{inr(tot.paid)}</td><td className="r"><b>{inr(tot.net)}</b></td><td /></tr></tfoot>
      </table></div>
    </>}
  </>);
}

// ---------- Team and sites (owner) ----------
function Team({ t, hi, co }) {
  const [d, load, err] = useLoad('view=team');
  const [site, setSite] = useState({ name: '', address: '' }); const [sup, setSup] = useState(null); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  if (err) return <p className="err">{err}</p>;
  if (!d) return <p className="muted">{t('loading')}</p>;
  const act = async (body, after) => { setBusy(true); setMsg(''); try { await post(body); after && after(); load(); } catch (x) { setMsg(x.message); } setBusy(false); };
  const sname = (id) => (d.allSites.find((s) => s.id === id) || {}).name || '?';
  return (<>
    <div className="pg-h"><h1>{t('team')}</h1></div>
    {msg ? <p className="err">{msg}</p> : null}
    <div className="dgrid">
      <section className="card pad">
        <h2>🏗️ {t('sites')}</h2>
        {d.allSites.map((s) => <div key={s.id} className="trow"><div><b>{s.name}</b>{s.address ? <small className="muted">{s.address}</small> : null}</div>{s.active ? null : <span className="tag t-n">off</span>}</div>)}
        <form className="inl" onSubmit={(e) => { e.preventDefault(); act({ action: 'site_add', ...site }, () => setSite({ name: '', address: '' })); }}>
          <input className="inp" required maxLength={60} placeholder={t('site') + ' ' + t('name')} value={site.name} onChange={(e) => setSite({ ...site, name: e.target.value })} />
          <input className="inp" maxLength={160} placeholder={t('address')} value={site.address} onChange={(e) => setSite({ ...site, address: e.target.value })} />
          <button className="btn btn-dark" disabled={busy}>＋ {t('addSite')}</button>
        </form>
      </section>
      <section className="card pad">
        <h2>🧑‍🔧 {t('supervisors')}</h2>
        {d.team.map((u) => <div key={u.id} className="trow"><div><b>{u.name}</b> <span className={'tag ' + (u.role === 'owner' ? 't-amb' : 't-n')}>{t(u.role)}</span><small className="muted">{u.phone}{u.role === 'supervisor' ? ' · ' + (u.sites.length ? u.sites.map(sname).join(', ') : t('noSite')) : ''}</small></div>
          {u.role === 'supervisor' ? <div className="pb"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setSup({ id: u.id, name: u.name, sites: u.sites, pin: '', edit: true })}>{t('edit')}</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => act({ action: 'team_edit', id: u.id, active: !u.active })}>{u.active ? t('block') : t('unblock')}</button></div> : null}</div>)}
        {sup ? <form className="form" onSubmit={(e) => { e.preventDefault(); act(sup.edit ? { action: 'team_edit', id: sup.id, sites: sup.sites, pin: sup.pin || undefined } : { action: 'team_add', ...sup }, () => setSup(null)); }}>
          {sup.edit ? <b>{t('edit')}: {sup.name}</b> : <div className="fg"><label className="lbl">{t('name')}<input className="inp" required maxLength={60} value={sup.name} onChange={(e) => setSup({ ...sup, name: e.target.value })} /></label><label className="lbl">{t('phone')}<input className="inp" required inputMode="numeric" maxLength={14} value={sup.phone} onChange={(e) => setSup({ ...sup, phone: e.target.value })} /></label></div>}
          <label className="lbl">{sup.edit ? t('newPin') + ' ' + t('keepEmpty') : t('pin4')}<input className="inp" required={!sup.edit} inputMode="numeric" maxLength={6} value={sup.pin} onChange={(e) => setSup({ ...sup, pin: e.target.value.replace(/\D/g, '') })} /></label>
          <div className="lbl">{t('theirSites')}<div className="chips">{d.allSites.map((s) => <label key={s.id} className={'chip' + (sup.sites.includes(s.id) ? ' on' : '')}><input type="checkbox" checked={sup.sites.includes(s.id)} onChange={(e) => setSup({ ...sup, sites: e.target.checked ? [...sup.sites, s.id] : sup.sites.filter((x) => x !== s.id) })} />{s.name}</label>)}</div></div>
          <div className="fa"><button type="button" className="btn btn-ghost" onClick={() => setSup(null)}>{t('cancel')}</button><button className="btn btn-main" disabled={busy}>{t('save')}</button></div>
        </form> : <button type="button" className="btn btn-dark" style={{ marginTop: 10 }} onClick={() => setSup({ name: '', phone: '', pin: '', sites: [] })}>＋ {t('addSup')}</button>}
      </section>
    </div>
    <DataCard t={t} co={co} />
  </>);
}

const CSS = `
.ap{min-height:100vh;display:grid;grid-template-columns:248px minmax(0,1fr);align-content:start}
.ap-side{background:var(--navy);color:#fff;display:flex;flex-direction:column;padding:18px 14px;position:sticky;top:0;height:100vh;gap:18px}
.ap-brand{padding:4px 8px 6px}.ap-side nav{display:flex;flex-direction:column;gap:4px}
.ap-side nav button{display:flex;gap:12px;align-items:center;border:0;background:none;color:#C9D4EA;padding:11px 12px;border-radius:12px;font-weight:600;font-size:15px;cursor:pointer;text-align:left}
.ap-side nav button span{width:22px;text-align:center}.ap-side nav button:hover{background:rgba(255,255,255,.06)}.ap-side nav button.on{background:var(--navy2);color:#fff;box-shadow:inset 3px 0 0 var(--amber)}
.ap-soon{display:flex;flex-direction:column;gap:6px;padding:12px;border-radius:12px;background:rgba(255,255,255,.04);font-size:13px;color:#9FB0D0}.ap-soon small{text-transform:uppercase;letter-spacing:.12em;font-size:10.5px}.ap-soon em{font-style:normal;font-size:10.5px;color:var(--amber);margin-left:4px}
.ap-me{margin-top:auto;padding:12px;border-top:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column}.ap-me small{color:#9FB0D0}
.ap-out{border:1px solid rgba(255,255,255,.18);background:none;color:#fff;border-radius:9px;padding:5px 10px;font-size:13px;cursor:pointer}
.ap-mtop,.ap-bot{display:none}.more-bg{position:fixed;inset:0;z-index:40;background:rgba(11,23,48,.35)}.more{position:fixed;left:10px;right:10px;bottom:70px;background:#fff;border-radius:18px;padding:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px;box-shadow:0 20px 40px -10px rgba(0,0,0,.4)}.more button{display:flex;gap:10px;align-items:center;border:0;background:#F4F6FA;border-radius:12px;padding:14px;font-weight:600;font-size:15px;cursor:pointer;color:var(--ink)}.more button.on{background:var(--amber2)}.more span{font-size:20px}
.ap-main{padding:26px 28px 60px;max-width:1150px;width:100%}
.pg-h{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:16px}.pg-h h1{margin:0;font-size:26px;letter-spacing:-.01em}.pg-h p{margin:2px 0 0}
.alert{background:var(--amber2);border:1px solid #F7D9A0;color:#6B4700;border-radius:14px;padding:11px 14px;font-size:14px;font-weight:600;margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.link{border:0;background:none;color:var(--blue);font-weight:600;cursor:pointer;padding:0 4px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}
.kpi{padding:16px;position:relative;overflow:hidden;display:flex;flex-direction:column;gap:2px}.kpi small{color:var(--soft);font-weight:600;font-size:12.5px}.kpi b{font-size:28px;letter-spacing:-.02em}.kpi b em{font-size:15px;color:var(--half);font-style:normal}.kpi span{font-size:12px}
.kpi i{position:absolute;left:0;bottom:0;height:4px;background:var(--green)}.kpi.g b{color:var(--green)}.kpi.r b{color:var(--red)}.kpi.a{background:var(--navy);color:#fff;border-color:var(--navy)}.kpi.a small,.kpi.a span{color:#9FB0D0}.kpi.a b{color:var(--amber)}
.dgrid{display:grid;grid-template-columns:1.4fr 1fr;gap:12px}.pad{padding:18px}.pad h2{margin:0 0 10px;font-size:16px}
.chart{width:100%;height:auto;display:block}.legend{display:flex;gap:14px;font-size:12.5px;color:var(--soft)}.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}
.srow{display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}.srow:last-child{border:0}.srow small{display:block;font-size:12px}
.sbar{display:flex;height:10px;border-radius:99px;background:#EEF1F6;overflow:hidden}.sbar i{display:block;height:100%}.sbar .p{background:var(--green)}.sbar .h{background:var(--amber)}.sbar .a{background:#F2B8B8}.snum{font-size:14px;color:var(--soft)}
.soon-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:12px}.soon{padding:14px;display:flex;flex-direction:column;gap:3px;position:relative;background:#FBFCFE;text-align:left;font:inherit;color:inherit}.soon.live{background:#fff;cursor:pointer}.soon.live:hover{border-color:var(--amber)}.soon.warn{border-color:#F6C9C9;background:#FFFBFB}.soon.live em{position:static;align-self:flex-start;margin-top:4px;white-space:normal}.soon span{font-size:22px}.soon small{font-size:12.5px}.soon em{position:absolute;top:12px;right:12px;font-style:normal}
.bar{display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end;margin-bottom:12px}.qd{display:flex;gap:6px}
.cnt{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.alist{display:flex;flex-direction:column;gap:8px;padding-bottom:80px}
.arow{display:grid;grid-template-columns:1fr auto 90px;gap:12px;align-items:center;padding:10px 12px;border-left:5px solid #D5DBE5}
.arow.s-P{border-left-color:var(--green)}.arow.s-A{border-left-color:var(--red)}.arow.s-H{border-left-color:var(--amber)}.aw small{display:block;font-size:12px}
.seg{display:flex;background:#EEF1F6;border-radius:12px;padding:3px;gap:3px}.seg button{border:0;background:none;padding:9px 12px;min-width:56px;border-radius:9px;font-weight:700;font-size:14px;cursor:pointer;color:var(--soft)}
.seg .sg-P.on{background:var(--green);color:#fff}.seg .sg-H.on{background:var(--amber);color:#1B1300}.seg .sg-A.on{background:var(--red);color:#fff}
.otl{display:flex;flex-direction:column;gap:2px}.otl small{font-size:11px;color:var(--soft);font-weight:600}.otl .inp{padding:8px;text-align:center}.otl .inp:disabled{background:#F6F7FA}
.savebar{position:sticky;bottom:0;display:flex;gap:10px;align-items:center;background:rgba(242,245,249,.94);backdrop-filter:blur(6px);padding:12px 0;border-top:1px solid var(--line);margin-top:-70px}
.form{display:flex;flex-direction:column;gap:12px;margin-bottom:14px}.form h2{margin:0}.fg{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}.fa{display:flex;gap:8px;justify-content:flex-end}
.tools{display:flex;gap:12px;align-items:center;margin-bottom:10px}.tools .inp{max-width:360px}.chk{display:flex;gap:6px;align-items:center;font-size:14px;color:var(--soft);white-space:nowrap}
.wl{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:10px}
.wcard{display:flex;gap:12px;align-items:center;padding:12px}.wcard.off{opacity:.6}.wa{width:44px;height:44px;flex:none;border-radius:12px;background:var(--navy);color:var(--amber);display:grid;place-items:center;font-weight:700;font-size:18px}
.wi{flex:1;min-width:0}.wi small{display:block;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wt{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}.wb{display:flex;flex-direction:column;gap:6px}
.prow{cursor:pointer}.prow:hover td{background:#FAFBFD}.pb{display:flex;gap:6px;justify-content:flex-end}.pdet{background:#FAFBFD;display:table-cell}.pdet span{display:inline-block;margin:0 18px 4px 0;font-size:13.5px}.mline{color:var(--soft)}
tfoot td{border-top:2px solid var(--line);font-size:14px}
.trow{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)}.trow small{display:block;font-size:12.5px}
.inl{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-top:12px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}.chip{display:flex;gap:6px;align-items:center;border:1.5px solid var(--line);border-radius:99px;padding:6px 12px;font-weight:600;color:var(--ink);cursor:pointer;font-size:13.5px}.chip.on{border-color:var(--amber);background:var(--amber2)}.chip input{display:none}
@media(max-width:900px){
  .ap-mtop .lsw{max-width:96px}.ap-mtop .ap-out{white-space:nowrap}
  .ap{grid-template-columns:minmax(0,1fr)}.ap-side{display:none}
  .ap-mtop{display:flex;justify-content:space-between;align-items:center;background:var(--navy);color:#fff;padding:0 14px;height:60px;position:sticky;top:0;z-index:20}
  .ap-bot{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--line);z-index:30;padding-bottom:env(safe-area-inset-bottom)}
  .ap-bot button{border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 2px;color:var(--soft);cursor:pointer}.ap-bot span{font-size:19px}.ap-bot small{font-size:11px;font-weight:600}.ap-bot button.on{color:var(--ink);box-shadow:inset 0 3px 0 var(--amber)}
  .ap-main{padding:16px 14px 90px}.kpis{grid-template-columns:1fr 1fr}.dgrid{grid-template-columns:1fr}.soon-row{grid-template-columns:1fr 1fr}
  .savebar{bottom:58px}.bar{grid-template-columns:1fr 1fr}.qd{grid-column:span 2}.inl{grid-template-columns:1fr}
}
@media(max-width:520px){.arow{grid-template-columns:1fr 74px;}.arow .seg{grid-column:1/-1;order:3}.arow .otl{grid-row:1;grid-column:2}.seg button{flex:1}.wl{grid-template-columns:1fr}.kpi b{font-size:23px}}
`;
