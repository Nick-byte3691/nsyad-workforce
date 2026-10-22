// Countries: phone code, currency and time zone. Shared by server and browser. "Other" = choose your own code.
export const COUNTRIES = [
  ['IN', 'India', '91', 'INR', 'Asia/Kolkata'], ['BD', 'Bangladesh', '880', 'BDT', 'Asia/Dhaka'], ['NP', 'Nepal', '977', 'NPR', 'Asia/Kathmandu'],
  ['PK', 'Pakistan', '92', 'PKR', 'Asia/Karachi'], ['LK', 'Sri Lanka', '94', 'LKR', 'Asia/Colombo'], ['AE', 'United Arab Emirates', '971', 'AED', 'Asia/Dubai'],
  ['SA', 'Saudi Arabia', '966', 'SAR', 'Asia/Riyadh'], ['QA', 'Qatar', '974', 'QAR', 'Asia/Qatar'], ['KW', 'Kuwait', '965', 'KWD', 'Asia/Kuwait'], ['OM', 'Oman', '968', 'OMR', 'Asia/Muscat'],
  ['MY', 'Malaysia', '60', 'MYR', 'Asia/Kuala_Lumpur'], ['SG', 'Singapore', '65', 'SGD', 'Asia/Singapore'], ['ID', 'Indonesia', '62', 'IDR', 'Asia/Jakarta'], ['PH', 'Philippines', '63', 'PHP', 'Asia/Manila'],
  ['VN', 'Vietnam', '84', 'VND', 'Asia/Ho_Chi_Minh'], ['TH', 'Thailand', '66', 'THB', 'Asia/Bangkok'], ['MM', 'Myanmar', '95', 'MMK', 'Asia/Yangon'],
  ['KE', 'Kenya', '254', 'KES', 'Africa/Nairobi'], ['TZ', 'Tanzania', '255', 'TZS', 'Africa/Dar_es_Salaam'], ['UG', 'Uganda', '256', 'UGX', 'Africa/Kampala'], ['NG', 'Nigeria', '234', 'NGN', 'Africa/Lagos'],
  ['GH', 'Ghana', '233', 'GHS', 'Africa/Accra'], ['ET', 'Ethiopia', '251', 'ETB', 'Africa/Addis_Ababa'], ['ZA', 'South Africa', '27', 'ZAR', 'Africa/Johannesburg'], ['EG', 'Egypt', '20', 'EGP', 'Africa/Cairo'],
  ['BR', 'Brazil', '55', 'BRL', 'America/Sao_Paulo'], ['MX', 'Mexico', '52', 'MXN', 'America/Mexico_City'], ['CO', 'Colombia', '57', 'COP', 'America/Bogota'], ['PE', 'Peru', '51', 'PEN', 'America/Lima'],
  ['US', 'United States', '1', 'USD', 'America/New_York'], ['CA', 'Canada', '1', 'CAD', 'America/Toronto'], ['GB', 'United Kingdom', '44', 'GBP', 'Europe/London'],
  ['DE', 'Germany', '49', 'EUR', 'Europe/Berlin'], ['FR', 'France', '33', 'EUR', 'Europe/Paris'], ['ES', 'Spain', '34', 'EUR', 'Europe/Madrid'], ['IT', 'Italy', '39', 'EUR', 'Europe/Rome'],
  ['PT', 'Portugal', '351', 'EUR', 'Europe/Lisbon'], ['AU', 'Australia', '61', 'AUD', 'Australia/Sydney'],
];
export const countryOf = (code) => COUNTRIES.find((c) => c[0] === code) || COUNTRIES[0];
// "+919876543210" style. A number typed without "+" gets the country code in front.
export function normPhone(raw, cc) {
  let s = String(raw || '').trim().replace(/[\s()-]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  let d;
  if (s.startsWith('+')) d = s.slice(1).replace(/\D/g, '');
  else { const n = s.replace(/\D/g, '').replace(/^0+/, ''); d = (String(cc || '91').replace(/\D/g, '') || '91') + n; }
  return /^\d{8,15}$/.test(d) ? '+' + d : '';
}
export const todayIn = (tz) => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); } catch { return new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10); } };
export function money(n, cur = 'INR', locale) {
  try { return new Intl.NumberFormat(locale || (cur === 'INR' ? 'en-IN' : 'en'), { style: 'currency', currency: cur, maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(Number(n) || 0); }
  catch { return cur + ' ' + (Number(n) || 0); }
}
