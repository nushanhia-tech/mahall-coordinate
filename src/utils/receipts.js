import { downloadPdf } from './pdf';
import { pdfInr, fmtDateTime, fmtDate } from './format';

// Amount in words (Indian numbering), for receipts.
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const two = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`);
const three = (n) => `${n >= 100 ? ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' : '') : ''}${n % 100 ? two(n % 100) : ''}`;
export function inWords(amount) {
  let n = Math.floor(Number(amount) || 0);
  if (!n) return 'Zero';
  const parts = [];
  for (const [div, name] of [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand']]) {
    if (n >= div) { parts.push(`${three(Math.floor(n / div))} ${name}`); n %= div; }
  }
  if (n) parts.push(three(n));
  return parts.join(' ');
}

// Official donation receipt, printed when the committee confirms a donation.
export function donationReceiptPdf(masjid, { receiptNo, name, phone, amount, channel, date, decidedAt, note }, { title = 'DONATION RECEIPT', file = 'donation-receipt' } = {}) {
  return downloadPdf({
    org: masjid,
    title,
    subtitle: `Receipt No. ${receiptNo || '-'}   ·   Confirmed ${fmtDateTime(decidedAt)}`,
    blocks: [
      { text: `Received with thanks from ${name}${phone ? ` (${phone})` : ''} the sum of ${pdfInr(amount)} (Rupees ${inWords(amount)} only) towards the ${channel || 'Masjid'}.` },
      { kv: [
        ['Receipt number', receiptNo || '-'],
        ['Donor', name],
        ['Phone', phone || '-'],
        ['Fund', channel || '-'],
        ['Amount', pdfInr(amount)],
        ['Amount in words', `Rupees ${inWords(amount)} only`],
        ['Donated on', date ? fmtDate(date) : '-'],
        ['Confirmed by committee', fmtDateTime(decidedAt)],
        ...(note ? [['Note', note]] : []),
      ] },
      { text: 'May Allah accept your charity and reward you abundantly. JazakAllahu khairan.' },
      { text: '\n\nTreasurer / Secretary: ______________________          (This is a computer-generated receipt.)' },
    ],
  }, `${file}-${receiptNo || 'pending'}.pdf`);
}
