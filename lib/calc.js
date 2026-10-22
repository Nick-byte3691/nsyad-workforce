// Wages for one month. Shared by server and browser.
// Present = 1 day, Half day = 0.5 day. OT = hours × OT rate. Net = earned − advances − payments already made.
export const monthOf = (d) => String(d).slice(0, 7);
export const todayIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
export const daysInMonth = (m) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
export const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
export function payFor(worker, att, money) {
  let full = 0, half = 0, absent = 0, ot = 0;
  for (const a of att) { if (a.status === 'P') full++; else if (a.status === 'H') half++; else if (a.status === 'A') absent++; ot += Number(a.ot_hours) || 0; }
  const days = full + half / 2;
  const wage = r2(days * (Number(worker.daily_wage) || 0));
  const otPay = r2(ot * (Number(worker.ot_rate) || 0));
  const adv = r2(money.filter((m) => m.kind === 'advance').reduce((s, m) => s + Number(m.amount || 0), 0));
  const paid = r2(money.filter((m) => m.kind === 'payment').reduce((s, m) => s + Number(m.amount || 0), 0));
  const earned = r2(wage + otPay);
  return { full, half, absent, days, ot: r2(ot), wage, otPay, earned, adv, paid, net: r2(earned - adv - paid) };
}
export { money, todayIn } from './world';
