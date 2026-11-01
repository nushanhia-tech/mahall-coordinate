// Export all of a masjid's data to Excel (.xlsx) or CSV.
// Sheets are built from the admin's view of the data. Passwords and uploaded images are never exported.
import { withRunningBalance, sumBy } from './finance';

const d = (v) => (v ? String(v).slice(0, 10) : '');
const dt = (v) => (v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const yes = (v) => (v ? 'Yes' : 'No');
const num = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? '' : Number(v));
const has = (v) => (v ? 'Yes' : 'No');

// Every sheet: { name, columns: [header], rows: [[cell]] }
export function buildSheets(state) {
  const by = (col, id) => state[col]?.find((x) => x.id === id);
  const userName = (id) => by('users', id)?.username || '';
  const homeNo = (id) => by('households', id)?.homeNo || '';
  const inst = (id) => by('institutions', id)?.name || '';
  const channel = (id) => by('donationChannels', id)?.name || '';
  const item = (id) => by('rentalItems', id)?.name || '';
  const member = (id) => by('chittyMembers', id);
  const tx = (id) => by('transactions', id);
  const ledger = withRunningBalance(state.transactions || []);
  const sheets = [];
  const add = (name, columns, rows) => sheets.push({ name, columns, rows });

  add('Households', ['Home No', 'Head of family', 'Members', 'Ward', 'Phone', 'Address', 'Monthly Vari rate', 'Latitude', 'Longitude'],
    state.households.map((h) => [h.homeNo, h.headName, num(h.members), h.ward, h.phone, h.address, num(h.variRate), num(h.lat), num(h.lng)]));
  add('Household members', ['Home No', 'Name', 'Age', 'Gender', 'Relation'],
    state.households.flatMap((h) => (h.family || []).map((f) => [h.homeNo, f.name, num(f.age), f.gender, f.relation])));
  add('Ledger', ['Date', 'Receipt / Voucher No', 'Type', 'Account', 'Description', 'Income', 'Expense', 'Running balance', 'Bill attached', 'Linked record'],
    ledger.map((t) => [d(t.date), t.docNo, t.type, t.head, t.description, t.type === 'income' ? num(t.amount) : '', t.type === 'expense' ? num(t.amount) : '', num(t.balance), has(t.receipt), t.ref || '']));
  add('Account heads', ['Account', 'Income', 'Expense', 'Balance'],
    state.accountHeads.map((h) => { const t = state.transactions.filter((x) => x.head === h); const i = sumBy(t, 'income'), x = sumBy(t, 'expense'); return [h, i, x, i - x]; }));
  add('Donations', ['Date', 'Donor', 'Phone', 'Fund', 'Amount', 'Status', 'Receipt No', 'Confirmed at', 'Posted to account', 'Note', 'Remark', 'Screenshot attached'],
    state.donations.map((x) => [dt(x.date), x.name, x.phone, channel(x.channelId), num(x.amount), x.status, tx(x.transactionId)?.docNo || '', dt(x.decidedAt), x.accountHead || '', x.note || '', x.remark || '', has(x.screenshot)]));
  add('Donation channels', ['Fund', 'Posts to account', 'UPI', 'Account holder', 'Bank', 'Account No', 'IFSC'],
    state.donationChannels.map((c) => [c.name, c.accountHead, c.upi, c.bank?.holder, c.bank?.bank, c.bank?.accNo, c.bank?.ifsc]));
  add('Rental items', ['Item', 'Description', 'Stock', 'Rate / hour', 'Rate / day', 'Rate / week', 'Rate / month', 'Advance per item'],
    state.rentalItems.map((i) => [i.name, i.description, num(i.stock), num(i.rates?.hour), num(i.rates?.day), num(i.rates?.week), num(i.rates?.month), num(i.advance)]));
  add('Rental bookings', ['Bill No', 'Booked by login', 'Name', 'Phone', 'Items', 'Unit', 'Duration', 'From', 'Due back', 'Returned at', 'Status', 'Base rent', 'Overdue charge', 'Total', 'Advance', 'Advance paid', 'Advance method', 'Advance received at', 'Remark'],
    state.rentals.map((r) => [r.id.toUpperCase(), userName(r.userId), r.name, r.phone, (r.items || []).map((i) => `${item(i.itemId)} x${i.qty}`).join(', '), r.unit, num(r.duration), dt(r.start), dt(r.due), dt(r.returnedAt),
      r.status === 'active' && new Date(r.due) < new Date() ? 'overdue' : r.status, num(r.baseAmount), num(r.penalty), num(r.total || Number(r.baseAmount || 0) + Number(r.penalty || 0)), num(r.advanceAmount), yes(r.advancePaid), r.advanceMethod || '', dt(r.advanceReceivedAt), r.remark || '']));
  add('Chitty members', ['Chitty No', 'Name', 'Phone', 'Months paid'],
    state.chittyMembers.map((m) => [m.code, m.name, m.phone, state.chittyPayments.filter((p) => p.memberId === m.id && p.status === 'confirmed').length]));
  add('Chitty payments', ['Chitty No', 'Member', 'Month', 'Amount', 'Method', 'Status', 'UPI ref', 'Paid on', 'Remark'],
    state.chittyPayments.map((p) => [member(p.memberId)?.code || '', member(p.memberId)?.name || '', num(p.month), num(p.amount), p.method, p.status, p.utr || '', dt(p.date), p.remark || '']));
  add('Monthly Vari', ['Home No', 'Head of family', 'Month', 'Amount', 'Method', 'Status', 'Receipt No', 'UPI ref', 'Note', 'Sent on', 'Confirmed on', 'Remark'],
    (state.variPayments || []).map((p) => [homeNo(p.householdId), by('households', p.householdId)?.headName || '', p.month, num(p.amount), p.method, p.status, tx(p.transactionId)?.docNo || '', p.utr || '', p.note || '', dt(p.date), dt(p.decidedAt), p.remark || '']));
  const person = (x = {}) => [x.name, x.father, x.mother, d(x.dob), x.education, x.occupation, x.phone, x.mahall, x.address];
  const personCols = (w) => ['Name', "Father's name", "Mother's name", 'Date of birth', 'Education', 'Occupation', 'Phone', 'Mahall', 'Address'].map((c) => `${w} – ${c}`);
  add('Nikkah applications', ['Application No', 'Applied by', ...personCols('Groom'), ...personCols('Bride'), 'Waliyy', 'Waliyy relationship', 'Waliyy address', 'Witnesses', 'Nikkah date', 'Venue', 'Mahr', 'Registration fee', 'Fee status', 'Status', 'Remark', 'Submitted', 'Decided', 'Decided by'],
    state.nikkahApps.map((a) => [a.id.toUpperCase(), userName(a.userId), ...person(a.groom), ...person(a.bride), a.wali, a.waliRelation || '', a.waliAddress || '',
      (a.witnesses?.length ? a.witnesses.map((w) => w.name) : [a.witness1, a.witness2].filter(Boolean)).join('; '), d(a.date), a.venue, a.mahr, num(a.feeAmount), a.feeStatus || '', a.status, a.remark || '', dt(a.createdAt), dt(a.decidedAt), a.decidedBy || '']));
  add('Nikkah witnesses', ['Application No', 'Couple', 'Witness', 'Phone', 'Address', 'ID type', 'ID number', 'Notes'],
    state.nikkahApps.flatMap((a) => (a.witnesses || []).map((w) => [a.id.toUpperCase(), `${a.groom?.name} & ${a.bride?.name}`, w.name, w.phone, w.address, w.idType, w.idNumber, w.notes])));
  add('Home applications', ['Application No', 'Applied by', 'Applicant', 'Phone', 'Current address', 'New address', 'Ward', 'Latitude', 'Longitude', 'GPS accuracy (m)', 'GPS captured', 'Family members', 'Reason', 'Status', 'Home No given', 'Remark', 'Submitted', 'Decided'],
    state.homeApps.map((a) => [a.id.toUpperCase(), userName(a.userId), a.applicant, a.phone, a.currentAddress, a.newAddress, a.ward, num(a.lat), num(a.lng), num(a.gpsAccuracy), dt(a.gpsCapturedAt), (a.family || []).length, a.reason || '', a.status, a.homeNo || '', a.remark || '', dt(a.createdAt), dt(a.decidedAt)]));
  add('Home application members', ['Application No', 'Applicant', 'Name', 'Age', 'Gender', 'Relation'],
    state.homeApps.flatMap((a) => (a.family || []).map((f) => [a.id.toUpperCase(), a.applicant, f.name, num(f.age), f.gender, f.relation])));
  add('Portal users', ['Username', 'Name', 'Role', 'Linked home', 'Linked institution', 'Education', 'Qualification', 'Graduation'],
    state.users.map((u) => [u.username, u.name, u.role, homeNo(u.householdId), inst(u.institutionId), u.education || '', u.qualification || '', u.graduation || '']));
  add('Events', ['Date', 'Time', 'Title', 'Venue', 'Description', 'Rescheduled from'], state.events.map((e) => [d(e.date), e.time, e.title, e.venue, e.description, d(e.rescheduledFrom)]));
  add('Achievements', ['Date', 'Title', 'Description'], state.achievements.map((a) => [d(a.date), a.title, a.description]));
  add('Committee', ['Name', 'Role', 'Phone'], state.committee.map((c) => [c.name, c.role, c.phone]));
  add('Help desk', ['Name', 'Service', 'Phone'], state.helpdesk.map((c) => [c.name, c.service, c.phone]));
  add('Institutions', ['Name', 'Type', 'Students', 'Contact', 'Description'], state.institutions.map((i) => [i.name, i.type, num(i.students), i.contact, i.description]));
  add('Courses', ['Course', 'Institution', 'Duration', 'Fee', 'Seats', 'Description'], state.courses.map((c) => [c.title, inst(c.institutionId), c.duration, num(c.fee), num(c.seats), c.description]));
  add('Course applications', ['Date', 'Course', 'Name', 'Phone', 'Age', 'Qualification', 'Status', 'Remark'],
    state.courseApplications.map((a) => [dt(a.date), by('courses', a.courseId)?.title || '', a.name, a.phone, num(a.age), a.qualification || '', a.status, a.remark || '']));
  add('Opportunities', ['Type', 'Title', 'Last date', 'Eligibility', 'Contact', 'Description'], state.opportunities.map((o) => [o.type, o.title, d(o.deadline), o.eligibility, o.contact, o.description]));
  add('Services', ['Service', 'Contact', 'Description'], state.services.map((x) => [x.title, x.contact, x.description]));
  add('Auction items', ['Item', 'Starting bid', 'Increment', 'Ends', 'Status', 'Bids', 'Highest bid', 'Highest bidder'],
    state.auctionItems.map((a) => { const top = [...(a.bids || [])].sort((x, y) => y.amount - x.amount)[0]; return [a.name, num(a.minBid), num(a.increment), dt(a.endsAt), a.status, (a.bids || []).length, num(top?.amount), top?.bidder || '']; }));
  add('Auction bids', ['Item', 'Bidder', 'Phone', 'Amount', 'Time'], state.auctionItems.flatMap((a) => (a.bids || []).map((b) => [a.name, b.bidder, b.phone || '', num(b.amount), dt(b.time)])));
  add('Mediation chats', ['Opened', 'From', 'Type', 'Sent to', 'Subject', 'Household', 'Messages', 'Resolved'],
    state.chats.map((c) => [dt(c.createdAt), by('users', c.userId)?.name || c.fromName || '', c.kind || 'complaint', c.recipients || 'committee', c.subject, c.householdInfo || '', (c.messages || []).length, yes(c.closed)]));
  add('Chat messages', ['Subject', 'Time', 'From', 'Message', 'Read'], state.chats.flatMap((c) => (c.messages || []).map((m) => [c.subject, dt(m.time), m.from, m.text, yes(m.read)])));
  add('Institution reports', ['Institution', 'Title', 'Period', 'File', 'Status', 'Sent', 'Reviewed', 'Remark', 'Notes'],
    (state.institutionReports || []).map((r) => [inst(r.institutionId), r.title, r.period, r.fileName || (r.file ? 'attached' : ''), r.status, dt(r.submittedAt), dt(r.reviewedAt), r.remark || '', r.notes || '']));

  const m = state.masjid || {};
  sheets.unshift({
    name: 'About this backup',
    columns: ['Item', 'Value'],
    rows: [['Masjid', m.name], ['Address', m.address], ['Phone', m.phone], ['Exported at', dt(new Date())], ['Note', 'Passwords and uploaded images (bills, screenshots, photos) are not included.'], ['', ''],
      ...sheets.map((s) => [`Sheet: ${s.name}`, `${s.rows.length} rows`])],
  });
  return sheets;
}

// ---------- CSV ----------
const csvCell = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
// With a byte-order mark so Excel opens Malayalam/Arabic text correctly.
export const toCsv = (sheet) => '﻿' + [sheet.columns, ...sheet.rows].map((r) => r.map(csvCell).join(',')).join('\r\n');

// ---------- XLSX (Office Open XML, written by hand and zipped) ----------
const esc = (s) => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colName = (i) => { let s = ''; i += 1; while (i) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };
const sheetName = (name, used) => {
  let n = name.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31).trim() || 'Sheet';
  let k = 2; const base = n;
  while (used.has(n.toLowerCase())) n = `${base.slice(0, 28)} ${k++}`;
  used.add(n.toLowerCase());
  return n;
};

function sheetXml({ columns, rows }) {
  const all = [columns, ...rows];
  const widths = columns.map((_, c) => Math.min(60, Math.max(8, ...all.slice(0, 300).map((r) => String(r[c] ?? '').length + 2))));
  const cell = (v, r, c, header) => {
    const ref = `${colName(c)}${r + 1}`;
    if (header) return `<c r="${ref}" t="inlineStr" s="1"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`;
    if (v === '' || v === null || v === undefined) return '';
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(String(v).slice(0, 32000))}</t></is></c>`;
  };
  const rowsXml = all.map((r, i) => `<row r="${i + 1}">${r.map((v, c) => cell(v, i, c, i === 0)).join('')}</row>`).join('');
  const last = `${colName(Math.max(columns.length - 1, 0))}${Math.max(all.length, 1)}`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${rowsXml}</sheetData>
${rows.length ? `<autoFilter ref="A1:${last}"/>` : ''}
</worksheet>`;
}

export async function toXlsx(sheets) {
  const { zipSync, strToU8 } = await import('fflate');
  const used = new Set();
  const named = sheets.map((s) => ({ ...s, safe: sheetName(s.name, used) }));
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${named.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${named.map((s, i) => `<sheet name="${esc(s.safe)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
${named.some((s) => s.rows.length) ? `<definedNames>${named.map((s, i) => (s.rows.length ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${esc(s.safe).replace(/'/g, "''")}'!$A$1:$${colName(Math.max(s.columns.length - 1, 0))}$${s.rows.length + 1}</definedName>` : '')).join('')}</definedNames>` : ''}
</workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${named.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n')}
<Relationship Id="rId${named.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF11553D"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`,
  };
  named.forEach((s, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = sheetXml(s); });
  const zipped = zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])), { level: 6 });
  return new Blob([zipped], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// All sheets as separate CSV files inside one .zip
export async function csvZip(sheets) {
  const { zipSync, strToU8 } = await import('fflate');
  const files = {};
  sheets.forEach((s, i) => { files[`${String(i + 1).padStart(2, '0')} ${s.name.replace(/[\\/:*?"<>|]/g, ' ')}.csv`] = strToU8(toCsv(s)); });
  return new Blob([zipSync(files, { level: 6 })], { type: 'application/zip' });
}
