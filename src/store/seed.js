import { daysFromNow } from '../utils/format';

const HOUR = 3600000;
const now = Date.now();
const iso = (offsetMs) => new Date(now + offsetMs).toISOString();
const qrDemo = (label) => `upi://pay?pa=mahall.${label}@sbi&pn=Mahall%20${label}`;

export const seed = () => ({
  version: 1,
  masjid: {
    name: 'Juma Masjid Mahall Committee',
    tagline: 'Serving the community with transparency and care',
    address: 'Main Road, Kuttippuram, Malappuram, Kerala 679571',
    lat: 10.8437,
    lng: 76.0375,
    phone: '+91 94470 00000',
    email: 'office@mahall.org',
    about: 'The Mahall committee coordinates religious, educational, welfare and social activities for every home in the parish.',
  },
  households: [
    { id: 'h1', homeNo: 'MH-001', headName: 'Abdul Rahman K', members: 5, phone: '9847000001', ward: 'Ward 1', address: 'Kalathil House, Near Masjid' },
    { id: 'h2', homeNo: 'MH-002', headName: 'Muhammed Ali P', members: 4, phone: '9847000002', ward: 'Ward 1', address: 'Puthiyapura, School Road' },
    { id: 'h3', homeNo: 'MH-003', headName: 'Fathima Beevi', members: 3, phone: '9847000003', ward: 'Ward 2', address: 'Thottathil, Market Lane' },
    { id: 'h4', homeNo: 'MH-004', headName: 'Usman Haji', members: 7, phone: '9847000004', ward: 'Ward 2', address: 'Valiyaveettil, Bypass' },
    { id: 'h5', homeNo: 'MH-005', headName: 'Basheer T', members: 6, phone: '9847000005', ward: 'Ward 3', address: 'Thekkekara, River Side' },
    { id: 'h6', homeNo: 'MH-006', headName: 'Saidalavi M', members: 4, phone: '9847000006', ward: 'Ward 3', address: 'Mangalath, Hill View' },
  ],
  institutions: [
    { id: 'i1', name: 'Darul Huda Madrasa', type: 'Madrasa', students: 240, contact: '9847100001', photo: '', description: 'Primary to higher-secondary religious education, classes 1–12.' },
    { id: 'i2', name: 'Mahall Hifz Academy', type: 'Hifz College', students: 45, contact: '9847100002', photo: '', description: 'Residential Quran memorisation programme.' },
    { id: 'i3', name: 'Al-Noor Skill Centre', type: 'Vocational', students: 80, contact: '9847100003', photo: '', description: 'Tailoring, computer and spoken English courses for youth and women.' },
  ],
  courses: [
    { id: 'c1', title: 'Basic Computer & Office', institutionId: 'i3', duration: '3 months', fee: 1500, seats: 30, description: 'MS Office, internet and typing basics.' },
    { id: 'c2', title: 'Tajweed for Adults', institutionId: 'i1', duration: '6 months', fee: 0, seats: 40, description: 'Weekend Quran recitation classes.' },
    { id: 'c3', title: 'Fashion Tailoring', institutionId: 'i3', duration: '4 months', fee: 2000, seats: 20, description: 'Cutting, stitching and design for women.' },
  ],
  courseApplications: [],
  opportunities: [
    { id: 'o1', type: 'Scholarship', title: 'Higher Education Merit Scholarship', description: '₹10,000 per year for degree students from the Mahall.', eligibility: 'Above 75% in Plus Two', deadline: daysFromNow(30), contact: 'Education Wing – 9847200001' },
    { id: 'o2', type: 'Job', title: 'Accountant – Mahall Office', description: 'Part-time accountant to maintain ledger and receipts.', eligibility: 'B.Com with Tally', deadline: daysFromNow(15), contact: 'Secretary – 9847200002' },
    { id: 'o3', type: 'Service', title: 'Free Medical Camp', description: 'General check-up, diabetes and BP screening.', eligibility: 'Open to all', deadline: daysFromNow(10), contact: 'Health Wing – 9847200003' },
  ],
  services: [
    { id: 's1', title: 'Ambulance Service', description: '24x7 Mahall ambulance for emergencies.', contact: '9847300001' },
    { id: 's2', title: 'Freezer Box', description: 'Mortuary freezer available at no cost.', contact: '9847300002' },
    { id: 's3', title: 'Marriage Counselling', description: 'Pre-marriage course conducted every month.', contact: '9847300003' },
  ],
  accountHeads: ['General Fund', 'Relief Fund', 'Nercha Fund', 'Madrasa Fund', 'Maintenance'],
  transactions: [
    { id: 't1', date: daysFromNow(-60), type: 'income', head: 'General Fund', amount: 45000, description: 'Monthly subscription collection', receipt: '' },
    { id: 't2', date: daysFromNow(-55), type: 'expense', head: 'Maintenance', amount: 12000, description: 'Electrical repair – main hall', receipt: '' },
    { id: 't3', date: daysFromNow(-40), type: 'income', head: 'Nercha Fund', amount: 28000, description: 'Nercha offerings', receipt: '' },
    { id: 't4', date: daysFromNow(-32), type: 'expense', head: 'Madrasa Fund', amount: 18000, description: 'Teacher salaries', receipt: '' },
    { id: 't5', date: daysFromNow(-25), type: 'income', head: 'Relief Fund', amount: 15000, description: 'Relief collection – Friday', receipt: '' },
    { id: 't6', date: daysFromNow(-18), type: 'expense', head: 'Relief Fund', amount: 9000, description: 'Medical aid to 3 families', receipt: '' },
    { id: 't7', date: daysFromNow(-10), type: 'income', head: 'General Fund', amount: 38000, description: 'Monthly subscription collection', receipt: '' },
    { id: 't8', date: daysFromNow(-4), type: 'expense', head: 'General Fund', amount: 7500, description: 'Water & electricity bills', receipt: '' },
  ],
  donationChannels: [
    { id: 'masjid', name: 'Masjid Fund', accountHead: 'General Fund', upi: 'mahall.masjid@sbi', qr: qrDemo('masjid'), qrImage: '', bank: { holder: 'Juma Masjid Committee', bank: 'State Bank of India', accNo: '40112233445', ifsc: 'SBIN0070123' } },
    { id: 'relief', name: 'Relief Fund', accountHead: 'Relief Fund', upi: 'mahall.relief@sbi', qr: qrDemo('relief'), qrImage: '', bank: { holder: 'Mahall Relief Cell', bank: 'Federal Bank', accNo: '16780100045566', ifsc: 'FDRL0001678' } },
    { id: 'nercha', name: 'Nercha', accountHead: 'Nercha Fund', upi: 'mahall.nercha@sbi', qr: qrDemo('nercha'), qrImage: '', bank: { holder: 'Juma Masjid Nercha Account', bank: 'Canara Bank', accNo: '0912101055778', ifsc: 'CNRB0000912' } },
  ],
  donations: [
    { id: 'd1', channelId: 'relief', name: 'Shameer K', phone: '9847011111', amount: 2500, screenshot: '', note: 'For flood relief', status: 'pending', date: new Date(now - 2 * HOUR).toISOString(), remark: '' },
  ],
  events: [
    { id: 'e1', title: 'Milad-un-Nabi Programme', date: daysFromNow(6), time: '18:30', venue: 'Masjid Main Hall', description: 'Moulid recitation and public meeting.', rescheduledFrom: '' },
    { id: 'e2', title: 'Mahall General Body Meeting', date: daysFromNow(12), time: '16:00', venue: 'Madrasa Hall', description: 'Annual accounts presentation and elections.', rescheduledFrom: '' },
    { id: 'e3', title: 'Blood Donation Camp', date: daysFromNow(20), time: '09:00', venue: 'Al-Noor Skill Centre', description: 'In association with District Hospital.', rescheduledFrom: '' },
  ],
  achievements: [
    { id: 'a1', title: '100% SSLC Pass – Madrasa Students', date: daysFromNow(-120), description: 'All 32 students passed with 12 full A+.' },
    { id: 'a2', title: 'Relief Kits for 150 Families', date: daysFromNow(-70), description: 'Distributed during monsoon floods.' },
    { id: 'a3', title: 'Masjid Renovation Completed', date: daysFromNow(-30), description: 'New ablution area and solar panels installed.' },
  ],
  committee: [
    { id: 'm1', name: 'K.P. Abdul Kader Haji', role: 'President', phone: '9847400001' },
    { id: 'm2', name: 'Muhammed Shafi V', role: 'Secretary', phone: '9847400002' },
    { id: 'm3', name: 'Ashraf P.T', role: 'Treasurer', phone: '9847400003' },
    { id: 'm4', name: 'Usthad Hamza Faizy', role: 'Khateeb', phone: '9847400004' },
  ],
  helpdesk: [
    { id: 'hd1', name: 'Mahall Office', service: 'General enquiries', phone: '0494 2600000' },
    { id: 'hd2', name: 'Ambulance', service: 'Emergency – 24x7', phone: '9847300001' },
    { id: 'hd3', name: 'Police Station', service: 'Kuttippuram PS', phone: '0494 2608100' },
    { id: 'hd4', name: 'Fire & Rescue', service: 'Emergency', phone: '101' },
  ],
  users: [
    { id: 'u1', username: 'admin', password: 'admin123', role: 'admin', name: 'Mahall Admin', householdId: '', institutionId: '' },
    { id: 'u2', username: 'member', password: 'member123', role: 'individual', name: 'Abdul Rahman K', householdId: 'h1', institutionId: '' },
    { id: 'u3', username: 'khateeb', password: 'khateeb123', role: 'khateeb', name: 'Usthad Hamza Faizy', householdId: '', institutionId: '' },
    { id: 'u4', username: 'madrasa', password: 'inst123', role: 'institution', name: 'Darul Huda Madrasa', householdId: '', institutionId: 'i1' },
  ],
  rentalItems: [
    { id: 'r1', name: 'Plastic Chairs (set of 10)', description: 'White stackable chairs', stock: 20, rates: { hour: 20, day: 100, week: 500, month: 1500 } },
    { id: 'r2', name: 'Shamiyana / Tent', description: '20x20 ft tent with poles', stock: 3, rates: { hour: 150, day: 1000, week: 5000, month: 15000 } },
    { id: 'r3', name: 'Sound System', description: 'Amplifier, 2 speakers, 2 mics', stock: 2, rates: { hour: 200, day: 1200, week: 6000, month: 0 } },
    { id: 'r4', name: 'Wheelchair', description: 'Foldable wheelchair', stock: 4, rates: { hour: 0, day: 30, week: 150, month: 400 } },
  ],
  rentals: [
    { id: 'rt1', name: 'Faisal M', phone: '9847022222', items: [{ itemId: 'r1', qty: 1 }], unit: 'day', duration: 1, start: iso(-(24 + 39) * HOUR), due: iso(-39 * HOUR), status: 'active', baseAmount: 100, returnedAt: '', remark: '', penalty: 0, penaltyDetail: '', total: 0 },
  ],
  chitty: { name: 'Mahall Monthly Chitty 2026', monthlyAmount: 4500, months: 12, startMonth: '2026-06', upi: 'mahall.chitty@sbi' },
  chittyMembers: [
    { id: 'cm1', code: 'C-001', name: 'Abdul Rahman K', phone: '9847000001', password: 'chitty123' },
    { id: 'cm2', code: 'C-002', name: 'Muhammed Ali P', phone: '9847000002', password: 'chitty123' },
    { id: 'cm3', code: 'C-003', name: 'Basheer T', phone: '9847000005', password: 'chitty123' },
    { id: 'cm4', code: 'C-004', name: 'Saidalavi M', phone: '9847000006', password: 'chitty123' },
    { id: 'cm5', code: 'C-005', name: 'Usman Haji', phone: '9847000004', password: 'chitty123' },
    { id: 'cm6', code: 'C-006', name: 'Fathima Beevi', phone: '9847000003', password: 'chitty123' },
  ],
  chittyPayments: [],
  auctionItems: [
    { id: 'au1', name: 'Nercha Rooster', description: 'Offered by a member family – proceeds to Nercha fund.', image: '', minBid: 500, increment: 50, endsAt: iso(3 * HOUR), status: 'live', bids: [
      { id: 'b1', bidder: 'Shafeeq', phone: '9847033331', amount: 500, time: iso(-50 * 60000) },
      { id: 'b2', bidder: 'Naseer', phone: '9847033332', amount: 600, time: iso(-30 * 60000) },
      { id: 'b3', bidder: 'Shafeeq', phone: '9847033331', amount: 700, time: iso(-10 * 60000) },
    ] },
    { id: 'au2', name: 'Bunch of Bananas (Nendran)', description: 'Harvest offering for the masjid.', image: '', minBid: 200, increment: 20, endsAt: iso(26 * HOUR), status: 'live', bids: [] },
  ],
  chats: [
    { id: 'ch1', userId: 'u2', subject: 'Boundary wall dispute with neighbour', householdInfo: 'MH-001 · Abdul Rahman K · 5 members · Ward 1', createdAt: iso(-26 * HOUR), messages: [
      { id: 'msg1', from: 'member', text: 'Assalamu alaikum. I need the committee to mediate a boundary issue with my neighbour.', time: iso(-26 * HOUR), read: true },
      { id: 'msg2', from: 'admin', text: 'Wa alaikum salam. We can arrange a meeting this Friday after Jumu\'ah. Please share details.', time: iso(-25 * HOUR), read: true },
    ] },
  ],
  nikkahApps: [],
  homeApps: [],
});

// Build demo chitty payments: members 1–4 paid months 1–4, members 5–6 paid 1–3.
export const seedChittyPayments = (state) => {
  const out = [];
  state.chittyMembers.forEach((m, i) => {
    const paid = i < 4 ? 4 : 3;
    for (let month = 1; month <= paid; month++) {
      out.push({ id: `cp_${m.id}_${month}`, memberId: m.id, month, amount: state.chitty.monthlyAmount, method: month % 2 ? 'upi' : 'cash', screenshot: '', status: 'confirmed', date: new Date(2026, 5 + month - 1, 5).toISOString() });
    }
  });
  return out;
};
