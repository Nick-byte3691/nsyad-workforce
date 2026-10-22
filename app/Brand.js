// NSYAD mark: one golden triangle with "NS" — strength, a steady base, and rising up.
export function Mark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M20 3.5 L37.5 35.5 L2.5 35.5 Z" fill="#F5B700" stroke="#B87D00" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M20 5.5 L28.2 20.5 L11.8 20.5 Z" fill="#FFE98A" opacity=".55" />
      <path d="M20 8.8 L33.2 32.8 L6.8 32.8 Z" fill="none" stroke="#FFF3B8" strokeOpacity=".75" strokeWidth=".9" strokeLinejoin="round" />
      <text x="20" y="30.2" textAnchor="middle" fontFamily="Poppins, Arial, sans-serif" fontWeight="800" fontSize="11.5" fill="#0B1730" letterSpacing=".3">NS</text>
    </svg>
  );
}
export function Brand({ light }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: light ? '#fff' : 'var(--ink)' }}>
      <Mark />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <b style={{ fontSize: 19, letterSpacing: '.06em', fontWeight: 700 }}>NSYAD</b>
        <small style={{ fontSize: 11, letterSpacing: '.18em', fontWeight: 600, color: light ? '#F5B700' : '#8A5A00', textTransform: 'uppercase' }}>Workforce</small>
      </span>
    </span>
  );
}
