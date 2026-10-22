// NSYAD mark: a bold N on safety amber, with three rising bars (work, fair pay, growth).
export function Mark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#F5A524" />
      <path d="M10 30V10l12 20V10" fill="none" stroke="#0B1730" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27 30v-5M30.5 30v-9M34 30v-13" stroke="#0B1730" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
export function Brand({ light }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: light ? '#fff' : 'var(--ink)' }}>
      <Mark />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <b style={{ fontSize: 19, letterSpacing: '.06em', fontWeight: 700 }}>NSYAD</b>
        <small style={{ fontSize: 11, letterSpacing: '.18em', fontWeight: 600, color: light ? '#F5A524' : '#8A5A00', textTransform: 'uppercase' }}>Workforce</small>
      </span>
    </span>
  );
}
