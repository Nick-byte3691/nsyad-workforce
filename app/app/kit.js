'use client';
import { useEffect, useRef, useState } from 'react';
import qrcode from 'qrcode-generator';

// Small shared tools: voice typing, QR codes, camera scanner, printing, Excel paste, CSV download.
export const SPEECH = { en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', es: 'es-ES', fr: 'fr-FR', pt: 'pt-BR', id: 'id-ID', sw: 'sw-KE' };

// 🎤 Speak instead of typing (Chrome on Android and computers). Hidden where the phone cannot do it.
export function Mic({ onText, lang, t }) {
  const [ok, setOk] = useState(false); const [on, setOn] = useState(false); const rec = useRef(null);
  useEffect(() => { setOk(!!(window.SpeechRecognition || window.webkitSpeechRecognition)); }, []);
  if (!ok) return null;
  const go = () => {
    if (on && rec.current) { rec.current.stop(); return; }
    const R = window.SpeechRecognition || window.webkitSpeechRecognition; const r = new R();
    r.lang = SPEECH[lang] || 'en-IN'; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (e) => { const x = Array.from(e.results).map((a) => a[0].transcript).join(' ').trim(); if (x) onText(x); };
    r.onend = () => setOn(false); r.onerror = () => setOn(false);
    rec.current = r; setOn(true); try { r.start(); } catch { setOn(false); }
  };
  return <button type="button" className={'mic' + (on ? ' on' : '')} onClick={go} title={t ? t('voice') : 'Speak'} aria-label={t ? t('voice') : 'Speak'}>{on ? '⏺' : '🎤'}</button>;
}
// Text box with a 🎤 button: what you say is added to the text.
export function VInput({ value, onChange, lang, t, area, ...rest }) {
  const add = (x) => onChange(((value || '') + ' ' + x).trim());
  return <span className="vin">{area ? <textarea className="inp" value={value || ''} onChange={(e) => onChange(e.target.value)} rows={3} {...rest} /> : <input className="inp" value={value || ''} onChange={(e) => onChange(e.target.value)} {...rest} />}<Mic onText={add} lang={lang} t={t} /></span>;
}

export function qrSvg(text, cell = 4) {
  const q = qrcode(0, 'M'); q.addData(String(text)); q.make();
  return q.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
}
export function QR({ text, size = 120 }) {
  return <span style={{ display: 'inline-block', width: size, height: size }} dangerouslySetInnerHTML={{ __html: qrSvg(text) }} />;
}

// 📷 Camera scanner for QR codes and barcodes (uses the phone's built-in detector). Falls back to typing.
export function Scanner({ onCode, onClose, t }) {
  const vid = useRef(null); const [err, setErr] = useState(''); const [typed, setTyped] = useState('');
  useEffect(() => {
    let stream, timer, live = true;
    (async () => {
      try {
        if (!('BarcodeDetector' in window)) throw new Error('no');
        const det = new window.BarcodeDetector();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!live) return; vid.current.srcObject = stream; await vid.current.play();
        const tick = async () => { if (!live) return; try { const c = await det.detect(vid.current); if (c && c[0] && c[0].rawValue) { onCode(c[0].rawValue); return; } } catch {} timer = setTimeout(tick, 250); };
        tick();
      } catch { setErr(t('noScan')); }
    })();
    return () => { live = false; clearTimeout(timer); if (stream) stream.getTracks().forEach((x) => x.stop()); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="scan-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card scan">
        <b>📷 {t('scan')}</b>
        {err ? <p className="muted">{err}</p> : <><video ref={vid} playsInline muted /><p className="muted">{t('scanHelp')}</p></>}
        <form onSubmit={(e) => { e.preventDefault(); if (typed.trim()) onCode(typed.trim()); }} style={{ display: 'flex', gap: 8 }}><input className="inp" placeholder={t('code')} value={typed} onChange={(e) => setTyped(e.target.value)} /><button className="btn btn-dark">OK</button></form>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
      </div>
    </div>
  );
}

// Print a small HTML page (labels, gate pass) through a hidden frame.
export function printHtml(title, body) {
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(f);
  const d = f.contentWindow.document;
  d.open(); d.write('<!doctype html><html><head><meta charset="utf-8"><title>' + title + '</title><style>body{font-family:Arial,sans-serif;margin:16px;color:#111}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px;text-align:left;font-size:13px}.lbls{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.lbl{border:1px dashed #999;padding:8px;text-align:center;font-size:12px;page-break-inside:avoid}.lbl svg{width:110px;height:110px}h1{font-size:20px;margin:0 0 6px}.row{display:flex;justify-content:space-between;gap:16px}.sig{margin-top:40px;display:flex;justify-content:space-between}.sig span{border-top:1px solid #111;padding-top:4px;width:30%;text-align:center;font-size:12px}</style></head><body>' + body + '</body></html>'); d.close();
  setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch {} setTimeout(() => f.remove(), 2000); }, 300);
}
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Rows copied from Excel / Google Sheets (tab separated) or a CSV. Headings are matched by meaning.
const HEAD = [['name', /^(item|item ?name|name|material|product|description|सामान|नाम|মাল|nombre|art[ií]culo|article|nome|nama|bidhaa|jina)/i], ['code', /^(code|item ?code|sku|part ?no|कोड|c[oó]digo|kode|msimbo)/i], ['barcode', /^(barcode|ean|upc|बारकोड)/i], ['unit', /^(unit|uom|इकाई|unidad|unit[ée]|unidade|satuan|kipimo)/i], ['qty', /^(qty|quantity|stock|balance|मात्रा|स्टॉक|cantidad|quantit[ée]|quantidade|jumlah|idadi)/i], ['location', /^(rack|bin|location|place|shelf|रैक|जगह|estante|emplacement|rak)/i], ['min_qty', /^(min|minimum|reorder|re-order|alert)/i], ['rate', /^(rate|price|cost|दर|precio|prix|pre[cç]o|harga|bei)/i], ['category', /^(category|group|type|श्रेणी|categor|kategori|aina)/i]];
export function parsePaste(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (!lines.length) return { rows: [], cols: [] };
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const split = (l) => (sep === '\t' ? l.split('\t') : l.split(sep)).map((c) => c.replace(/^"|"$/g, '').trim());
  const first = split(lines[0]);
  let cols = first.map((h) => (HEAD.find(([, re]) => re.test(h)) || [null])[0]);
  let body = lines.slice(1);
  if (!cols.includes('name')) { cols = ['name', 'qty', 'unit', 'code', 'location'].slice(0, first.length); body = lines; }
  const rows = body.map((l) => { const c = split(l); const o = {}; cols.forEach((k, i) => { if (k && c[i] !== undefined && c[i] !== '') o[k] = c[i]; }); return o; }).filter((o) => o.name);
  return { rows, cols };
}
export function downloadCsv(name, head, rows) {
  const q = (v) => { const x = String(v == null ? '' : v); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + [head.join(','), ...rows.map((r) => r.map(q).join(','))].join('\n')], { type: 'text/csv' })); a.download = name; a.click();
}
export const KIT_CSS = `.vin{display:flex;gap:6px;align-items:flex-start}.vin .inp{flex:1}
.mic{flex:none;width:44px;height:44px;border-radius:12px;border:1.5px solid var(--line);background:#fff;font-size:18px;cursor:pointer}.mic.on{background:var(--red);border-color:var(--red);color:#fff;animation:mp 1s infinite}@keyframes mp{50%{opacity:.6}}
.scan-bg{position:fixed;inset:0;background:rgba(11,23,48,.7);z-index:80;display:grid;place-items:center;padding:16px}.scan{width:min(420px,100%);padding:16px;display:flex;flex-direction:column;gap:10px}.scan video{width:100%;border-radius:12px;background:#000;aspect-ratio:1;object-fit:cover}`;
