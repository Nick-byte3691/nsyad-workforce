'use client';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { money } from '../../lib/world';
import { Mic, VInput, QR, qrSvg, Scanner, printHtml, esc, parsePaste, downloadCsv, KIT_CSS } from './kit';

const get = async (q) => { const r = await fetch('/api/ops?' + q, { cache: 'no-store' }); if (r.status === 401) { window.location.href = '/login'; return null; } const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Error'); return d; };
const post = async (body) => { const r = await fetch('/api/ops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const d = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(d.error || 'Error'); e.code = d.code; throw e; } return d; };
function useOps(q) {
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  const load = useCallback(() => { setErr(''); get(q).then((x) => x && setD(x)).catch((e) => setErr(e.message)); }, [q]);
  useEffect(() => { load(); }, [load]);
  return [d, load, err];
}
const top = () => window.scrollTo({ top: 0, behavior: 'smooth' });
const fmtQ = (n) => (Math.round((Number(n) || 0) * 1000) / 1000).toLocaleString();

// ================= STOCK / WAREHOUSE =================
export function Stock({ t, lang, co }) {
  const [site, setSite] = useState('');
  const [d, load, err] = useOps('view=stock' + (site ? '&site=' + site : ''));
  const [q, setQ] = useState(''); const [f, setF] = useState(null); const [mv, setMv] = useState(null); const [paste, setPaste] = useState(null);
  const [scan, setScan] = useState(false); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [onlyLow, setOnlyLow] = useState(false);
  if (err) return <p className="err">{err}</p>;
  if (!d) return <p className="muted">{t('loading')}</p>;
  const cur = d.currency; const sname = (id) => (d.sites.find((x) => x.id === id) || {}).name || '—';
  const name = (id) => (d.items.find((x) => x.id === id) || {});
  const list = d.items.filter((i) => (i.active || q) && (!onlyLow || i.low) && (!q || (i.name + ' ' + i.code + ' ' + (i.barcode || '') + ' ' + (i.location || '') + ' ' + (i.category || '')).toLowerCase().includes(q.toLowerCase())));
  const lowN = d.items.filter((i) => i.low).length;
  const act = async (body, after) => { setBusy(true); setMsg(''); try { const r = await post(body); after && after(r); load(); } catch (x) { setMsg(x.code ? t(x.code) + ' ' + x.message : x.message); } setBusy(false); };
  const defSite = site || (d.sites[0] && d.sites[0].id) || '';
  const found = (code) => { setScan(false); const c = String(code).trim().toUpperCase(); const it = d.items.find((i) => i.code.toUpperCase() === c || (i.barcode || '').toUpperCase() === c); if (it) { setQ(it.code); setMv({ item: it, kind: 'out', site_id: defSite, qty: '', party: '', ref: '', note: '' }); top(); } else { setQ(code); setMsg(t('notFound')); } };
  const labels = (rows) => printHtml('QR labels', '<div class="lbls">' + rows.map((i) => '<div class="lbl">' + qrSvg(i.code, 3) + '<div><b>' + esc(i.code) + '</b></div><div>' + esc(i.name) + '</div><div>' + esc(i.location || '') + '</div></div>').join('') + '</div>');
  const csv = () => downloadCsv('nsyad-stock-' + d.today + '.csv', ['Code', 'Name', 'Unit', 'Category', 'Rack', ...d.sites.map((x) => x.name), 'Total', 'Min', 'Rate', 'Value', 'Barcode'], d.items.map((i) => [i.code, i.name, i.unit, i.category, i.location, ...i.per.map((p) => p.qty), i.per.reduce((a, p) => a + p.qty, 0), i.min_qty, i.rate, Math.round(i.per.reduce((a, p) => a + p.qty, 0) * i.rate * 100) / 100, i.barcode]));
  const pp = paste ? parsePaste(paste.text) : null;
  return (<>
    <div className="hero-img" style={{ backgroundImage: 'url(/img/stock-sm.webp)' }} />
    <div className="pg-h"><div><h1>📦 {t('stock')}</h1><p className="muted">{d.items.filter((i) => i.active).length} {t('items')}</p></div>
      <div className="tb2"><button type="button" className="btn btn-main" onClick={() => { setF({ unit: 'pcs', site_id: defSite }); setMv(null); setPaste(null); setMsg(''); }}>＋ {t('addItem')}</button></div></div>
    <div className="bar2">
      <select className="inp" value={site} onChange={(e) => setSite(e.target.value)}><option value="">{t('allSites')}</option>{d.sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <span className="vin"><input className="inp" placeholder={'🔎 ' + t('search')} value={q} onChange={(e) => setQ(e.target.value)} /><Mic onText={setQ} lang={lang} t={t} /><button type="button" className="mic" onClick={() => setScan(true)} title={t('scan')}>📷</button></span>
    </div>
    <div className="tools2">
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setPaste({ text: '', site_id: defSite, ref: '' }); setF(null); setMv(null); setMsg(''); }}>📋 {t('pasteExcel')}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => labels(list)} disabled={!list.length}>🏷️ {t('labels')}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={csv} disabled={!d.items.length}>⬇ {t('downloadCsv')}</button>
      {lowN ? <button type="button" className={'btn btn-sm ' + (onlyLow ? 'btn-dark' : 'btn-ghost')} onClick={() => setOnlyLow(!onlyLow)}>⚠️ {t('lowStock')} ({lowN})</button> : null}
    </div>
    {msg ? <p className="err">{msg}</p> : null}
    {f ? <form className="card pad form" onSubmit={(e) => { e.preventDefault(); act({ action: 'item_save', ...f }, () => setF(null)); }}>
      <h2>{f.id ? t('edit') + ': ' + f.code : t('addItem')}</h2>
      <div className="fg">
        <label className="lbl">{t('itemName')}<VInput value={f.name} onChange={(v) => setF({ ...f, name: v })} lang={lang} t={t} required maxLength={80} /></label>
        <label className="lbl">{t('unit')}<input className="inp" list="units" value={f.unit || ''} onChange={(e) => setF({ ...f, unit: e.target.value })} /></label>
        {!f.id ? <label className="lbl">{t('code')}<input className="inp" placeholder="I-001" value={f.code || ''} onChange={(e) => setF({ ...f, code: e.target.value })} /></label> : null}
        <label className="lbl">{t('location')}<input className="inp" value={f.location || ''} onChange={(e) => setF({ ...f, location: e.target.value })} /></label>
        <label className="lbl">{t('category')}<input className="inp" value={f.category || ''} onChange={(e) => setF({ ...f, category: e.target.value })} /></label>
        <label className="lbl">{t('minQty')}<input className="inp" inputMode="decimal" value={f.min_qty || ''} onChange={(e) => setF({ ...f, min_qty: e.target.value })} /></label>
        <label className="lbl">{t('rate')} ({cur})<input className="inp" inputMode="decimal" value={f.rate || ''} onChange={(e) => setF({ ...f, rate: e.target.value })} /></label>
        <label className="lbl">{t('barcode')}<input className="inp" value={f.barcode || ''} onChange={(e) => setF({ ...f, barcode: e.target.value })} /></label>
        {!f.id ? <><label className="lbl">{t('site')}<select className="inp" value={f.site_id} onChange={(e) => setF({ ...f, site_id: e.target.value })}>{d.sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="lbl">{t('opening')}<input className="inp" inputMode="decimal" value={f.opening || ''} onChange={(e) => setF({ ...f, opening: e.target.value })} /></label></> : null}
      </div>
      <datalist id="units">{d.units.map((u) => <option key={u} value={u} />)}</datalist>
      <div className="fa"><button type="button" className="btn btn-ghost" onClick={() => setF(null)}>{t('cancel')}</button><button className="btn btn-main" disabled={busy}>{t('save')}</button></div>
    </form> : null}
    {mv ? <form className="card pad form" onSubmit={(e) => { e.preventDefault(); act(mv.kind === 'transfer' ? { action: 'transfer', item_id: mv.item.id, from: mv.site_id, to: mv.to, qty: mv.qty } : { action: 'move_add', item_id: mv.item.id, ...mv }, () => setMv(null)); }}>
      <div className="mvh"><QR text={mv.item.code} size={56} /><div><h2>{mv.item.name}</h2><small className="muted">{mv.item.code} · {t('inStock')}: {fmtQ(mv.item.qty)} {mv.item.unit}</small></div></div>
      <div className="seg4">{[['in', '⬇ ' + t('mvIn')], ['out', '⬆ ' + t('mvOut')], ['transfer', '⇄ ' + t('mvTransfer')], ['adjust', '± ' + t('mvAdjust')]].map(([k, l]) => <button key={k} type="button" className={mv.kind === k ? 'on k-' + k : ''} onClick={() => setMv({ ...mv, kind: k })}>{l}</button>)}</div>
      <div className="fg">
        <label className="lbl">{mv.kind === 'transfer' ? t('site') + ' ⬆' : t('site')}<select className="inp" value={mv.site_id} onChange={(e) => setMv({ ...mv, site_id: e.target.value })}>{d.sites.map((x) => <option key={x.id} value={x.id}>{x.name} ({fmtQ((mv.item.per.find((p) => p.site === x.id) || {}).qty)})</option>)}</select></label>
        {mv.kind === 'transfer' ? <label className="lbl">{t('toSite')}<select className="inp" value={mv.to || ''} onChange={(e) => setMv({ ...mv, to: e.target.value })}><option value="">—</option>{d.sites.filter((x) => x.id !== mv.site_id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label> : null}
        <label className="lbl">{t('qty')} ({mv.item.unit})<input className="inp big" required inputMode="decimal" autoFocus value={mv.qty} onChange={(e) => setMv({ ...mv, qty: e.target.value })} />{mv.kind === 'adjust' ? <small className="muted" style={{ fontWeight: 400 }}>{t('adjustHint')}</small> : null}</label>
        {mv.kind === 'in' || mv.kind === 'out' ? <><label className="lbl">{t('fromWho')}<VInput value={mv.party} onChange={(v) => setMv({ ...mv, party: v })} lang={lang} t={t} maxLength={80} /></label>
          <label className="lbl">{t('refNo')}<input className="inp" value={mv.ref} onChange={(e) => setMv({ ...mv, ref: e.target.value })} /></label></> : null}
        <label className="lbl">{t('note')}<VInput value={mv.note} onChange={(v) => setMv({ ...mv, note: v })} lang={lang} t={t} maxLength={200} /></label>
      </div>
      <div className="fa"><button type="button" className="btn btn-ghost" onClick={() => setMv(null)}>{t('cancel')}</button><button className="btn btn-main" disabled={busy}>{t('save')}</button></div>
    </form> : null}
    {paste ? <div className="card pad form">
      <h2>📋 {t('pasteExcel')}</h2>
      <p className="muted" style={{ margin: 0 }}>{t('pasteHelp')}</p>
      <div className="fg"><label className="lbl">{t('site')}<select className="inp" value={paste.site_id} onChange={(e) => setPaste({ ...paste, site_id: e.target.value })}>{d.sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="lbl">{t('refNo')}<input className="inp" value={paste.ref} onChange={(e) => setPaste({ ...paste, ref: e.target.value })} /></label></div>
      <textarea className="inp pastebox" rows={7} placeholder={'Name\tUnit\tQty\tRack\nCement 50kg\tbag\t120\tA-1'} value={paste.text} onChange={(e) => setPaste({ ...paste, text: e.target.value })} />
      {pp && pp.rows.length ? <><b>{t('preview')}</b><div className="scroll"><table className="tb"><thead><tr>{['name', 'code', 'unit', 'qty', 'location', 'min_qty', 'rate', 'category'].map((k) => <th key={k}>{k}</th>)}</tr></thead><tbody>{pp.rows.slice(0, 8).map((r, i) => <tr key={i}>{['name', 'code', 'unit', 'qty', 'location', 'min_qty', 'rate', 'category'].map((k) => <td key={k}>{r[k] || ''}</td>)}</tr>)}</tbody></table></div>{pp.rows.length > 8 ? <small className="muted">+ {pp.rows.length - 8}</small> : null}</> : null}
      <div className="fa"><button type="button" className="btn btn-ghost" onClick={() => setPaste(null)}>{t('cancel')}</button><button type="button" className="btn btn-main" disabled={busy || !pp || !pp.rows.length} onClick={() => act({ action: 'item_import', site_id: paste.site_id, ref: paste.ref, rows: pp.rows }, (r) => { setPaste(null); setMsg(''); alert(t('imported', { a: r.made, b: r.upd, c: r.moved })); })}>{t('importN', { n: pp ? pp.rows.length : 0 })}</button></div>
    </div> : null}
    {scan ? <Scanner t={t} onCode={found} onClose={() => setScan(false)} /> : null}
    {!list.length ? <p className="muted">{t('nothing')}</p> : <div className="il">{list.map((i) => (
      <div key={i.id} className={'card ic' + (i.low ? ' low' : '') + (i.active ? '' : ' off')}>
        <div className="ii"><b>{i.name}</b><small className="muted">{i.code}{i.location ? ' · 📍' + i.location : ''}{i.category ? ' · ' + i.category : ''}</small>
          {i.low ? <span className="tag t-a">⚠️ {t('lowStock')}</span> : null}{!site && d.sites.length > 1 ? <small className="muted ps">{i.per.filter((p) => p.qty).map((p) => sname(p.site) + ': ' + fmtQ(p.qty)).join(' · ')}</small> : null}</div>
        <div className="iq"><b>{fmtQ(i.qty)}</b><small>{i.unit}</small></div>
        <div className="ib"><button type="button" className="btn btn-sm k-in" onClick={() => { setMv({ item: i, kind: 'in', site_id: defSite, qty: '', party: '', ref: '', note: '' }); setF(null); top(); }}>⬇ {t('mvIn')}</button>
          <button type="button" className="btn btn-sm k-out" onClick={() => { setMv({ item: i, kind: 'out', site_id: defSite, qty: '', party: '', ref: '', note: '' }); setF(null); top(); }}>⬆ {t('mvOut')}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setF({ ...i, min_qty: String(i.min_qty || ''), rate: String(i.rate || '') }); setMv(null); top(); }}>{t('edit')}</button></div>
      </div>))}</div>}
    {d.recent.length ? <section className="card pad" style={{ marginTop: 14 }}><h2>{t('history')}</h2><div className="scroll"><table className="tb"><tbody>{d.recent.slice(0, 60).map((m) => { const it = name(m.item_id); return (
      <tr key={m.id}><td className="muted" style={{ whiteSpace: 'nowrap' }}>{m.day.slice(5)}</td><td><span className={'tag ' + (m.kind === 'in' ? 't-p' : m.kind === 'out' ? 't-a' : 't-h')}>{m.kind === 'in' ? t('mvIn') : m.kind === 'out' ? t('mvOut') : '±'}</span></td><td><b>{it.name}</b><br /><small className="muted">{sname(m.site_id)}{m.party ? ' · ' + m.party : ''}{m.ref ? ' · ' + m.ref : ''}{m.note ? ' · ' + m.note : ''}</small></td><td className="r"><b>{fmtQ(m.qty)}</b> {it.unit}</td>
        {d.owner ? <td className="r"><button type="button" className="link" onClick={() => { if (confirm(t('delEntry'))) act({ action: 'move_del', id: m.id }); }}>✕</button></td> : null}</tr>); })}</tbody></table></div></section> : null}
    <style>{KIT_CSS + OPS_CSS}</style>
  </>);
}

// ================= GATE PASS =================
const PK = ['out_ret', 'out', 'in', 'vehicle', 'visitor'];
const PK_ICON = { out_ret: '↩️', out: '⬆️', in: '⬇️', vehicle: '🚚', visitor: '🧑' };
export function Gate({ t, lang, co, openToken }) {
  const [d, load, err] = useOps('view=passes');
  const [f, setF] = useState(null); const [scan, setScan] = useState(false); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [show, setShow] = useState('open'); const [hl, setHl] = useState(openToken || '');
  if (err) return <p className="err">{err}</p>;
  if (!d) return <p className="muted">{t('loading')}</p>;
  const act = async (body, after) => { setBusy(true); setMsg(''); try { const r = await post(body); after && after(r); load(); } catch (x) { setMsg(x.message); } setBusy(false); };
  const sname = (id) => (d.sites.find((x) => x.id === id) || {}).name || '—';
  const list = d.passes.filter((p) => (hl ? p.token === hl : show === 'all' || p.status === 'open' || p.status === 'out'));
  const material = (k) => ['out_ret', 'out', 'in'].includes(k);
  const late = (p) => p.kind === 'out_ret' && p.status === 'out' && p.expected && p.expected < d.today;
  const passUrl = (p) => window.location.origin + '/app?pass=' + p.token;
  const print = (p) => printHtml('GP-' + p.no, '<div class="row"><div><h1>' + esc(co.name) + '</h1><b>GATE PASS GP-' + String(p.no).padStart(4, '0') + '</b><br>' + esc(t('k_' + p.kind)) + '<br>' + esc(sname(p.site_id)) + ' · ' + new Date(p.created_at).toLocaleString() + '</div><div>' + qrSvg(passUrl(p), 3) + '</div></div>'
    + '<p><b>' + esc(t('party')) + ':</b> ' + esc(p.party) + (p.phone ? ' · ' + esc(p.phone) : '') + (p.vehicle ? '<br><b>' + esc(t('vehicleNo')) + ':</b> ' + esc(p.vehicle) : '') + (p.purpose ? '<br><b>' + esc(t('purpose')) + ':</b> ' + esc(p.purpose) : '') + (p.expected ? '<br><b>' + esc(t('returnBy')) + ':</b> ' + esc(p.expected) : '') + '</p>'
    + (p.lines.length ? '<table><tr><th>#</th><th>' + esc(t('itemName')) + '</th><th>' + esc(t('qty')) + '</th></tr>' + p.lines.map((l, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(l.name) + '</td><td>' + esc(l.qty + ' ' + (l.unit || '')) + '</td></tr>').join('') + '</table>' : '')
    + '<div class="sig"><span>Issued by</span><span>Security / gate</span><span>Receiver</span></div>');
  const found = (code) => { setScan(false); const m = String(code).match(/pass=([a-f0-9]{24})/); if (m) setHl(m[1]); else setMsg(t('notFound')); };
  const addLine = () => setF({ ...f, lines: [...f.lines, { item_id: '', name: '', qty: '', unit: '' }] });
  const setLine = (i, patch) => setF({ ...f, lines: f.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  return (<>
    <div className="hero-img" style={{ backgroundImage: 'url(/img/gate-sm.webp)' }} />
    <div className="pg-h"><div><h1>🚚 {t('gate')}</h1></div><div className="tb2"><button type="button" className="btn btn-ghost" onClick={() => setScan(true)}>📷 {t('scan')}</button><button type="button" className="btn btn-main" onClick={() => { setF({ kind: 'out_ret', site_id: d.sites[0] && d.sites[0].id, party: '', phone: '', vehicle: '', purpose: '', expected: '', lines: [{ item_id: '', name: '', qty: '', unit: '' }] }); setMsg(''); setHl(''); }}>＋ {t('newPass')}</button></div></div>
    {msg ? <p className="err">{msg}</p> : null}
    {f ? <form className="card pad form" onSubmit={(e) => { e.preventDefault(); act({ action: 'pass_save', ...f, lines: material(f.kind) ? f.lines : [] }, (r) => { setF(null); if (r.pass) setHl(r.pass.token); }); }}>
      <h2>{t('newPass')}</h2>
      <div className="pk">{PK.map((k) => <button key={k} type="button" className={f.kind === k ? 'on' : ''} onClick={() => setF({ ...f, kind: k })}><span>{PK_ICON[k]}</span>{t('k_' + k)}</button>)}</div>
      <div className="fg">
        <label className="lbl">{t('site')}<select className="inp" value={f.site_id} onChange={(e) => setF({ ...f, site_id: e.target.value })}>{d.sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="lbl">{t('party')}<VInput value={f.party} onChange={(v) => setF({ ...f, party: v })} lang={lang} t={t} required maxLength={80} /></label>
        <label className="lbl">{t('phone')}<input className="inp" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        <label className="lbl">{t('vehicleNo')}<input className="inp" value={f.vehicle} onChange={(e) => setF({ ...f, vehicle: e.target.value })} /></label>
        <label className="lbl">{t('purpose')}<VInput value={f.purpose} onChange={(v) => setF({ ...f, purpose: v })} lang={lang} t={t} maxLength={200} /></label>
        {f.kind === 'out_ret' ? <label className="lbl">{t('returnBy')}<input className="inp" type="date" value={f.expected} min={d.today} onChange={(e) => setF({ ...f, expected: e.target.value })} /></label> : null}
      </div>
      {material(f.kind) ? <div className="lines"><b>{t('items')}</b>{f.lines.map((l, i) => (
        <div key={i} className="ln">
          <select className="inp" value={l.item_id} onChange={(e) => { const it = d.items.find((x) => x.id === e.target.value); setLine(i, it ? { item_id: it.id, name: it.name, unit: it.unit } : { item_id: '' }); }}><option value="">— {t('fromStock')} —</option>{d.items.map((x) => <option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select>
          {!l.item_id ? <VInput value={l.name} onChange={(v) => setLine(i, { name: v })} lang={lang} t={t} placeholder={t('itemName')} maxLength={80} /> : <span className="lnn">{l.name}</span>}
          <input className="inp" inputMode="decimal" placeholder={t('qty')} value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
          <input className="inp" placeholder={t('unit')} value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })} />
          <button type="button" className="link" onClick={() => setF({ ...f, lines: f.lines.filter((_, j) => j !== i) })}>✕</button>
        </div>))}<button type="button" className="btn btn-ghost btn-sm" onClick={addLine}>＋ {t('addLine')}</button></div> : null}
      <div className="fa"><button type="button" className="btn btn-ghost" onClick={() => setF(null)}>{t('cancel')}</button><button className="btn btn-main" disabled={busy}>{t('save')}</button></div>
    </form> : null}
    {scan ? <Scanner t={t} onCode={found} onClose={() => setScan(false)} /> : null}
    <div className="tools2">{hl ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setHl('')}>← {t('passesOpen')}</button> : [['open', t('passesOpen')], ['all', t('allSites').replace(/.*/, '∑')]].map(([k, l]) => <button key={k} type="button" className={'btn btn-sm ' + (show === k ? 'btn-dark' : 'btn-ghost')} onClick={() => setShow(k)}>{k === 'all' ? '📚 ' + t('history') : l}</button>)}</div>
    {!list.length ? <p className="muted">{t('nothing')}</p> : <div className="pl">{list.map((p) => (
      <div key={p.id} className={'card pc s-' + p.status + (late(p) ? ' late' : '') + (hl === p.token ? ' hl' : '')}>
        <div className="pch"><b>{PK_ICON[p.kind]} GP-{String(p.no).padStart(4, '0')}</b><span className={'tag ' + (p.status === 'open' ? 't-amb' : p.status === 'out' ? 't-h' : p.status === 'closed' ? 't-p' : 't-n')}>{t('s_' + p.status)}</span>{late(p) ? <span className="tag t-a">⏰ {p.expected}</span> : null}</div>
        <div className="pcb"><b>{p.party}</b><small className="muted">{t('k_' + p.kind)} · {sname(p.site_id)}{p.vehicle ? ' · 🚚 ' + p.vehicle : ''} · {new Date(p.created_at).toLocaleDateString()}</small>
          {p.lines.length ? <small>{p.lines.map((l) => l.name + ' × ' + l.qty + (l.unit ? ' ' + l.unit : '')).join(', ')}</small> : null}{p.purpose ? <small className="muted">{p.purpose}</small> : null}</div>
        <div className="pca">
          {p.status === 'open' ? (p.kind === 'in' ? <button type="button" className="btn btn-sm k-in" disabled={busy} onClick={() => act({ action: 'pass_status', id: p.id, status: 'closed' })}>⬇ {t('markIn')}</button> : <button type="button" className="btn btn-sm k-out" disabled={busy} onClick={() => act({ action: 'pass_status', id: p.id, status: 'out' })}>⬆ {t('markOut')}</button>) : null}
          {p.status === 'out' ? <button type="button" className="btn btn-sm k-in" disabled={busy} onClick={() => act({ action: 'pass_status', id: p.id, status: 'closed' })}>{p.kind === 'out_ret' ? '↩ ' + t('markBack') : '✓ ' + t('markDone')}</button> : null}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => print(p)}>🖨️ {t('printPass')}</button>
          {p.status === 'open' ? <button type="button" className="link" onClick={() => { if (confirm(t('s_cancelled') + '?')) act({ action: 'pass_status', id: p.id, status: 'cancelled' }); }}>{t('cancel')}</button> : null}
        </div>
      </div>))}</div>}
    <style>{KIT_CSS + OPS_CSS}</style>
  </>);
}

// ================= MACHINES =================
export function Machines({ t, lang, co }) {
  const [d, load, err] = useOps('view=machines');
  const [f, setF] = useState(null); const [lg, setLg] = useState(null); const [open, setOpen] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  if (err) return <p className="err">{err}</p>;
  if (!d) return <p className="muted">{t('loading')}</p>;
  const cur = d.currency; const sname = (id) => (d.sites.find((x) => x.id === id) || {}).name || '—';
  const act = async (body, after) => { setBusy(true); setMsg(''); try { await post(body); after && after(); load(); } catch (x) { setMsg(x.message); } setBusy(false); };
  const sorted = [...d.machines].sort((a, b) => (b.status === 'down') - (a.status === 'down') || (b.overdue - a.overdue) || a.code.localeCompare(b.code));
  return (<>
    <div className="hero-img" style={{ backgroundImage: 'url(/img/machines-sm.webp)' }} />
    <div className="pg-h"><div><h1>⚙️ {t('machines')}</h1><p className="muted">{d.machines.filter((m) => m.status === 'down').length} {t('down')} · {d.machines.filter((m) => m.overdue).length} {t('overdue')}</p></div>
      <button type="button" className="btn btn-main" onClick={() => { setF({ site_id: d.sites[0] && d.sites[0].id, every_days: '90' }); setLg(null); setMsg(''); }}>＋ {t('addMachine')}</button></div>
    {msg ? <p className="err">{msg}</p> : null}
    {f ? <form className="card pad form" onSubmit={(e) => { e.preventDefault(); act({ action: 'machine_save', ...f }, () => setF(null)); }}>
      <h2>{f.id ? t('edit') + ': ' + f.code : t('addMachine')}</h2>
      <div className="fg">
        <label className="lbl">{t('name')}<VInput value={f.name} onChange={(v) => setF({ ...f, name: v })} lang={lang} t={t} required maxLength={80} /></label>
        <label className="lbl">{t('site')}<select className="inp" value={f.site_id} onChange={(e) => setF({ ...f, site_id: e.target.value })}>{d.sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="lbl">{t('make')}<input className="inp" value={f.make || ''} onChange={(e) => setF({ ...f, make: e.target.value })} /></label>
        <label className="lbl">{t('serial')}<input className="inp" value={f.serial || ''} onChange={(e) => setF({ ...f, serial: e.target.value })} /></label>
        <label className="lbl">{t('everyDays')}<input className="inp" inputMode="numeric" value={f.every_days || ''} onChange={(e) => setF({ ...f, every_days: e.target.value.replace(/\D/g, '') })} /></label>
        <label className="lbl">{t('lastService')}<input className="inp" type="date" max={d.today} value={f.last_service || ''} onChange={(e) => setF({ ...f, last_service: e.target.value })} /></label>
      </div>
      <div className="fa"><button type="button" className="btn btn-ghost" onClick={() => setF(null)}>{t('cancel')}</button><button className="btn btn-main" disabled={busy}>{t('save')}</button></div>
    </form> : null}
    {lg ? <form className="card pad form" onSubmit={(e) => { e.preventDefault(); act({ action: 'mlog_add', ...lg }, () => setLg(null)); }}>
      <h2>{lg.mname}</h2>
      <div className="seg4">{['breakdown', 'repair', 'service', 'check'].map((k) => <button key={k} type="button" className={lg.kind === k ? 'on k-' + (k === 'breakdown' ? 'out' : k === 'check' ? 'adjust' : 'in') : ''} onClick={() => setLg({ ...lg, kind: k })}>{t('l_' + k)}</button>)}</div>
      <div className="fg">
        <label className="lbl" style={{ gridColumn: '1/-1' }}>{t('note')}<VInput area value={lg.note} onChange={(v) => setLg({ ...lg, note: v })} lang={lang} t={t} maxLength={400} /></label>
        <label className="lbl">{t('date')}<input className="inp" type="date" max={d.today} value={lg.day} onChange={(e) => setLg({ ...lg, day: e.target.value })} /></label>
        {lg.kind !== 'check' ? <><label className="lbl">{t('cost')} ({cur})<input className="inp" inputMode="decimal" value={lg.cost} onChange={(e) => setLg({ ...lg, cost: e.target.value })} /></label>
          <label className="lbl">{t('hoursDown')}<input className="inp" inputMode="decimal" value={lg.hours_down} onChange={(e) => setLg({ ...lg, hours_down: e.target.value })} /></label></> : null}
      </div>
      <div className="fa"><button type="button" className="btn btn-ghost" onClick={() => setLg(null)}>{t('cancel')}</button><button className="btn btn-main" disabled={busy}>{t('save')}</button></div>
    </form> : null}
    {!sorted.length ? <p className="muted">{t('nothing')}</p> : <div className="ml">{sorted.map((m) => { const logs = d.logs.filter((l) => l.machine_id === m.id); return (
      <div key={m.id} className={'card mc' + (m.status === 'down' ? ' down' : m.overdue ? ' due' : '')}>
        <div className="mch"><div><b>{m.name}</b><small className="muted">{m.code} · {sname(m.site_id)}{m.make ? ' · ' + m.make : ''}</small></div>
          <span className={'tag ' + (m.status === 'down' ? 't-a' : 't-p')}>{m.status === 'down' ? '🔴 ' + t('down') : '🟢 ' + t('running')}</span></div>
        <div className="mcs">{m.due ? <span className={m.overdue ? 'err' : 'muted'}>{m.overdue ? '⏰ ' + t('overdue') : t('nextDue')}: {m.due}</span> : null}{m.last_service ? <span className="muted">{t('lastService')}: {m.last_service}</span> : null}</div>
        <div className="pca"><button type="button" className="btn btn-sm btn-dark" onClick={() => { setLg({ machine_id: m.id, mname: m.code + ' · ' + m.name, kind: m.status === 'down' ? 'repair' : 'breakdown', note: '', cost: '', hours_down: '', day: d.today }); setF(null); top(); }}>＋ {t('addLog')}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setF({ ...m, every_days: String(m.every_days || '') }); setLg(null); top(); }}>{t('edit')}</button>
          {logs.length ? <button type="button" className="link" onClick={() => setOpen(open === m.id ? '' : m.id)}>{t('history')} ({logs.length})</button> : null}</div>
        {open === m.id ? <div className="mlog">{logs.map((l) => <div key={l.id}><b>{l.day}</b> · {t('l_' + l.kind)}{Number(l.cost) ? ' · ' + money(l.cost, cur) : ''}{Number(l.hours_down) ? ' · ' + l.hours_down + ' h' : ''}{l.note ? <><br /><span className="muted">{l.note}</span></> : null}</div>)}</div> : null}
      </div>); })}</div>}
    <style>{KIT_CSS + OPS_CSS}</style>
  </>);
}

// ================= YOUR DATA (owner) =================
export function DataCard({ t, co }) {
  const [busy, setBusy] = useState(false);
  const del = async () => {
    const name = prompt(t('deleteAsk') + '\n\n' + co.name);
    if (name === null) return;
    setBusy(true);
    try { await post({ action: 'company_delete', confirm: name }); window.location.href = '/'; } catch (x) { alert(x.message); setBusy(false); }
  };
  return (<section className="card pad datac">
    <h2>🔒 {t('yourData')}</h2>
    <p>{t('dataNote')}</p>
    <div className="pca"><a className="btn btn-dark" href="/api/ops?view=export">⬇ {t('downloadAll')}</a><button type="button" className="btn btn-ghost delb" disabled={busy} onClick={del}>🗑️ {t('deleteCo')}</button></div>
  </section>);
}

const OPS_CSS = `
.hero-img{height:150px;border-radius:18px;background:center/cover no-repeat #0B1730;margin-bottom:14px;box-shadow:0 10px 30px -18px rgba(11,23,48,.6)}@media(min-width:900px){.hero-img{height:190px}}
.form{min-width:0}.form>*{min-width:0;max-width:100%}
.tb2{display:flex;gap:8px;flex-wrap:wrap}.bar2{display:grid;grid-template-columns:220px 1fr;gap:10px;margin-bottom:8px}.tools2{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.big{font-size:22px;font-weight:700}.mvh{display:flex;gap:12px;align-items:center}.mvh h2{margin:0}
.seg4{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;background:#EEF1F6;border-radius:12px;padding:4px}.seg4 button{border:0;background:none;border-radius:9px;padding:10px 6px;font-weight:700;font-size:13.5px;cursor:pointer;color:var(--soft)}
.seg4 .on.k-in{background:var(--green);color:#fff}.seg4 .on.k-out{background:var(--red);color:#fff}.seg4 .on.k-transfer{background:var(--blue);color:#fff}.seg4 .on.k-adjust{background:var(--amber);color:#1B1300}
.btn.k-in{background:var(--green2);color:var(--green);border-color:#BFE8CB}.btn.k-out{background:var(--red2);color:var(--red);border-color:#F6C9C9}
.pastebox{font-family:ui-monospace,Consolas,monospace;font-size:13px}
.il{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:10px}
.ic{display:grid;grid-template-columns:1fr auto;gap:8px 12px;padding:12px 14px;border-left:5px solid var(--green)}.ic.low{border-left-color:var(--red);background:#FFFBFB}.ic.off{opacity:.55}
.ii{display:flex;flex-direction:column;gap:3px;min-width:0}.ii small{font-size:12.5px}.ii .tag{align-self:flex-start}.ps{font-size:12px}
.iq{text-align:right}.iq b{display:block;font-size:24px;letter-spacing:-.02em}.iq small{color:var(--soft);font-size:12px}
.ib{grid-column:1/-1;display:flex;gap:6px}.ib .btn{flex:1}
.pk{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}.pk button{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;border-radius:12px;border:1.5px solid var(--line);background:#fff;font-weight:600;font-size:12.5px;cursor:pointer;text-align:center}.pk button span{font-size:20px}.pk button.on{border-color:var(--amber);background:var(--amber2)}
.lines{display:flex;flex-direction:column;gap:8px}.ln{display:grid;grid-template-columns:1.2fr 1.4fr 90px 80px auto;gap:6px;align-items:center}.lnn{font-weight:600;font-size:14px}
.pl,.ml{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:10px}
.pc,.mc{padding:12px 14px;display:flex;flex-direction:column;gap:8px;border-left:5px solid #D5DBE5}.pc.s-open{border-left-color:var(--amber)}.pc.s-out{border-left-color:var(--half)}.pc.s-closed{border-left-color:var(--green);opacity:.8}.pc.late{border-left-color:var(--red);background:#FFFBFB}.pc.hl{box-shadow:0 0 0 3px var(--amber)}
.pch{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.pch b{font-size:15px;margin-right:auto}.pcb{display:flex;flex-direction:column;gap:2px}.pcb small{font-size:13px}
.pca{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.mc.down{border-left-color:var(--red);background:#FFFBFB}.mc.due{border-left-color:var(--amber)}.mch{display:flex;justify-content:space-between;gap:8px}.mch small{display:block;font-size:12.5px}.mcs{display:flex;gap:12px;flex-wrap:wrap;font-size:13px}
.mlog{display:flex;flex-direction:column;gap:6px;font-size:13px;border-top:1px solid var(--line);padding-top:8px}
.datac p{color:var(--soft);font-size:14px;line-height:1.6}.delb{color:var(--red);border-color:#F6C9C9}
@media(max-width:620px){.bar2{grid-template-columns:1fr}.il,.pl,.ml{grid-template-columns:1fr}.pk{grid-template-columns:repeat(3,1fr)}.seg4{grid-template-columns:1fr 1fr}.ln{grid-template-columns:1fr 1fr;border-bottom:1px dashed var(--line);padding-bottom:8px}.ln select,.ln .vin,.ln .lnn{grid-column:1/-1}}
`;
