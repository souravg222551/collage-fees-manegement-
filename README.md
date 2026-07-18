# College Fee Management — Admin Portal

A production-ready, admin-only fee management system for colleges/universities. Built as a full-stack ERP-style application: Student records, fee collection, printable receipts, live dashboard, and reports — nothing else.

---

## Tech Stack

**Frontend:** React 19 + Vite, Tailwind CSS, React Router, Axios, TanStack Query, React Hook Form, Lucide Icons, Framer Motion, Recharts, react-hot-toast

**Backend:** Node.js, Express.js, JWT auth (httpOnly cookie), bcrypt, Multer, express-validator, Helmet, rate limiting

**Database:** Neon PostgreSQL via Prisma ORM

---

## Project Structure

```
college-fee-management/
├── client/          React admin dashboard (Vite)
└── server/          Express REST API + Prisma
```

---

## 1. Database Setup (Neon PostgreSQL)

1. Create a free project at https://neon.tech
2. Copy the **pooled** connection string (for `DATABASE_URL`) and the **direct** connection string (for `DIRECT_URL`) from your Neon dashboard.

---

## 2. Backend Setup

```bash
cd server
cp .env.example .env
# edit .env: DATABASE_URL, DIRECT_URL, JWT_SECRET, CLIENT_URL, SEED_ADMIN_* etc.

npm install
npx prisma migrate dev --name init   # creates tables in Neon
npm run seed                          # creates the first Super Admin
npm run dev                           # starts API on http://localhost:5000
```

The seed script prints the admin login you'll use to sign in (email/password come from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env`, defaulting to `admin@college.edu` / `Admin@12345` — **change this in production**).

### Key backend commands
| Command | Purpose |
|---|---|
| `npm run dev` | Start API with nodemon (auto-reload) |
| `npm start` | Start API in production mode |
| `npm run prisma:studio` | Visual DB browser |
| `npm run prisma:migrate` | Create/apply a new migration |
| `npm run seed` | Re-run the admin/settings seed |

---

## 3. Frontend Setup

```bash
cd client
cp .env.example .env
# set VITE_API_URL if your API isn't on http://localhost:5000/api

npm install
npm run dev      # starts on http://localhost:5173
```

---

## Features Implemented

- **Auth:** JWT (httpOnly cookie + bearer fallback), bcrypt password hashing, rate-limited login, role-based middleware (`SUPER_ADMIN` / `ADMIN`), change password, edit profile.
- **Dashboard:** live totals (students, fees collected, outstanding, today's/monthly collection), recent transactions, monthly collection trend, payment-status breakdown, collection-by-semester — all backed by real Prisma aggregation queries.
- **Students:** full CRUD, photo upload, search, filters (department/course/branch/semester/section/session/status), pagination, auto-generated Student ID.
- **Fees:** collect fee (partial or full), automatic balance/status calculation (`totalAmount + fine − discount − scholarship − amountPaid`), edit/delete payment, fee type, payment mode, per-student payment history.
- **Receipts:** auto-issued on any payment > 0, sequential receipt numbers, QR code, printable A4 PDF (via PDFKit) with college branding, fee breakdown, and signature line.
- **Reports:** daily/weekly/monthly/pending/paid/discount/scholarship, with summary totals, CSV export, and landscape PDF export.
- **Settings:** college name/logo/address/contact, academic session, receipt prefix, authorized signatory.
- **UI:** dark mode, sticky sidebar/header, loading skeletons, toasts, animated modals, responsive tables with pagination.

## Security

- Helmet, CORS locked to `CLIENT_URL`, rate limiting (global + login-specific), XSS sanitization, input validation on every mutating route, centralized error handling that normalizes Prisma/JWT/Multer errors, environment-based secrets — nothing hardcoded.

## Deployment

- **Frontend:** deploy `client/` to Vercel — set `VITE_API_URL` to your deployed API URL.
- **Backend:** deploy `server/` to Render or Railway — set all `.env` values (especially `DATABASE_URL`/`DIRECT_URL` from Neon and `CLIENT_URL` to your Vercel domain), then run `npx prisma migrate deploy` and `npm run seed` once.
