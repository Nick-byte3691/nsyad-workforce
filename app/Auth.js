'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brand } from './Brand';
import { useLang, LangSwitch } from '../lib/i18n';
import { COUNTRIES, countryOf } from '../lib/world';

const post = async (body) => { const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const d = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(d.error || 'Error'); e.code = d.code; throw e; } return d; };

export default function Auth({ mode }) {
  const L = useLang(); const { t } = L;
  const [f, setF] = useState({ focus: '', country: 'IN', phone: '', pin: '', pin2: '', company: '', name: '', city: '', site: '', consent: false });
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { try { const fo = new URLSearchParams(window.location.search).get('focus'); if (['att', 'stock', 'gate', 'machines'].includes(fo)) setF((x) => ({ ...x, focus: fo })); } catch {} try { const c = localStorage.getItem('nsyad_country'); if (c && COUNTRIES.some((x) => x[0] === c)) setF((x) => ({ ...x, country: c })); } catch {} }, []);
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); if (k === 'country') try { localStorage.setItem('nsyad_country', v); } catch {} };
  const C = countryOf(f.country);
  const go = async (e) => {
    e.preventDefault(); setMsg('');
    if (mode === 'start' && f.pin !== f.pin2) { setMsg(t('pinMismatch')); return; }
    setBusy(true);
    try { const d = await post({ action: mode === 'start' ? 'signup' : 'login', ...f, cc: C[2] }); window.location.href = d.go || '/app'; } catch (x) { setMsg(x.code ? t(x.code) : x.message); setBusy(false); }
  };
  return (
    <main className="au">
      <div className="au-top"><Link href="/" style={{ textDecoration: 'none' }}><Brand light /></Link><LangSwitch {...L} /></div>
      <form className="card au-box" onSubmit={go}>
        <h1>{mode === 'start' ? t('startCo') : t('login')}</h1>
        <p className="muted" style={{ marginTop: 0 }}>{mode === 'start' ? t('ownerNote') : t('loginNote')}</p>
        {mode === 'start' ? <>
          <label className="lbl">{t('coName')}<input className="inp" required maxLength={100} value={f.company} onChange={(e) => set('company', e.target.value)} /></label>
          <label className="lbl">{t('yourName')}<input className="inp" required maxLength={60} value={f.name} onChange={(e) => set('name', e.target.value)} /></label>
        </> : null}
        {mode === 'start' ? <div className="lbl">{t('mainWork')}<div className="fo">{[['att', '👷'], ['stock', '📦'], ['gate', '🚚'], ['machines', '⚙️']].map(([k, i]) => <button key={k} type="button" className={(f.focus || 'att') === k ? 'on' : ''} onClick={() => set('focus', k)}><span>{i}</span>{t('f_' + k)}</button>)}</div><small className="muted" style={{ fontWeight: 400 }}>{t('mainWorkNote')}</small></div> : null}
        <label className="lbl">{t('country')}<select className="inp" value={f.country} onChange={(e) => set('country', e.target.value)}>{COUNTRIES.map((c) => <option key={c[0]} value={c[0]}>{c[1]} (+{c[2]})</option>)}</select></label>
        {mode === 'start' ? <div className="au-2"><label className="lbl">{t('city')}<input className="inp" maxLength={60} value={f.city} onChange={(e) => set('city', e.target.value)} /></label>
          <label className="lbl">{t('firstSite')}<input className="inp" maxLength={60} placeholder={t('mainSite')} value={f.site} onChange={(e) => set('site', e.target.value)} /></label></div> : null}
        <label className="lbl">{t('mobile')}<span className="ph"><b>+{C[2]}</b><input className="inp" required inputMode="tel" autoComplete="tel" maxLength={18} value={f.phone} onChange={(e) => set('phone', e.target.value)} /></span><small className="muted" style={{ fontWeight: 400 }}>{t('phoneHint', { c: C[1] })}</small></label>
        <label className="lbl">{mode === 'start' ? t('makePin') : 'PIN'}<input className="inp pin" required type="password" inputMode="numeric" autoComplete={mode === 'start' ? 'new-password' : 'current-password'} maxLength={6} value={f.pin} onChange={(e) => set('pin', e.target.value.replace(/\D/g, ''))} /></label>
        {mode === 'start' ? <>
          <label className="lbl">{t('pinAgain')}<input className="inp pin" required type="password" inputMode="numeric" maxLength={6} value={f.pin2} onChange={(e) => set('pin2', e.target.value.replace(/\D/g, ''))} /></label>
          <label className="au-c"><input type="checkbox" checked={f.consent} onChange={(e) => set('consent', e.target.checked)} /><span>{t('consent')}</span></label>
        </> : null}
        {msg ? <p className="err" role="alert">{msg}</p> : null}
        <button className="btn btn-main" disabled={busy} style={{ width: '100%', marginTop: 6 }}>{busy ? '…' : mode === 'start' ? t('createCo') : t('login')}</button>
        <p className="muted" style={{ textAlign: 'center', fontSize: 14, marginBottom: 0 }}>{mode === 'start' ? <>{t('already')} <Link href={'/login' + (f.focus ? '?focus=' + f.focus : '')}>{t('login')}</Link></> : <>{t('newCo')} <Link href="/start">{t('startFree')}</Link><br />{t('forgotPin')}</>}</p>
      </form>
      <style>{`.au{min-height:100vh;background:radial-gradient(900px 380px at 80% -10%,#1E3A6E 0,var(--navy) 60%);padding:0 16px 40px}
        .au-top{max-width:460px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;height:70px;color:#fff}
        .au-box{max-width:460px;margin:8px auto 0;padding:24px;display:flex;flex-direction:column;gap:12px}.au-box h1{margin:0;font-size:24px}
        .au-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pin{letter-spacing:.4em;font-size:20px}
        .ph{display:flex;align-items:stretch}.ph b{display:flex;align-items:center;padding:0 10px;border:1.5px solid var(--line);border-right:0;border-radius:12px 0 0 12px;background:#F6F7FA;color:var(--ink)}.ph .inp{border-radius:0 12px 12px 0}
        .fo{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px}.fo button{display:flex;gap:8px;align-items:center;text-align:left;padding:10px;border-radius:12px;border:1.5px solid var(--line);background:#fff;font:600 13px inherit;font-family:inherit;color:var(--ink);cursor:pointer}.fo button span{font-size:20px}.fo button.on{border-color:var(--amber);background:var(--amber2)}
        .au-c{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:var(--soft)}.au-c input{margin-top:4px;width:18px;height:18px;flex:none}
        @media(max-width:420px){.au-2{grid-template-columns:1fr}}`}</style>
    </main>
  );
}
