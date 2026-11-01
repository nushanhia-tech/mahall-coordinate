// Every option the masjid admin can switch ON (visible to users) or OFF (hidden everywhere users look).
// Used by the screens to hide things and by the server to refuse requests for switched-off features.
// Admin screens always stay visible so the committee can still manage data.

export const FEATURE_GROUPS = [
  ['Home page', [
    ['homeFinance', 'Financial transparency chart', 'Income, expense and balance on the home page.'],
    ['homeDonate', 'Donate section', 'QR codes and bank details for giving.'],
    ['donateMasjid', 'Masjid Fund channel', 'Show the first donation channel.'],
    ['donateRelief', 'Relief Fund channel', 'Show the second donation channel.'],
    ['donateNercha', 'Nercha / offering channel', 'Show the third donation channel.'],
    ['donationReceiptLookup', 'Donors can download their receipt', '"Get my receipt" lookup by phone number.'],
    ['homeEvents', 'Event calendar', ''],
    ['homeAchievements', 'Achievements', ''],
    ['homeInstitutions', 'Institutions & courses preview', ''],
    ['homeOpportunities', 'Opportunities preview', ''],
    ['homeServices', 'Mahall services list', ''],
    ['homeCommittee', 'Committee members', 'Names and phone numbers of the committee.'],
    ['homeHelpdesk', 'Emergency help desk', ''],
    ['homeMap', 'Map & directions', ''],
  ]],
  ['Rental cart', [
    ['rental', 'Rental cart', 'The whole rental service (only for logged-in Individual / home users).'],
    ['rentAdvance', 'Rent advance', 'Ask for a refundable advance when booking; deducted on return.'],
    ['rentHour', 'Rent by the hour', ''],
    ['rentDay', 'Rent by the day', ''],
    ['rentWeek', 'Rent by the week', ''],
    ['rentMonth', 'Rent by the month', ''],
    ['rentMyBookings', 'My Booking History tab', 'Members see their past and current bookings and download bills.'],
  ]],
  ['Chitty & auction', [
    ['chitty', 'Chitty money', ''],
    ['chittyUpi', 'Chitty – pay by UPI', 'Members upload a UPI screenshot.'],
    ['auction', 'Live auction (Lelam)', ''],
    ['auctionBidderNames', 'Show bidder names', 'Off = bids show as "Bidder 1, 2, …" to the public.'],
  ]],
  ['Applications', [
    ['nikkah', 'Nikkah application', ''],
    ['nikkahFee', 'Nikkah registration fee', 'Show the fee and ask for a payment receipt.'],
    ['homeApplication', 'New home number application', ''],
    ['homeGpsRequired', 'Require live GPS for new homes', 'Applicant must capture GPS standing at the home.'],
    ['courseApply', 'Course applications', ''],
    ['opportunitiesPage', 'Opportunities page', ''],
  ]],
  ['Mediation & enquiry', [
    ['mediation', 'Mediation / enquiry chat', ''],
    ['mediationKhateeb', 'Send to Khateeb', 'Allow choosing "Khateeb only" or "Both".'],
    ['mediationQuery', '"Doubt / Query" type', 'Off = only "Problem / Complaint".'],
  ]],
  ['Home portal', [
    ['vari', 'Monthly Vari (home subscription)', 'Members see their monthly dues.'],
    ['variUpi', 'Vari – pay by UPI', ''],
    ['variCash', 'Vari – "I paid cash"', 'Members tell the committee they paid cash to the collector.'],
    ['memberDonations', '"My donations" list', ''],
  ]],
  ['Institutions', [
    ['institutionReports', 'Financial report upload', 'Institutions submit reports to the committee.'],
  ]],
  ['Everywhere', [
    ['quickFind', 'Quick find (Ctrl + K)', 'The smart search box.'],
  ]],
];

export const FEATURE_KEYS = FEATURE_GROUPS.flatMap(([, items]) => items.map(([k]) => k));

// Everything is ON unless the admin switched it off.
export const featureOn = (config, key) => config?.toggles?.[key] !== false;

export const defaultConfig = () => ({
  toggles: {},
  nikkahFee: 500,
  nikkahFeeUpi: '',
  vari: { defaultRate: 100, startMonth: new Date().toISOString().slice(0, 7), upi: '', head: 'General Fund' },
});

// Months from the Vari start month up to now, newest first ("YYYY-MM").
export const variMonths = (startMonth, upTo = new Date()) => {
  const out = [];
  if (!/^\d{4}-\d{2}$/.test(startMonth || '')) return out;
  let [y, m] = startMonth.split('-').map(Number);
  const endY = upTo.getFullYear(), endM = upTo.getMonth() + 1;
  while ((y < endY || (y === endY && m <= endM)) && out.length < 120) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return out.reverse();
};

export const variRateFor = (household, config) => Number(household?.variRate) || Number(config?.vari?.defaultRate) || 0;
