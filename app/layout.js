import '@fontsource/poppins/400.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/600.css';
import './globals.css';
export const metadata = {
  title: 'NSYAD — Honesty · Power · Discipline | attendance, wages, stock, gate pass and machines for every industry',
  description: 'Daily attendance, overtime and wages for every worker, with one dashboard for the owner. Hindi and English. Every worker can see his own days and pay.',
};
export const viewport = { themeColor: '#0B1730', width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }) {
  return <html lang="hi"><body>{children}</body></html>;
}
