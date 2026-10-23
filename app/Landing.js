'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { Brand } from './Brand';
import { useLang, LangSwitch } from '../lib/i18n';

// NSYAD landing page. Every feature card opens sign-up with that work first.
export default function Landing() {
  const L = useLang(); const { t } = L;
  // Gentle fade-up of sections as they come into view (off for people who prefer less motion).
  useEffect(() => {
    const els = document.querySelectorAll('.rv');
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  const BIG = [['📦', 'stock', 'godownSub', 'stock'], ['🚚', 'gate', 'gateSub', 'gate'], ['⚙️', 'machines', 'machinesSub', 'machines']];
  const F = [['🕘', 'f1', 'f-att'], ['💰', 'f2', 'f-wages'], ['📊', 'f3', 'f-owner'], ['🧑‍🔧', 'f4', 'f-super'], ['📱', 'f5', 'f-worker'], ['🔒', 'f6', 'f-safe']];
  const SOON = [['🛒', 'market', 'marketSub'], ['🤝', 'help', 'helpFamily']];
  return (
    <main className="lp">
      <header className="lp-top"><div className="lp-w">
        <Brand light />
        <nav>
          <a href="#features" className="lp-nl">{t('navFeat')}</a>
          <a href="#how" className="lp-nl">{t('navHow')}</a>
          <LangSwitch {...L} />
          <Link href="/login" className="lp-login">{t('login')}</Link>
          <Link href="/start" className="btn btn-main btn-sm lp-start">{t('startFree')}</Link>
        </nav>
      </div></header>

      <section className="lp-hero">
        <div className="lp-glow" aria-hidden="true" /><div className="lp-gridbg" aria-hidden="true" />
        <div className="lp-w lp-hin">
          <div className="lp-hl">
            <p className="lp-k"><span className="lp-dot" />{t('lpKicker')}</p>
            <h1>{t('lpH1a')} <span className="lp-gold">{t('lpH1b')}</span>{t('lpH1c')}</h1>
            <p className="lp-s">{t('lpSub')}</p>
            <div className="lp-cta"><Link href="/start" className="btn btn-main lp-big">{t('startFree')} →</Link><Link href="/login" className="btn lp-glass">{t('login')}</Link></div>
            <div className="lp-fo"><b>{t('mainWork')}</b><div>{[['att', '👷'], ['stock', '📦'], ['gate', '🚚'], ['machines', '⚙️']].map(([k, i]) => <Link key={k} href={'/start?focus=' + k}>{i} {t('f_' + k)}</Link>)}</div></div>
          </div>
          <div className="lp-mock" aria-label={t('sample')}>
            <div className="lp-mbar"><i /><i /><i /><span>NSYAD · {t('today')}</span></div>
            <div className="lp-mstats">
              <div><b>142</b><span>{t('present')}</span></div>
              <div className="h"><b>6</b><span>{t('half')}</span></div>
              <div className="a"><b>9</b><span>{t('absent')}</span></div>
            </div>
            <div className="lp-mbars" aria-hidden="true">{[62, 74, 70, 88, 81, 93, 90].map((h, i) => <span key={i} style={{ height: h + '%' }} />)}</div>
            <div className="lp-mrow"><span>💰 {t('monthWages')}</span><b>4,86,200</b></div>
            <div className="lp-mrow"><span>🚚 {t('passesOpen')}</span><b>3</b></div>
            <div className="lp-mrow"><span>📦 {t('lowStock')}</span><b className="w">2</b></div>
            <div className="lp-mrow"><span>⚙️ {t('running')}</span><b className="g">11 / 12</b></div>
            <em>{t('sample')}</em>
          </div>
        </div>
      </section>

      <section className="lp-w lp-stats rv">
        <div><b>8</b><span>{t('st1')}</span></div>
        <div><b>4</b><span>{t('st2')}</span></div>
        <div><b>1</b><span>{t('st3')}</span></div>
        <div><b>{t('freeW')}</b><span>{t('st4')}</span></div>
      </section>

      <section id="features" className="lp-w lp-sec">
        <h2 className="lp-h2 rv">{t('featH')}</h2>
        <div className="lp-bento rv">
          {BIG.map(([i, a, b, img]) => (
            <Link key={a} href={'/start?focus=' + img} className="lp-tile">
              <img src={'/img/' + img + '-sm.webp'} alt="" loading="lazy" />
              <div className="lp-tov"><span className="lp-ic">{i}</span><b>{t(a)}</b><p>{t(b)}</p><em>{t('tryIt')}</em></div>
            </Link>
          ))}
          <Link href="/start?focus=stock" className="lp-tile lp-voice">
            <div className="lp-tov"><span className="lp-ic">🎤</span><b>{t('voice')}</b><p>🎤 {t('voice')} · 📋 {t('pasteExcel')} · 📷 {t('scan')} · 🏷️ QR</p><em>{t('tryIt')}</em></div>
          </Link>
        </div>
        <div className="lp-cards rv">
          {F.map(([i, k, img]) => (
            <Link key={k} href="/start?focus=att" className="lp-card">
              <div className="lp-cimg"><img src={'/img/' + img + '-sm.webp'} alt="" loading="lazy" /></div>
              <div className="lp-cb"><span className="lp-ic sm">{i}</span><b>{t(k + 't')}</b><p>{t(k + 'd')}</p><em>{t('tryIt')}</em></div>
            </Link>
          ))}
        </div>
      </section>

      <section id="how" className="lp-how">
        <div className="lp-w">
          <h2 className="lp-h2 light rv">{t('howH')}</h2>
          <div className="lp-steps rv">
            {[['1', 'owner', 'fl1', '👑'], ['2', 'supervisor', 'fl2', '🧑‍🔧'], ['3', 'worker', 'fl3', '👷']].map(([n, a, b, ic]) => (
              <div key={n} className="lp-step"><div className="lp-num">{n}</div><span className="lp-sic">{ic}</span><b>{t(a)}</b><p>{t(b)}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-w lp-sec">
        <p className="lp-motto rv">Honesty · Power · Discipline</p>
        <h2 className="lp-h2 c rv">{t('valH')}</h2>
        <div className="lp-vals rv">
          {[['🛡️', 'v1'], ['🌍', 'v2'], ['🤝', 'v3']].map(([i, k]) => <div key={k} className="lp-val"><span>{i}</span><b>{t(k + 't')}</b><p>{t(k + 'd')}</p></div>)}
        </div>
      </section>

      <section className="lp-w lp-sec">
        <h2 className="lp-h2 rv">{t('soonH')}</h2>
        <div className="lp-soon rv">{SOON.map(([i, a, b]) => <div key={a} className="lp-sc"><span className="lp-ic sm">{i}</span><div><b>{t(a)} <span className="tag t-amb">{t('soon')}</span></b><p>{t(b)}</p></div></div>)}</div>
      </section>

      <section className="lp-w"><div className="lp-final rv">
        <h2>{t('ctaH')}</h2><p>{t('lpNote')}</p>
        <Link href="/start" className="btn lp-dark lp-big">{t('startFree')} →</Link>
      </div></section>

      <footer className="lp-foot"><div className="lp-w"><Brand light /><span>🌍 {t('lpFoot')}</span></div></footer>
      <style>{CSS}</style>
    </main>
  );
}

const CSS = `
.lp{background:#F4F6FA;overflow-x:hidden}
.lp-w{max-width:1160px;margin:0 auto;padding:0 18px}
.lp-top{position:sticky;top:0;z-index:20;background:rgba(9,18,38,.78);backdrop-filter:saturate(1.4) blur(14px);-webkit-backdrop-filter:saturate(1.4) blur(14px);color:#fff;border-bottom:1px solid rgba(255,255,255,.08)}
.lp-top .lp-w{display:flex;justify-content:space-between;align-items:center;height:68px;gap:10px}
.lp-top nav{display:flex;gap:14px;align-items:center}
.lp-nl{color:#C9D4EA;text-decoration:none;font-size:14px;font-weight:500}.lp-nl:hover{color:#fff}
.lp-login{color:#fff;text-decoration:none;font-weight:600;font-size:14px}
.lp-hero{position:relative;color:#fff;padding:84px 0 110px;background:radial-gradient(1200px 600px at 85% -10%,rgba(245,165,36,.18),transparent 60%),linear-gradient(100deg,rgba(7,14,31,.97) 0,rgba(9,18,38,.9) 45%,rgba(9,18,38,.55) 100%),url(/img/workers.webp) center/cover no-repeat,#091226}
.lp-glow{position:absolute;width:520px;height:520px;left:-160px;bottom:-260px;border-radius:50%;background:radial-gradient(circle,rgba(245,165,36,.25),transparent 65%);filter:blur(10px)}
.lp-gridbg{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:44px 44px;mask-image:linear-gradient(180deg,#000 0,transparent 85%);-webkit-mask-image:linear-gradient(180deg,#000 0,transparent 85%)}
.lp-hin{position:relative;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,.9fr);gap:48px;align-items:center}
.lp-k{display:inline-flex;align-items:center;gap:10px;letter-spacing:.14em;font-size:11.5px;font-weight:700;color:#FFD27A;margin:0 0 18px;padding:7px 14px;border:1px solid rgba(245,165,36,.35);border-radius:99px;background:rgba(245,165,36,.08)}
.lp-dot{width:7px;height:7px;border-radius:50%;background:#F5A524;box-shadow:0 0 0 4px rgba(245,165,36,.2);animation:pulse 2s infinite}
@keyframes pulse{50%{box-shadow:0 0 0 8px rgba(245,165,36,0)}}
.lp-hero h1{font-size:clamp(34px,5.4vw,62px);line-height:1.06;margin:0;letter-spacing:-.03em;font-weight:800}
.lp-gold{background:linear-gradient(90deg,#FFD27A,#F5A524 55%,#FF8A3D);-webkit-background-clip:text;background-clip:text;color:transparent}
.lp-s{font-size:18px;color:#C3CEE6;max-width:620px;margin:22px 0 30px;line-height:1.6}
.lp-cta{display:flex;gap:12px;flex-wrap:wrap}
.lp-big{padding:14px 24px;font-size:16px;border-radius:14px}
.lp-glass{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.22);color:#fff;padding:14px 22px;border-radius:14px;backdrop-filter:blur(6px)}.lp-glass:hover{background:rgba(255,255,255,.14)}
.lp-fo{margin-top:30px}.lp-fo b{display:block;font-size:13px;color:#9FB0D0;margin-bottom:10px;font-weight:600}
.lp-fo div{display:flex;flex-wrap:wrap;gap:8px}.lp-fo a{color:#fff;text-decoration:none;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);border-radius:99px;padding:8px 14px;font-weight:600;font-size:13.5px;transition:border-color .2s,background .2s}.lp-fo a:hover{border-color:#F5A524;background:rgba(245,165,36,.12)}
.lp-mock{position:relative;background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.16);border-radius:22px;padding:18px;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 30px 80px -30px rgba(0,0,0,.7);animation:float 7s ease-in-out infinite}
@keyframes float{50%{transform:translateY(-8px)}}
@media (prefers-reduced-motion:reduce){.lp-mock,.lp-dot{animation:none}}
.lp-mbar{display:flex;gap:6px;align-items:center;margin-bottom:14px}.lp-mbar i{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.25)}.lp-mbar span{margin-left:8px;font-size:12.5px;color:#C3CEE6;font-weight:600}
.lp-mstats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.lp-mstats div{background:rgba(22,163,74,.16);border:1px solid rgba(22,163,74,.35);border-radius:14px;padding:10px}.lp-mstats .h{background:rgba(217,119,6,.16);border-color:rgba(217,119,6,.35)}.lp-mstats .a{background:rgba(220,38,38,.14);border-color:rgba(220,38,38,.32)}
.lp-mstats b{display:block;font-size:24px}.lp-mstats span{font-size:11.5px;color:#C3CEE6}
.lp-mbars{display:flex;align-items:flex-end;gap:7px;height:70px;margin:14px 2px 8px}.lp-mbars span{flex:1;border-radius:6px 6px 2px 2px;background:linear-gradient(180deg,#FFD27A,#F5A524)}
.lp-mrow{display:flex;justify-content:space-between;gap:10px;padding:9px 2px;border-top:1px solid rgba(255,255,255,.08);font-size:13.5px;color:#DDE5F5}.lp-mrow b{font-weight:700}.lp-mrow .w{color:#FFB547}.lp-mrow .g{color:#4ADE80}
.lp-mock em{position:absolute;top:-11px;right:16px;font-style:normal;font-size:11px;background:#F5A524;color:#1B1300;padding:3px 10px;border-radius:99px;font-weight:700}
.lp-stats{position:relative;z-index:2;width:calc(100% - 36px);max-width:1124px;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:-46px;background:#fff;border:1px solid #E2E7EF;border-radius:20px;box-shadow:0 24px 50px -30px rgba(9,18,38,.45);overflow:hidden}
.lp-stats div{padding:22px 20px;border-right:1px solid #EEF1F6}.lp-stats div:last-child{border-right:0}
.lp-stats b{display:block;font-size:30px;font-weight:800;color:#0B1730;letter-spacing:-.02em}.lp-stats span{font-size:13.5px;color:#5B6780}
.lp-sec{padding-top:72px}
.lp-h2{font-size:clamp(24px,3.2vw,36px);letter-spacing:-.02em;margin:0 0 26px;font-weight:800;color:#0B1730;max-width:760px}.lp-h2.light{color:#fff}.lp-h2.c{text-align:center;margin-left:auto;margin-right:auto}
.lp-bento{display:grid;grid-template-columns:1.4fr 1fr 1fr;grid-template-rows:240px 200px;gap:14px}
.lp-bento .lp-tile:first-child{grid-row:span 2}
.lp-tile{position:relative;border-radius:22px;overflow:hidden;text-decoration:none;color:#fff;background:#0B1730;isolation:isolate;box-shadow:0 14px 34px -22px rgba(9,18,38,.6)}
.lp-tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;transition:transform .6s}
.lp-tile::after{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(9,18,38,.05) 20%,rgba(9,18,38,.88) 100%)}
.lp-tile:hover img{transform:scale(1.06)}
.lp-tov{position:absolute;left:0;right:0;bottom:0;padding:20px}.lp-tov b{display:block;font-size:20px;margin:6px 0 4px}.lp-tov p{margin:0;font-size:14px;color:#D5DDEE}.lp-tov em{display:inline-block;margin-top:10px;font-style:normal;font-weight:700;font-size:13.5px;color:#FFD27A}
.lp-voice{grid-column:span 2;background:radial-gradient(500px 220px at 90% 10%,rgba(245,165,36,.35),transparent 60%),linear-gradient(135deg,#13254A,#0B1730)}
.lp-voice::after{display:none}
.lp-ic{display:inline-grid;place-items:center;width:42px;height:42px;border-radius:12px;background:rgba(255,255,255,.14);backdrop-filter:blur(6px);font-size:21px}
.lp-ic.sm{width:38px;height:38px;font-size:19px;background:#FFF4DC}
.lp-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:14px}
.lp-card{display:flex;flex-direction:column;background:#fff;border:1px solid #E2E7EF;border-radius:20px;overflow:hidden;text-decoration:none;color:inherit;transition:transform .2s,box-shadow .2s,border-color .2s}
.lp-card:hover{transform:translateY(-4px);box-shadow:0 22px 40px -26px rgba(9,18,38,.55);border-color:#F5C46A}
.lp-cimg{aspect-ratio:16/8;overflow:hidden}.lp-cimg img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .6s}.lp-card:hover .lp-cimg img{transform:scale(1.05)}
.lp-cb{padding:16px 18px 18px;position:relative}.lp-cb .lp-ic{position:absolute;top:-22px;left:16px;box-shadow:0 6px 16px -6px rgba(0,0,0,.3);border:2px solid #fff}
.lp-cb b{display:block;font-size:16.5px;margin:18px 0 4px;color:#0B1730}.lp-cb p{margin:0;color:#5B6780;font-size:14px;line-height:1.55}.lp-cb em{display:block;margin-top:10px;font-style:normal;font-weight:700;font-size:13.5px;color:#B07A00}
.lp-how{margin-top:80px;padding:72px 0 80px;background:radial-gradient(800px 400px at 10% 0%,rgba(245,165,36,.14),transparent 60%),#0B1730;color:#fff}
.lp-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;position:relative}
.lp-steps::before{content:'';position:absolute;top:30px;left:10%;right:10%;height:2px;background:linear-gradient(90deg,transparent,rgba(245,165,36,.6),transparent)}
.lp-step{position:relative;background:linear-gradient(180deg,#122348,#0E1C3B);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:22px}
.lp-num{position:relative;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-weight:800;font-size:18px;background:linear-gradient(135deg,#FFD27A,#F5A524);color:#1B1300;box-shadow:0 8px 24px -8px rgba(245,165,36,.8)}
.lp-sic{position:absolute;top:20px;right:20px;font-size:26px;opacity:.9}
.lp-step b{display:block;font-size:18px;margin:16px 0 4px}.lp-step p{margin:0;color:#B9C5DE;font-size:14.5px}
.lp-motto{text-align:center;letter-spacing:.3em;font-size:12.5px;font-weight:700;color:#B07A00;margin:0 0 10px;text-transform:uppercase}
.lp-vals{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.lp-val{background:#fff;border:1px solid #E2E7EF;border-radius:20px;padding:24px}.lp-val span{font-size:28px}.lp-val b{display:block;font-size:17px;margin:10px 0 6px;color:#0B1730}.lp-val p{margin:0;color:#5B6780;font-size:14.5px;line-height:1.6}
.lp-soon{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.lp-sc{display:flex;gap:14px;align-items:flex-start;background:repeating-linear-gradient(135deg,#fff 0 14px,#FBFCFE 14px 28px);border:1px dashed #D5DCE8;border-radius:20px;padding:20px}.lp-sc b{display:block;font-size:16.5px;color:#0B1730}.lp-sc p{margin:4px 0 0;color:#5B6780;font-size:14.5px}.lp-sc .tag{margin-left:6px;vertical-align:middle}
.lp-final{margin:80px 0 70px;border-radius:28px;padding:56px 28px;text-align:center;color:#1B1300;background:radial-gradient(600px 260px at 50% 0%,rgba(255,255,255,.45),transparent 70%),linear-gradient(135deg,#FFD27A,#F5A524 50%,#FF8A3D);box-shadow:0 30px 60px -30px rgba(245,165,36,.8)}
.lp-final h2{margin:0;font-size:clamp(26px,4vw,40px);letter-spacing:-.02em;font-weight:800}.lp-final p{margin:10px 0 24px;font-size:16px;opacity:.85}
.lp-dark{background:#0B1730;color:#fff}.lp-dark:hover{background:#13254A}
.lp-foot{background:#070E1F;color:#9FB0D0;padding:36px 0 44px;font-size:13.5px}.lp-foot .lp-w{display:flex;flex-direction:column;gap:12px}
.rv{opacity:0;transform:translateY(18px);transition:opacity .7s ease,transform .7s ease}.rv.in{opacity:1;transform:none}
@media(max-width:960px){.lp-hin{grid-template-columns:1fr;gap:34px}.lp-mock{max-width:440px}.lp-bento{grid-template-columns:1fr 1fr;grid-template-rows:none;grid-auto-rows:210px}.lp-bento .lp-tile:first-child{grid-row:auto;grid-column:span 2}.lp-cards{grid-template-columns:1fr 1fr}.lp-nl{display:none}}
@media(max-width:640px){.lp-hero{padding:56px 0 92px;background:radial-gradient(600px 400px at 90% -10%,rgba(245,165,36,.2),transparent 60%),linear-gradient(180deg,rgba(7,14,31,.94),rgba(9,18,38,.86)),url(/img/workers-sm.webp) center/cover no-repeat,#091226}
.lp-stats{grid-template-columns:1fr 1fr}.lp-stats div:nth-child(2){border-right:0}.lp-stats div:nth-child(-n+2){border-bottom:1px solid #EEF1F6}
.lp-bento{grid-template-columns:1fr}.lp-bento .lp-tile:first-child,.lp-voice{grid-column:auto}.lp-cards,.lp-steps,.lp-vals,.lp-soon{grid-template-columns:1fr}.lp-steps::before{display:none}
.lp-top nav{gap:8px}.lp-start,.lp-login{display:none}.lp-final{padding:40px 20px}}
`;
