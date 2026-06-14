# SCOPE.md — Shared Expense Management System

> This document defines the **intended scope** of the Splitwise application — what was deliberately built, what behaviors are supported, what was intentionally excluded, and what known limitations exist. It serves as the authoritative reference for evaluating the project against its requirements.

---

## Table of Contents

1. [Project Scope](#project-scope)
2. [Implemented Features](#implemented-features)
3. [Supported Behaviors](#supported-behaviors)
4. [Exclusions](#exclusions)
5. [Known Limitations](#known-limitations)

---

## Project Scope

The Splitwise Shared Expense Management System is designed to solve the following core problem:

> **Groups of people who share costs need a reliable way to track who paid what, calculate what each person owes, and record settlements — without ambiguity or manual spreadsheet errors.**

### Goals

- Allow multiple users to form **expense groups** and record shared bills
- Support **three split strategies** (equal, exact, percentage) to cover real-world billing scenarios
- Accurately compute **net balances** and generate **simplified debt transactions** to minimise the number of settlement payments required
- Provide a **bulk CSV import pipeline** with automated data quality checks, reviewer workflow, and safe execution into the ledger
- Maintain a complete **audit trail** of every financial action
- Expose a **reporting layer** for import session metrics and system-wide aggregates

### Non-Goals (by design)

The system does **not** aim to be a banking product, a real-time payment gateway, or a mobile-first consumer application. It is a **web-based expense management tool** targeted at small-to-medium groups with a trusted user base.

---

## Implemented Features

### ✅ Authentication

| Capability | Details |
|---|---|
| User registration | Name, email, bcrypt-hashed password |
| User login | Email + password → JWT token |
| Token delivery | Bearer header + HTTP-only cookie |
| Session expiry | `401` response clears client token and redirects to login |
| Route protection | All non-auth endpoints require a valid JWT (`authenticateToken` middleware) |

---

### ✅ Groups

| Capability | Details |
|---|---|
| Create group | Name, optional description, creator becomes owner |
| View groups | List all groups the authenticated user belongs to |
| Group details | Single group with member list and metadata |
| Update group | Name and description editable by owner |
| Delete group | Cascades to members, expenses, and settlements |

---

### ✅ Membership History

| Capability | Details |
|---|---|
| Add member | Records `joinedAt` timestamp on the `GroupMember` row |
| Remove member | Sets `leftAt` timestamp — record is retained, not deleted |
| Membership timeline | Full history of all joins and departures per group |
| Date-bounded balances | Expenses and settlements only apply to members **active on the transaction date** |
| Active member filter | `leftAt IS NULL` used to determine current membership |

---

### ✅ Expenses

| Capability | Details |
|---|---|
| Create expense | Title, amount, currency, date, paidBy, split type, participants |
| List expenses | All expenses for a group, ordered by date |
| Expense detail | Full record including participant shares |
| Delete expense | Cascades to `ExpenseParticipant` rows |
| Split preview | Calculator endpoint that returns per-user share amounts before saving |

---

### ✅ Split Types

| Type | Behaviour |
|---|---|
| **Equal** | Total divided evenly among all active participants |
| **Exact** | Each participant assigned a specific currency amount; amounts must sum to total |
| **Percentage** | Each participant assigned a percentage share; percentages must sum to 100% |

All three types are supported in both the manual expense form and the CSV import pipeline.

---

### ✅ Settlements

| Capability | Details |
|---|---|
| Create settlement | Payer, receiver, amount, currency, date, optional notes |
| List settlements | All settlements within a group |
| Settlement detail | Full record with payer and receiver info |
| Delete settlement | Removes the record; balances are recalculated on next request |
| Balance integration | Settlements are factored into net balance and debt simplification calculations |

---

### ✅ Currency Conversion

| Capability | Details |
|---|---|
| Supported currencies | **INR** (Indian Rupee), **USD** (US Dollar) |
| Exchange rate input | Manually entered per expense/settlement |
| Converted amount | Stored as `convertedAmount` (INR equivalent) |
| Balance basis | All balance calculations use `convertedAmount` where available; fall back to `amount` |
| Currency selector UI | Dropdown component (`CurrencySelector.jsx`) reused across expense and settlement forms |

> **Note:** Exchange rates are user-supplied. No live rate API is called.

---

### ✅ Balance Calculation

| Capability | Details |
|---|---|
| Net balance per member | `paid − owed` computed across all expenses and settlements in the group |
| Active membership enforcement | Only members active on the transaction date are included in calculations |
| Equal split recalculation | Active participant count on the expense date — not total group size — is used as divisor |
| Balance endpoint | Returns per-user `{ userId, userName, balance }` array for the group |
| Real-time | Computed on each request; no cached balance table |

---

### ✅ Debt Simplification

| Capability | Details |
|---|---|
| Algorithm | Greedy creditor–debtor matching (min-cost flow approximation) |
| Output | Optimised list of `{ from, to, amount }` transactions |
| Goal | Minimise the number of payment transactions needed to settle all debts |
| Basis | Operates on the `balance[]` array produced by the balance service |
| Endpoint | `GET /api/groups/:groupId/debts` |

---

### ✅ Audit Trail

| Capability | Details |
|---|---|
| Expense trace | Shows all expenses that contribute to a specific member's balance |
| Group audit log | Chronological history of expense and settlement events in a group |
| Audit endpoint | `GET /api/groups/:groupId/audit` |
| Immutability | Audit entries are derived from the underlying transaction tables — no separate log table to go out of sync |

---

### ✅ CSV Import Pipeline

The import system follows a **6-stage pipeline**:

```
Upload → Stage Records → Detect Anomalies → Review → Execute → Report
```

| Stage | Endpoint | Description |
|---|---|---|
| Upload | `POST /api/import/upload` | Parse CSV and create `ImportRecord` rows in `PENDING` status |
| Stage | (within upload) | Save raw row data as JSON in `ImportRecord.rawData` |
| Anomaly Detection | (within upload) | Run all 7 detectors; create `ImportAnomaly` rows; update record statuses |
| Review | `PATCH /api/import/anomalies/:id` | Approve, reject, or flag for manual fix |
| Resolution Center | `POST /api/import/anomalies/:id/resolve` | Apply bulk strategy (APPROVED / REJECTED / MERGE / CONVERT) |
| Readiness Check | `GET /api/import/:sessionId/readiness` | Pre-flight validation before execution |
| Execution | `POST /api/import/:sessionId/execute` | Commit `VALID` records as `Expense` or `Settlement` rows |
| Report | `GET /api/reports/import/:sessionId` | Per-session metrics and anomaly resolution summary |

---

### ✅ Anomaly Detection

Seven detectors run automatically after every CSV upload:

| Detector | Severity | Trigger Condition |
|---|---|---|
| `MissingFieldDetector` | HIGH | Any of `title`, `amount`, `date`, `paidBy` is empty |
| `InvalidDateDetector` | HIGH | Date field cannot be parsed as a valid date |
| `InvalidAmountFormatDetector` | HIGH | Amount field is not a valid number |
| `NonPositiveAmountDetector` | HIGH | Amount is zero or negative |
| `FutureDateDetector` | MEDIUM | Date is in the future |
| `LargeAmountDetector` | MEDIUM | Amount exceeds ₹1,00,000 |
| `DuplicateRowDetector` | MEDIUM | Row fingerprint (`title\|amount\|date\|paidBy`) already seen in session |

**Severity → Record Status mapping:**

| Anomaly Severity | Record Status |
|---|---|
| Any HIGH severity anomaly | `INVALID` |
| MEDIUM/LOW only | `REVIEW_REQUIRED` |
| No anomalies | `VALID` |

---

### ✅ Anomaly Review Workflow

| Action | Endpoint | Description |
|---|---|---|
| Approve | `POST /api/review/anomalies/:id/approve` | Accept the row as-is |
| Reject | `POST /api/review/anomalies/:id/reject` | Discard the row |
| Manual Fix | `POST /api/review/anomalies/:id/manual-fix` | Correct specific field values |
| Merge Duplicate | `POST /api/review/duplicates/resolve` | Choose which duplicate to keep |
| Resolution History | `GET /api/import/anomalies/:id/resolutions` | Full audit of decisions made |

---

### ✅ Import Execution

| Capability | Details |
|---|---|
| Record selection | Only records with status `VALID` are committed |
| `INVALID` records | Automatically skipped |
| `REVIEW_REQUIRED` records | Skipped unless reviewer resolved them to `VALID` |
| Settlement detection | Rows matching settlement keywords (`settlement`, `paid back`, `reimbursement`, etc.) are routed to `Settlement` creation |
| Expense creation | All other `VALID` rows are created as `Expense` records |
| User resolution | `paidBy` matched by name → email; unresolvable names cause the record to fail gracefully |
| Execution guard | A session with a `COMPLETED` execution cannot be executed again |
| Progress tracking | `ImportExecution` row updated with counters: `totalRecords`, `importedRecords`, `skippedRecords`, `failedRecords` |

---

### ✅ Reports

| Report | Endpoint | Metrics |
|---|---|---|
| Import Report | `GET /api/reports/import/:sessionId` | `totalRows`, `importedRows`, `skippedRows`, `failedRows`, `anomaliesDetected`, `anomaliesResolved`, `pendingAnomalies` |
| System Summary | `GET /api/reports/system-summary` | Users, groups, expenses (count + total amount), settlements (count + total amount), import session status breakdown, anomaly resolution health |

---

## Supported Behaviors

### Split Calculations

| Scenario | Supported |
|---|---|
| Equal split among all group members | ✅ |
| Equal split among a subset of members | ✅ |
| Exact amount per person | ✅ |
| Percentage allocation per person | ✅ |
| Split preview before saving | ✅ |
| Multi-currency expenses | ✅ |
| Equal split using active-member-on-date count (not current group size) | ✅ |

### Membership Scenarios

| Scenario | Supported |
|---|---|
| Member joins mid-lifecycle and only owes expenses after joining | ✅ |
| Member leaves and is excluded from future expenses | ✅ |
| Historical expense assigned before a member joined — member excluded | ✅ |
| Full membership history preserved after removal | ✅ |

### Import Scenarios

| Scenario | Supported |
|---|---|
| Clean CSV with no anomalies — direct execution | ✅ |
| CSV with HIGH anomalies — records marked INVALID, blocked from import | ✅ |
| CSV with MEDIUM anomalies — records flagged REVIEW_REQUIRED, reviewer decides | ✅ |
| Duplicate rows — flagged and resolved by reviewer (keep one / merge) | ✅ |
| Settlement rows auto-detected by keyword matching | ✅ |
| Negative or zero amounts caught before execution | ✅ |
| Unresolvable user names — record fails gracefully, counted in `failedRecords` | ✅ |
| Mixed-currency CSV rows | ✅ |

### Balance Scenarios

| Scenario | Supported |
|---|---|
| User paid for others — positive balance (receivable) | ✅ |
| User owes others — negative balance (debt) | ✅ |
| Settlement reduces outstanding debt | ✅ |
| Multi-currency balances unified via `convertedAmount` | ✅ |
| Zero-balance group (fully settled) | ✅ |

---

## Exclusions

The following features were **deliberately not implemented** within the current scope:

### 📵 Mobile Application
- No iOS or Android native app
- No React Native or Flutter implementation
- The web frontend is responsive but not optimised as a PWA

### 📡 Live Exchange Rate APIs
- No integration with Open Exchange Rates, Fixer.io, or any currency API
- Exchange rates must be entered manually by the user
- Rates are not validated or cross-checked against market values

### 📧 Email Notifications
- No transactional emails on expense creation, settlement, or anomaly detection
- No email verification on registration
- No password reset flow via email

### 🧾 OCR Receipt Scanning
- No image upload or optical character recognition
- Receipts cannot be photographed and auto-parsed into expense fields
- All data entry is manual or CSV-based

### 🌐 Multi-language / i18n Support
- The entire interface is in English only
- No localisation infrastructure (no `i18next` or equivalent)
- Currency symbols are displayed as `₹` (INR) and `$` (USD) only

### 🔴 Real-time WebSocket Updates
- No live balance updates when a group member adds an expense
- No push notifications or live dashboard refresh
- All data is fetched on-demand via REST API polling

### 💳 Payment Gateway Integration
- No ability to actually send money through the application
- Settlements are record-keeping entries only — not financial transactions
- No UPI, Stripe, PayPal, or bank transfer integration

### 👮 Role-Based Access Control (RBAC)
- No group admin vs member distinction beyond group ownership
- Any authenticated group member can perform all actions within the group
- No fine-grained permission scoping

---

## Known Limitations

| # | Limitation | Impact | Workaround |
|---|---|---|---|
| 1 | **Balance calculation is computed in-memory per request** — no caching or materialised view | Performance degrades on groups with hundreds of expenses | Acceptable for small-to-medium groups; a caching layer (Redis) would resolve at scale |
| 2 | **Exchange rates are manually entered** — no validation against real market rates | Users could enter incorrect rates, leading to inaccurate base-currency balances | Add a warning banner if the entered rate differs significantly from a reference rate |
| 3 | **CSV user resolution is name/email-based** — fuzzy matching is not supported | Slightly misspelled names (`"Alice"` vs `"alice "`) will fail to resolve | Normalise names during import; add a manual mapping step in the review workflow |
| 4 | **Single active execution per session** — retrying a failed execution requires understanding the failure | If execution fails partway through, partial imports may occur | Import is wrapped per-record in try/catch — partial success is counted correctly; full retry creates a new execution |
| 5 | **No pagination on most list endpoints** — all records returned in a single response | Large groups with thousands of expenses may cause slow API responses and large payloads | Add `limit` / `offset` query parameters to expense, settlement, and record endpoints |
| 6 | **Debt simplification is approximate** — greedy algorithm does not always produce the global minimum transaction set | The simplified debt list may not be perfectly optimal for all graph configurations | True minimum is NP-hard; the greedy approach is sufficient for practical group sizes |
| 7 | **Import session cannot be re-run after completion** — execution is one-shot per session | If a completed import has errors discovered post-execution, there is no rollback | Upload a corrected CSV as a new import session |
| 8 | **Membership enforcement depends on correct date data** — if a user enters a wrong expense date, membership rules may not apply correctly | Historical corrections could cause balance inaccuracies | Validate expense dates against reasonable ranges; add date-change audit entries |
| 9 | **No soft-delete for expenses or settlements** — deletions are permanent and immediate | Accidental deletions cannot be reversed | Add a `deletedAt` column and a restore endpoint in a future version |
| 10 | **Settlement detection in CSV import uses keyword matching only** — no ML or semantic analysis | Expenses with coincidental settlement keywords may be misclassified | Reviewer can override the classification during the review stage |

---

<div align="center">

*This document reflects the state of the system as of June 2026.*

</div>
