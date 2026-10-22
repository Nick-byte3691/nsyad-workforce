'use client';
import Link from 'next/link';
import { Brand } from './Brand';
import { useLang, LangSwitch } from '../lib/i18n';

export default function Landing() {
  const L = useLang(); const { t } = L;
  const F = [['🕘', 'f1'], ['💰', 'f2'], ['📊', 'f3'], ['🧑‍🔧', 'f4'], ['📱', 'f5'], ['🔒', 'f6']];
  const LIVE = [['📦', 'stock', 'godownSub', 'stock'], ['🚚', 'gate', 'gateSub', 'gate'], ['⚙️', 'machines', 'machinesSub', 'machines'], ['🎤', 'voice', 'pasteExcel']];
  const SOON = [['🤝', 'help', 'helpFamily']];
  return (
    <main>
      <header className="lp-top"><div className="lp-w"><Brand light /><nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}><LangSwitch {...L} /><Link href="/login" className="btn btn-ghost btn-sm">{t('login')}</Link></nav></div></header>
      <section className="lp-hero"><div className="lp-w">
        <p className="lp-k">{t('lpKicker')}</p>
        <h1>{t('lpH1a')} <span>{t('lpH1b')}</span>{t('lpH1c')}</h1>
        <p className="lp-s">{t('lpSub')}</p>
        <div className="lp-cta"><Link href="/start" className="btn btn-main">{t('startFree')}</Link><Link href="/login" className="btn btn-ghost">{t('login')}</Link></div>
        <p className="lp-note">{t('lpNote')}</p>
      </div></section>
      <section className="lp-w lp-flow">
        {[['1', 'owner', 'fl1'], ['2', 'supervisor', 'fl2'], ['3', 'worker', 'fl3']].map(([n, a, b], i) => (
          <div key={n} className="lp-fl"><b>{n}</b><div><strong>{t(a)}</strong><span>{t(b)}</span></div>{i < 2 ? <i aria-hidden="true">→</i> : null}</div>))}
      </section>
      <section className="lp-w lp-grid">{LIVE.map(([i, a, b, img]) => <div key={a} className={'card lp-f' + (img ? ' pic' : '')}>{img ? <img src={'/img/' + img + '-sm.webp'} alt="" loading="lazy" /> : null}<span className="lp-i">{i}</span><b>{t(a)}</b><p>{a === 'voice' ? '🎤 ' + t('voice') + ' · 📋 ' + t('pasteExcel') + ' · 📷 ' + t('scan') + ' · 🏷️ QR' : t(b)}</p></div>)}{F.map(([i, k]) => <div key={k} className="card lp-f"><span className="lp-i">{i}</span><b>{t(k + 't')}</b><p>{t(k + 'd')}</p></div>)}</section>
      <section className="lp-w"><h2 className="lp-h2">{t('soonH')}</h2>
        <div className="lp-grid">{SOON.map(([i, a, b]) => <div key={a} className="card lp-f soon"><span className="lp-i">{i}</span><b>{t(a)}</b><p>{t(b)}</p><span className="tag t-amb">{t('soon')}</span></div>)}</div></section>
      <footer className="lp-w lp-foot"><Brand /><span className="muted">🌍 {t('lpFoot')}</span></footer>
      <style>{`
        .lp-w{max-width:1100px;margin:0 auto;padding:0 18px}
        .lp-top{background:var(--navy);color:#fff}.lp-top .lp-w{display:flex;justify-content:space-between;align-items:center;height:68px;gap:10px}
        .lp-hero{background:linear-gradient(90deg,rgba(11,23,48,.94) 0,rgba(11,23,48,.82) 45%,rgba(11,23,48,.35) 100%),url(/img/workers.webp) center/cover no-repeat,var(--navy);color:#fff;padding:64px 0 84px}
        @media(max-width:760px){.lp-hero{background:linear-gradient(180deg,rgba(11,23,48,.9),rgba(11,23,48,.8)),url(/img/workers-sm.webp) center/cover no-repeat,var(--navy)}}
        .lp-k{letter-spacing:.16em;font-size:12px;font-weight:700;color:var(--amber);margin:0 0 14px}
        .lp-hero h1{font-size:clamp(30px,5vw,52px);line-height:1.12;margin:0;max-width:820px;letter-spacing:-.02em}.lp-hero h1 span{color:var(--amber)}
        .lp-s{font-size:17px;color:#C9D4EA;max-width:680px;margin:18px 0 26px}.lp-cta{display:flex;gap:10px;flex-wrap:wrap}.lp-note{font-size:13px;color:#9FB0D0;margin-top:14px}
        .lp-flow{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:-34px}
        .lp-fl{position:relative;display:flex;gap:12px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;box-shadow:0 10px 30px -18px rgba(11,23,48,.5)}
        .lp-fl b{width:34px;height:34px;flex:none;border-radius:10px;background:var(--navy);color:var(--amber);display:grid;place-items:center}.lp-fl strong{display:block;font-size:15px}.lp-fl span{font-size:13px;color:var(--soft)}
        .lp-fl i{position:absolute;right:-12px;top:50%;transform:translateY(-50%);font-style:normal;color:var(--amber);font-weight:700;z-index:2}
        .lp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin-top:22px}
        .lp-f{padding:18px;position:relative}.lp-f b{display:block;font-size:16px;margin:8px 0 4px}.lp-f p{margin:0;color:var(--soft);font-size:14.5px}.lp-i{font-size:26px}
        .lp-f.soon{background:#FBFCFE}.lp-f.pic{overflow:hidden;padding-top:0}.lp-f.pic img{display:block;width:calc(100% + 36px);margin:0 -18px 12px;aspect-ratio:16/8;object-fit:cover}.lp-f .tag{position:absolute;top:16px;right:16px}
        .lp-h2{margin:44px 0 0;font-size:22px}.lp-foot{display:flex;flex-direction:column;gap:8px;padding:40px 18px 50px;font-size:13.5px}
        @media(max-width:760px){.lp-flow{grid-template-columns:1fr}.lp-fl i{display:none}}
      `}</style>
    </main>
  );
}
