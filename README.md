# Mahall Coordinating System

Smart Community & Masjid ERP — React + Vite + Tailwind + Recharts + jsPDF.
All data is stored in the browser (localStorage) and syncs live between open tabs.

## Run
```
npm install
npm run dev            # development server
npm run build          # normal build in dist/
npm run build:single   # one self-contained HTML file in dist-single/index.html
```

## Demo logins
| Portal | Username | Password |
|---|---|---|
| Admin | admin | admin123 |
| Individual | member | member123 |
| Khateeb | khateeb | khateeb123 |
| Institution | madrasa | inst123 |
| Chitty member (on the Chitty page) | C-001 | chitty123 |

## Modules
- **Phase 1 – Dashboard:** live counters, financial transparency chart, Donate Us (3 channels with QR + bank),
  map, committee, help desk, event calendar, achievements, courses, opportunities, services.
- **Phase 2 – Admin:** households, accounts ledger with bills and running balance, account heads,
  weekly/monthly/annual/custom/account-wise PDF reports, donation approval (posts to ledger),
  events with reschedule tracking, achievements, portal users, location/committee/help desk, backup/restore.
- **Phase 3 – Services:** Rental Cart (cheapest-unit late penalty + PDF bill), Chitty Money
  (member login, UPI proof, admin confirm/cash, monthly + complete PDFs), Live Auction (countdown, live graph, top bidder, result PDF).
- **Phase 4 – Community:** WhatsApp-style mediation chat, Nikkah application, New Home Number application
  (approval creates the household), courses & institutions with applications, opportunities.

## Code map
- `src/store` – shared state (`AppContext.jsx`) and demo data (`seed.js`)
- `src/utils` – formatting, penalty maths, finance helpers, PDF engine
- `src/components` – shared UI (`CrudManager`, modals, calendar, donate)
- `src/pages` – dashboard, login, role portals
- `src/admin` – admin portal tabs
- `src/services` – rental, chitty, auction
- `src/modules` – mediation chat, nikkah, new home, courses/opportunities
