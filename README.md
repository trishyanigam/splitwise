# Splitwise — Shared Expense Management

> **Enterprise-grade bill-splitting and group expense management platform.**  
> Upload, split, track, and settle shared expenses across groups — with full anomaly detection, audit trails, and CSV import automation.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Environment Variables](#environment-variables)
6. [Installation](#installation)
7. [Backend Setup](#backend-setup)
8. [Frontend Setup](#frontend-setup)
9. [Database Setup](#database-setup)
10. [Running the Application](#running-the-application)
11. [API Reference](#api-reference)
12. [Import Workflow](#import-workflow)
13. [Assumptions](#assumptions)
14. [Future Improvements](#future-improvements)
15. [Author](#author)

---

## Project Overview

**Splitwise** is a full-stack shared expense management application designed for groups of people who split bills, track balances, and settle debts. It supports manual expense entry, CSV bulk-import with anomaly detection, multi-currency conversions, debt simplification, and a comprehensive audit trail for every financial transaction.

The application is split into two independent workspaces:

| Workspace | Description | Port |
|-----------|-------------|------|
| `backend/` | REST API server (Node.js + Express + Prisma) | `5000` |
| `frontend/` | React SPA (Vite + Material UI) | `5173` |

---

## Features

### 🔐 Authentication
- User registration and login with **bcrypt** password hashing
- **JWT** token-based authentication (Bearer header + HTTP-only cookie)
- Automatic session expiry and client-side logout on `401`

### 👥 Group Management
- Create, view, and manage expense groups
- Add / remove members with full **membership history** tracking
- Time-bounded membership — balances respect join and leave dates

### 💸 Expense Management
- Add expenses to groups with title, amount, date, and currency
- Record the paying member (paidBy) and all participants
- Three split modes:
  - **Equal Split** — divide total evenly among all participants
  - **Exact Split** — assign specific currency amounts per person
  - **Percentage Split** — assign percentage shares (must sum to 100%)
- Split preview calculator before submitting

### 🤝 Settlements
- Record payments between group members to clear debts
- Multi-currency settlement support (INR, USD)
- Settlements factored into balance calculations automatically

### 💱 Currency Support
- Expenses and settlements can be entered in **INR** or **USD**
- Exchange rate field converts amounts to a common base currency (INR)
- All balance and debt calculations use the converted amount

### 📊 Balance & Debt Calculation
- Per-group **net balance** computed for every active member
- Membership date ranges applied — only active members on a transaction date are included
- **Debt simplification** using a greedy creditor–debtor matching algorithm — minimises the number of transactions needed to settle all debts

### 🗂️ Audit Trail
- Full **expense trace** showing which records contributed to a member's balance
- Group-level transaction history with filtering

### 📥 CSV Import Pipeline
The CSV import system is a multi-stage pipeline:

| Stage | Description |
|-------|-------------|
| **Upload** | CSV file parsed and staged in `ImportRecord` rows |
| **Anomaly Detection** | 7 built-in detectors flag data quality issues |
| **Review** | Reviewer approves, rejects, or manually fixes each anomaly |
| **Resolution Center** | Bulk strategy application (APPROVED / REJECTED / MERGE / CONVERT) |
| **Execution** | Valid records committed to the expense/settlement ledger |
| **Report** | Per-session import report with row and anomaly breakdowns |

**Anomaly detectors:**
- Missing required fields (title, amount, date, paidBy)
- Invalid date format
- Future-dated expenses
- Non-numeric amount
- Zero or negative amount
- Unusually large amount (> ₹1,00,000)
- Duplicate row detection (fingerprint-based)

### 📈 Reporting Dashboard
- **Import Report** — per-session metrics (rows imported / skipped / failed, anomaly resolution rate) with SVG radial rings and donut charts
- **System Summary** — platform-wide aggregate counts (groups, members, expenses, settlements, imports, outstanding balance) with spark bars and stacked breakdown charts

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^19.2 | UI component library |
| Vite | ^8.0 | Build tool and dev server |
| Material UI (MUI) | ^9.1 | Component library and theming |
| MUI X Data Grid | ^9.5 | Tabular data display |
| React Router DOM | ^7.17 | Client-side routing |
| Axios | ^1.17 | HTTP client with interceptors |
| React Hook Form | ^7.79 | Form state management |
| React Hot Toast | ^2.6 | Notification toasts |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥18 | Runtime |
| Express.js | ^5.2 | HTTP server and routing |
| Prisma ORM | ^6.19 | Database access layer |
| MySQL2 | ^3.22 | MySQL database driver |
| bcryptjs | ^3.0 | Password hashing |
| jsonwebtoken | ^9.0 | JWT generation and verification |
| multer | ^2.1 | CSV file upload handling |
| csv-parser | ^3.2 | CSV file parsing |
| dotenv | ^17.4 | Environment variable loading |
| nodemon | ^3.1 | Dev server auto-restart |
| cookie-parser | ^1.4 | Cookie parsing middleware |

---

## Project Structure

```
Splitwise/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database models and relations
│   │   └── migrations/            # Prisma migration history
│   ├── src/
│   │   ├── app.js                 # Express app setup (CORS, middleware, routes)
│   │   ├── server.js              # HTTP server entry point
│   │   ├── config/
│   │   │   └── prisma.js          # Prisma client singleton
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js  # JWT verification
│   │   │   └── errorMiddleware.js # Global error handler
│   │   ├── utils/
│   │   │   └── jwt.js             # Token generation helper
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── audit/
│   │   │   ├── balance/
│   │   │   ├── debt/
│   │   │   ├── expense/
│   │   │   ├── group/
│   │   │   ├── import/
│   │   │   ├── report/
│   │   │   ├── review/
│   │   │   ├── settlement/
│   │   │   └── split/
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   ├── audit/
│   │   │   ├── balance/
│   │   │   ├── currency/
│   │   │   ├── dashboard/
│   │   │   ├── debt/
│   │   │   ├── group/
│   │   │   ├── import/
│   │   │   │   ├── anomalies/
│   │   │   │   ├── execution/
│   │   │   │   ├── anomalyDetectionService.js
│   │   │   │   ├── csvImportService.js
│   │   │   │   ├── currencyImportService.js
│   │   │   │   └── settlementDetectionService.js
│   │   │   ├── policies/
│   │   │   ├── report/
│   │   │   ├── review/
│   │   │   └── split/
│   │   └── routes/
│   │       ├── index.js           # Route aggregator
│   │       ├── authRoutes.js
│   │       ├── groupRoutes.js
│   │       ├── memberRoutes.js
│   │       ├── expenseRoutes.js
│   │       ├── splitRoutes.js
│   │       ├── settlementRoutes.js
│   │       ├── balanceRoutes.js
│   │       ├── debtRoutes.js
│   │       ├── auditRoutes.js
│   │       ├── importRoutes.js
│   │       ├── importExecutionRoutes.js
│   │       ├── reviewRoutes.js
│   │       ├── resolutionRoutes.js
│   │       └── reportRoutes.js
│   ├── uploads/                   # Temporary CSV upload directory (auto-cleaned)
│   ├── .env
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── main.jsx               # React entry point
    │   ├── App.jsx                # Theme + Router wrapper
    │   ├── utils/
    │   │   └── theme.js           # MUI dark theme configuration
    │   ├── contexts/
    │   │   └── AuthContext.jsx    # Authentication context provider
    │   ├── hooks/
    │   │   └── useAuth.js         # Auth hook
    │   ├── routes/
    │   │   ├── AppRoutes.jsx      # Route definitions
    │   │   └── ProtectedRoute.jsx # Auth-guarded wrapper
    │   ├── layouts/
    │   │   └── AuthLayout.jsx     # Authenticated page shell with sidebar
    │   ├── services/
    │   │   ├── api.js             # Axios instance with interceptors
    │   │   ├── authService.js
    │   │   ├── groupService.js
    │   │   ├── expenseService.js
    │   │   ├── settlementService.js
    │   │   ├── balanceService.js
    │   │   ├── membershipService.js
    │   │   └── importService.js
    │   ├── components/
    │   │   ├── EqualSplit.jsx
    │   │   ├── ExactSplit.jsx
    │   │   ├── PercentageSplit.jsx
    │   │   ├── CurrencySelector.jsx
    │   │   ├── MembershipHistory.jsx
    │   │   ├── DebtSummaryCard.jsx
    │   │   ├── ImportSummary.jsx
    │   │   ├── ImportProgress.jsx
    │   │   ├── ReviewSummary.jsx
    │   │   ├── ResolutionHistory.jsx
    │   │   └── AddMemberDialog.jsx
    │   └── pages/
    │       ├── Auth/              # Login, Register
    │       ├── Dashboard/
    │       ├── Groups/            # GroupsList, GroupDetails
    │       ├── Expenses/          # ExpensesList, ExpenseDetails, CreateExpense
    │       ├── Settlements/       # SettlementsList, CreateSettlement, SettlementDetails
    │       ├── Balances/          # BalancesPage, SimplifiedDebts
    │       ├── Audit/             # AuditPage
    │       ├── Import/            # UploadCsv, ImportPreview, AnomalyReview,
    │       │                      # DuplicateReview, ManualFix, ResolutionCenter,
    │       │                      # ExecuteImport
    │       └── Reports/           # ImportReport, SystemSummary
    └── package.json
```

---

## Environment Variables

Create a `.env` file inside the `backend/` directory:

```env
# Database
DATABASE_URL="mysql://root:<password>@localhost:3306/shared_expenses"

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here

# Server
PORT=5000
```

> **Note:** Never commit `.env` to version control. The `.gitignore` already excludes it.

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Prisma-format MySQL connection string | `mysql://root:pass@localhost:3306/shared_expenses` |
| `JWT_SECRET` | Secret key used to sign JWT tokens | Any long random string |
| `PORT` | Port the backend server listens on | `5000` |

---

## Installation

### Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | 18.x |
| npm | 9.x |
| MySQL | 8.x |
| Git | any |

### Clone the repository

```bash
git clone https://github.com/trishyanigam/splitwise.git
cd splitwise
```

---

## Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install
```

---

## Frontend Setup

```bash
# Navigate to frontend (from project root)
cd frontend

# Install dependencies
npm install
```

---

## Database Setup

### 1. Create the MySQL database

```sql
CREATE DATABASE shared_expenses CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Configure the connection

Update `DATABASE_URL` in `backend/.env` with your MySQL credentials:

```env
DATABASE_URL="mysql://root:yourpassword@localhost:3306/shared_expenses"
```

### 3. Run Prisma migrations

```bash
cd backend
npx prisma migrate dev --name init
```

This will:
- Apply all migrations in `prisma/migrations/`
- Generate the Prisma Client

### 4. (Optional) Inspect the database

```bash
npx prisma studio
```

Opens a browser-based GUI at `http://localhost:5555` to browse and edit data.

### Database Schema Overview

| Model | Description |
|-------|-------------|
| `User` | Registered application users |
| `Group` | Expense groups owned by a user |
| `GroupMember` | Membership records with `joinedAt` / `leftAt` timestamps |
| `Expense` | Individual expense entries with split type and currency |
| `ExpenseParticipant` | Per-user share records for each expense |
| `Settlement` | Debt payment records between two members |
| `ImportSession` | Staged CSV upload session |
| `ImportRecord` | Individual CSV rows within a session |
| `ImportAnomaly` | Detected data issues within a session |
| `ImportResolution` | Reviewer decisions applied to anomalies |
| `ImportExecution` | Execution run records with counters |

---

## Running the Application

### Start the backend server

```bash
cd backend
npm run dev
# Starts nodemon on http://localhost:5000
```

### Start the frontend dev server

```bash
cd frontend
npm run dev
# Starts Vite on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

> Both servers must be running simultaneously. The frontend proxies all `/api` requests to `http://localhost:5000/api`.

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require an `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | ❌ | Register a new user |
| `POST` | `/api/auth/login` | ❌ | Login and receive JWT |
| `POST` | `/api/auth/logout` | ✅ | Clear session cookie |
| `GET`  | `/api/auth/me` | ✅ | Get current user profile |

### Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/groups` | Create a new group |
| `GET`  | `/api/groups` | List all groups for current user |
| `GET`  | `/api/groups/:id` | Get group details |
| `PUT`  | `/api/groups/:id` | Update group |
| `DELETE` | `/api/groups/:id` | Delete group |

### Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/groups/:groupId/members` | Add a member |
| `GET`  | `/api/groups/:groupId/members` | List members |
| `DELETE` | `/api/groups/:groupId/members/:userId` | Remove a member |

### Expenses

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/groups/:groupId/expenses` | Create an expense |
| `GET`  | `/api/groups/:groupId/expenses` | List expenses |
| `GET`  | `/api/groups/:groupId/expenses/:id` | Get expense detail |
| `DELETE` | `/api/groups/:groupId/expenses/:id` | Delete an expense |

### Splits

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/splits/preview` | Preview split calculation (EQUAL / EXACT / PERCENTAGE) |

### Settlements

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/groups/:groupId/settlements` | Create a settlement |
| `GET`  | `/api/groups/:groupId/settlements` | List settlements |
| `GET`  | `/api/groups/:groupId/settlements/:id` | Get settlement detail |
| `DELETE` | `/api/groups/:groupId/settlements/:id` | Delete a settlement |

### Balances & Debts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/groups/:groupId/balances` | Net balance per member |
| `GET` | `/api/groups/:groupId/debts` | Simplified debt transactions |

### CSV Import

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/import/upload` | Upload a CSV file |
| `GET`  | `/api/import/:sessionId` | Get session details |
| `GET`  | `/api/import/:sessionId/records` | List staged records |
| `GET`  | `/api/import/:sessionId/anomalies` | List detected anomalies |
| `PATCH`| `/api/import/anomalies/:id` | Update anomaly status |
| `POST` | `/api/import/anomalies/:id/resolve` | Apply resolution strategy |
| `GET`  | `/api/import/anomalies/:id/resolutions` | View resolution history |
| `GET`  | `/api/import/:sessionId/readiness` | Pre-flight readiness check |
| `POST` | `/api/import/:sessionId/execute` | Execute the import |
| `GET`  | `/api/import/:sessionId/execution` | Get execution status |

### Anomaly Review

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/review/anomalies/:id/approve` | Approve anomaly |
| `POST` | `/api/review/anomalies/:id/reject` | Reject anomaly |
| `POST` | `/api/review/anomalies/:id/manual-fix` | Apply manual field correction |
| `POST` | `/api/review/duplicates/resolve` | Resolve a duplicate pair |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/reports/import/:sessionId` | Per-session import report |
| `GET` | `/api/reports/system-summary` | System-wide aggregate summary |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/groups/:groupId/audit` | Group-level transaction audit log |

---

## Import Workflow

The CSV import system follows a **6-stage pipeline**:

```
┌───────────┐    ┌──────────────┐    ┌────────────┐
│  1. Upload │ →  │ 2. Stage CSV │ →  │ 3. Detect  │
│   CSV File │    │   Records   │    │  Anomalies │
└───────────┘    └──────────────┘    └────────────┘
                                           │
                        ┌──────────────────┘
                        ▼
┌───────────┐    ┌──────────────┐    ┌────────────┐
│ 6. Report │ ←  │ 5. Execute   │ ←  │  4. Review │
│  & Metrics│    │   Import     │    │  Anomalies │
└───────────┘    └──────────────┘    └────────────┘
```

### Expected CSV Format

```csv
title,amount,date,paidBy,currency,participants
"Team Lunch",1500,2026-06-10,Alice,INR,"Alice,Bob,Carol"
"Hotel",8000,2026-06-11,Bob,INR,"Alice,Bob"
```

| Column | Required | Description |
|--------|----------|-------------|
| `title` | ✅ | Expense description |
| `amount` | ✅ | Numeric amount |
| `date` | ✅ | Date (YYYY-MM-DD or parseable) |
| `paidBy` | ✅ | Name or email of the payer (must match a registered user) |
| `currency` | ❌ | `INR` or `USD` (defaults to INR) |
| `participants` | ❌ | Comma-separated names/emails |

### Anomaly Severities

| Severity | Effect on Record |
|----------|-----------------|
| `HIGH` | Record marked `INVALID` — skipped during execution unless manually fixed |
| `MEDIUM` | Record marked `REVIEW_REQUIRED` — can be approved/rejected by reviewer |
| `LOW` | Record marked `REVIEW_REQUIRED` — informational warning |

---

## Assumptions

1. **Currency conversion** — Exchange rates are entered manually per expense. The system does not call any live exchange rate API; `convertedAmount` is stored as entered.

2. **User resolution** — During CSV import execution, `paidBy` and participant columns are matched against registered users by **name** first, then by **email**. Unresolvable names cause the record to be skipped.

3. **Balance calculation scope** — Balances are computed in memory per group, per request. There is no pre-computed or cached balance table.

4. **Membership date enforcement** — An expense or settlement only affects the balance of a member who was **active on the transaction date** (joined before and not left before the date).

5. **Outstanding amount** in the system summary is calculated as `Σ expense.convertedAmount − Σ settlement.convertedAmount`, scoped to the user's groups. It represents gross unresolved debt before simplification.

6. **Import execution is idempotent per session** — A session can only be executed once (guarded by a `COMPLETED` execution check). Retrying a failed session creates a new execution record.

7. **File cleanup** — Uploaded CSV files are deleted from the `uploads/` directory immediately after staging, regardless of success or failure.

8. **Authentication is required** for all endpoints except `POST /api/auth/register` and `POST /api/auth/login`.

---

## Future Improvements

- [ ] **Live currency exchange rates** via an external API (e.g. Open Exchange Rates)
- [ ] **Email notifications** when a new expense is added or a settlement is recorded
- [ ] **Push notifications** for outstanding balance reminders
- [ ] **Role-based access control** — group admin vs member permissions
- [ ] **Recurring expenses** — automatic monthly/weekly expense creation
- [ ] **Expense categories and tags** for analytics and filtering
- [ ] **Mobile-responsive PWA** with offline support
- [ ] **Export to PDF / Excel** for group expense reports
- [ ] **Multi-language / i18n support**
- [ ] **Unit and integration test suite** (Jest + Supertest for backend, React Testing Library for frontend)
- [ ] **Docker Compose** setup for one-command local deployment
- [ ] **Pagination and search** on all list endpoints
- [ ] **Soft-delete** for expenses and settlements (restore from trash)
- [ ] **AI-powered anomaly suggestions** — GPT-based description-to-category classification

---

## Author

**Trishya Nigam**

- GitHub: [@trishyanigam](https://github.com/trishyanigam)

---

<div align="center">

Built with ❤️ using React, Node.js, Prisma, and MySQL

</div>
