export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const pdfInr = (n) => 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
export const today = () => new Date().toISOString().slice(0, 10);
export const daysFromNow = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export const readFile = (file) =>
  new Promise((res, rej) => {
    if (!file) return res('');
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

export const HOUR = 3600000;
export const UNIT_MS = { hour: HOUR, day: 24 * HOUR, week: 7 * 24 * HOUR, month: 30 * 24 * HOUR };
export const UNIT_LABEL = { hour: 'Hour', day: 'Day', week: 'Week', month: 'Month' };

export const fmtDuration = (ms) => {
  if (ms <= 0) return '0h';
  const d = Math.floor(ms / (24 * HOUR));
  const h = Math.floor((ms % (24 * HOUR)) / HOUR);
  const m = Math.floor((ms % HOUR) / 60000);
  return [d && `${d}d`, h && `${h}h`, !d && m && `${m}m`].filter(Boolean).join(' ') || '<1m';
};

// Penalty for overdue time: for each rate unit, round overdue time up to whole units,
// then charge the cheapest option.
export const cheapestPenalty = (rates, overdueMs) => {
  if (overdueMs <= 0) return { amount: 0, unit: null, count: 0 };
  let best = null;
  for (const unit of ['hour', 'day', 'week', 'month']) {
    const rate = Number(rates?.[unit]);
    if (!rate) continue;
    const count = Math.ceil(overdueMs / UNIT_MS[unit]);
    const amount = count * rate;
    if (!best || amount < best.amount) best = { amount, unit, count };
  }
  return best || { amount: 0, unit: null, count: 0 };
};

export const monthLabel = (start, idx) => {
  const [y, m] = start.split('-').map(Number);
  const d = new Date(y, m - 1 + idx, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

// Read an image file and shrink it so localStorage doesn't fill up.
export const readImage = async (file, max = 900) => {
  if (!file) return '';
  const src = await readFile(file);
  if (!file.type?.startsWith('image/')) return src;
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => res(src);
    img.src = src;
  });
};
