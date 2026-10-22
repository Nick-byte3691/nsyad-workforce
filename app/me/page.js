'use client';
import { useEffect, useState } from 'react';
import { Brand } from '../Brand';
import { useLang, LangSwitch } from '../../lib/i18n';
import { monthOf, daysInMonth } from '../../lib/calc';
import { money } from '../../lib/world';

// The worker's own page: his attendance calendar, overtime and money for the month. Read-only.
export default function Me() {
  const L = useLang(); const { t, lang, locale } = L; const hi = lang === 'hi';
  const [today, setToday] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(monthOf(today));
  const [cur, setCur] = useState('INR');
  const inr = (n) => money(n, cur);
  const todayIST = () => today;
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { setD(null); fetch('/api/ks?view=me&month=' + month, { cache: 'no-store' }).then(async (r) => { if (r.status === 401) { window.location.href = '/login'; return; } const j = await r.json(); if (!r.ok) setErr(j.error || 'Error'); else { setD(j); if (j.today) setToday(j.today); if (j.currency) setCur(j.currency); } }).catch(() => setErr('Error')); }, [month]);
  const logout = async () => { await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"action":"logout"}' }); window.location.href = '/login'; };
  const prev = () => { const [y, m] = month.split('-').map(Number); const d0 = new Date(Date.UTC(y, m - 2, 1)); setMonth(d0.toISOString().slice(0, 7)); };
  const next = () => { const [y, m] = month.split('-').map(Number); const d0 = new Date(Date.UTC(y, m, 1)); const n = d0.toISOString().slice(0, 7); if (n <= monthOf(todayIST())) setMonth(n); };
  const mName = new Date(month + '-01T12:00:00Z').toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const first = new Date(month + '-01T12:00:00Z').getUTCDay();
  const cells = []; for (let i = 0; i < first; i++) cells.push(null); for (let i = 1; i <= daysInMonth(month); i++) cells.push(month + '-' + String(i).padStart(2, '0'));
  return (
    <main className="me">
      <header className="me-top"><Brand light /><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><LangSwitch {...L} /><button type="button" className="me-out" onClick={logout}>{t('logout')}</button></div></header>
      <div className="me-w">
        {err ? <p className="err">{err}</p> : !d ? <p className="muted">{t('loading')}</p> : <>
          <section className="me-hero"><div className="me-av">{d.worker.name.trim().slice(0, 1)}</div><div><h1>{d.worker.name}</h1><p>{d.worker.code}{d.worker.skill ? ' · ' + d.worker.skill : ''}<br />{d.worker.company}{d.worker.site ? ' · ' + d.worker.site : ''}</p></div></section>
          <div className="me-m"><button type="button" onClick={prev} aria-label="Previous month">‹</button><b>{mName}</b><button type="button" onClick={next} aria-label="Next month" disabled={month >= monthOf(todayIST())}>›</button></div>
          <section className="card me-pay">
            <small>{t('myPay')}</small>
            <b className="me-big">{inr(d.pay.net)}</b><span className="muted">{t('net')}</span>
            <div className="me-rows">
              <span>{t('days')}: <b>{d.pay.days}</b> × {inr(d.worker.daily_wage)}</span><b>{inr(d.pay.wage)}</b>
              <span>OT: <b>{d.pay.ot} h</b> × {inr(d.worker.ot_rate)}</span><b>{inr(d.pay.otPay)}</b>
              <span>{t('adv')}</span><b className="neg">− {inr(d.pay.adv)}</b>
              <span>{t('paid')}</span><b className="neg">− {inr(d.pay.paid)}</b>
            </div>
          </section>
          <section className="card me-cal">
            <small>{t('myDays')}</small>
            <div className="me-sum"><span className="tag t-p">{t('present')} {d.pay.full}</span><span className="tag t-h">{t('half')} {d.pay.half}</span><span className="tag t-a">{t('absent')} {d.pay.absent}</span></div>
            <div className="cal">{[0, 1, 2, 3, 4, 5, 6].map((k) => { try { return new Date(Date.UTC(2024, 0, 7 + k)).toLocaleDateString(locale, { weekday: 'narrow', timeZone: 'UTC' }); } catch { return 'SMTWTFS'[k]; } }).map((x, i) => <i key={i}>{x}</i>)}
              {cells.map((c, i) => { if (!c) return <span key={'e' + i} />; const a = d.att.find((x) => x.day === c); return <span key={c} className={'c ' + (a ? 'c' + a.status : '') + (c === todayIST() ? ' now' : '')} title={a && a.ot_hours > 0 ? 'OT ' + a.ot_hours + ' h' : undefined}>{+c.slice(8)}{a && a.ot_hours > 0 ? <em>+{a.ot_hours}</em> : null}</span>; })}
            </div>
          </section>
          {d.money.length ? <section className="card me-cal"><small>{t('adv')} / {t('paid')}</small>{d.money.map((x, i) => <div key={i} className="me-ml"><span>{x.day.slice(8)}/{x.day.slice(5, 7)} · {x.kind === 'payment' ? t('paid') : t('adv')}{x.note ? ' · ' + x.note : ''}</span><b>{inr(x.amount)}</b></div>)}</section> : null}
          <section className="card me-help">
            <button type="button" className="btn" disabled>🤝 {t('help')}</button><span className="tag t-amb">{t('soon')}</span>
            <p>{t('helpNote')}</p>
          </section>
          <p className="muted" style={{ fontSize: 12.5, textAlign: 'center' }}>{t('talkNote')}</p>
        </>}
      </div>
      <style>{`.me{min-height:100vh;background:var(--bg)}.me-top{display:flex;justify-content:space-between;align-items:center;background:var(--navy);color:#fff;padding:0 16px;height:62px}
        .me-out{border:1px solid rgba(255,255,255,.2);background:none;color:#fff;border-radius:9px;padding:5px 10px;font-size:13px;cursor:pointer}
        .me-w{max-width:520px;margin:0 auto;padding:16px 14px 40px;display:flex;flex-direction:column;gap:12px}
        .me-hero{display:flex;gap:14px;align-items:center}.me-hero h1{margin:0;font-size:22px}.me-hero p{margin:2px 0 0;color:var(--soft);font-size:14px}
        .me-av{width:56px;height:56px;border-radius:16px;background:var(--navy);color:var(--amber);display:grid;place-items:center;font-size:24px;font-weight:700;flex:none}
        .me-m{display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid var(--line);border-radius:14px;padding:6px}.me-m button{border:0;background:#EEF1F6;width:40px;height:40px;border-radius:10px;font-size:22px;cursor:pointer}.me-m button:disabled{opacity:.4}
        .me-pay{padding:18px;background:var(--navy);color:#fff;border-color:var(--navy);display:flex;flex-direction:column}.me-pay small,.me-cal small{font-weight:600;color:#9FB0D0;font-size:12.5px}.me-cal small{color:var(--soft)}
        .me-big{font-size:38px;color:var(--amber);letter-spacing:-.02em}.me-pay .muted{color:#9FB0D0;font-size:13px}
        .me-rows{display:grid;grid-template-columns:1fr auto;gap:8px 12px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.12);font-size:14.5px}.me-rows .neg{color:#FCA5A5}
        .me-cal{padding:16px}.me-sum{display:flex;gap:6px;margin:8px 0 12px;flex-wrap:wrap}
        .cal{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;text-align:center}.cal i{font-style:normal;font-size:11.5px;color:var(--soft);font-weight:600}
        .cal .c{position:relative;aspect-ratio:1;border-radius:10px;background:#F2F4F8;display:grid;place-items:center;font-size:14px;font-weight:600;color:var(--soft)}
        .cal .cP{background:var(--green);color:#fff}.cal .cH{background:var(--amber);color:#1B1300}.cal .cA{background:#FBD5D5;color:var(--red)}.cal .now{outline:2px solid var(--navy)}
        .cal em{position:absolute;bottom:1px;right:3px;font-size:9px;font-style:normal;font-weight:700}
        .me-ml{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);font-size:14px}
        .me-help{padding:16px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;background:#FFFBF2;border-color:#F7D9A0}.me-help .btn{background:#fff;border-color:var(--line)}.me-help p{margin:0;flex-basis:100%;font-size:14px;color:#6B4700}`}</style>
    </main>
  );
}
