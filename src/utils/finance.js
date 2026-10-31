// Sort transactions by date and attach a running balance to each row.
export const withRunningBalance = (txns, opening = 0) => {
  let bal = opening;
  return [...txns]
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1))
    .map((t) => {
      bal += t.type === 'income' ? Number(t.amount) : -Number(t.amount);
      return { ...t, balance: bal };
    });
};

export const sumBy = (txns, type) => txns.filter((t) => t.type === type).reduce((a, t) => a + Number(t.amount), 0);

// Income, expense and closing balance per month, oldest first.
export const monthlySeries = (txns, months = 6) => {
  const now = new Date();
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const inMonth = txns.filter((t) => t.date.slice(0, 7) === key);
    const upto = txns.filter((t) => t.date.slice(0, 7) <= key);
    out.push({
      month: d.toLocaleDateString('en-IN', { month: 'short' }),
      income: sumBy(inMonth, 'income'),
      expense: sumBy(inMonth, 'expense'),
      balance: sumBy(upto, 'income') - sumBy(upto, 'expense'),
    });
  }
  return out;
};

// Report period helpers: returns [from, to] as YYYY-MM-DD.
export const periodRange = (kind, ref) => {
  const d = new Date(ref);
  const f = (x) => x.toISOString().slice(0, 10);
  if (kind === 'weekly') {
    const start = new Date(d); start.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return [f(start), f(end)];
  }
  if (kind === 'monthly') return [f(new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1))), f(new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0)))];
  if (kind === 'annual') return [`${d.getFullYear()}-01-01`, `${d.getFullYear()}-12-31`];
  return ['0000-01-01', '9999-12-31'];
};
