# DECISIONS.md — Architectural & Business Decision Log

> This document records the **major technical and product decisions** made during the design and implementation of the Splitwise Shared Expense Management System. Each entry explains the decision, the reasoning behind it, and the tradeoffs accepted.
>
> These decisions are recorded to provide transparency, aid future maintainers, and explain why seemingly simpler alternatives were not chosen.

---

## Table of Contents

1. [Prisma ORM over Raw SQL or Other ORMs](#decision-1--prisma-orm-over-raw-sql-or-other-orms)
2. [MySQL over Other Databases](#decision-2--mysql-over-other-databases)
3. [Dynamic Balance Calculation over Stored Balances](#decision-3--dynamic-balance-calculation-over-stored-balances)
4. [Settlements Stored Separately from Expenses](#decision-4--settlements-stored-separately-from-expenses)
5. [Anomaly Resolution Requires Explicit User Approval](#decision-5--anomaly-resolution-requires-explicit-user-approval)
6. [INR as the Base Currency](#decision-6--inr-as-the-base-currency)
7. [Import Records Staged Before Expense Creation](#decision-7--import-records-staged-before-expense-creation)
8. [Membership History Preserved Instead of Deleting Members](#decision-8--membership-history-preserved-instead-of-deleting-members)
9. [Greedy Algorithm for Debt Simplification](#decision-9--greedy-algorithm-for-debt-simplification)
10. [Audit Trail Implementation](#decision-10--audit-trail-implementation)

---

## Decision 1 — Prisma ORM over Raw SQL or Other ORMs

### Decision

Use **Prisma ORM** (`@prisma/client`) as the exclusive database access layer. No raw SQL queries, no alternative ORM (Sequelize, TypeORM, Knex).

### Reason

The application has a moderately complex relational schema with 11 models, multiple foreign keys, cascade rules, and composite unique constraints. Maintaining raw SQL across all these relationships would produce fragile, hard-to-read query strings. Prisma solves this with:

- A **schema-first** approach (`schema.prisma`) that is the single source of truth for the database structure
- **Auto-generated, fully typed** client that eliminates string-based query construction
- A **migration system** (`prisma migrate dev`) that produces a versioned, reviewable history of every schema change
- Excellent support for **nested reads and writes** (`include`, `select`, `createMany`) that match the access patterns of this application

Sequelize was considered but rejected because it requires verbose model definitions and its migration tooling is more manual. TypeORM was considered but rejected due to its heavier decorator-based syntax and steeper learning curve for JavaScript projects.

### Benefits

- Schema changes are tracked in `prisma/migrations/` — no silent, unversioned ALTER TABLE statements
- `findUnique`, `findMany`, `createMany`, `updateMany` are readable and type-safe
- `include` makes it trivial to load related records (e.g. anomalies with their parent records) without hand-writing JOINs
- `groupBy` and `aggregate` (`_count`, `_sum`) are used directly in the reporting layer without raw SQL

### Tradeoffs

| Tradeoff | Accepted Because |
|---|---|
| Prisma generates a large `node_modules/@prisma` directory | Acceptable for a Node.js project; build size is not a constraint |
| Prisma does not support all database-specific features (e.g. full-text search, stored procedures) | None of those features are required by this application |
| Learning curve for contributors unfamiliar with Prisma | Schema-first approach is intuitive and well-documented; the investment pays off quickly |
| Prisma Client must be regenerated after every schema change (`npx prisma generate`) | Minor inconvenience; covered in the setup documentation |

---

## Decision 2 — MySQL over Other Databases

### Decision

Use **MySQL 8** as the relational database engine. PostgreSQL and SQLite were considered but not selected.

### Reason

MySQL is the most widely deployed open-source relational database in India and globally. For a project targeting Indian users (INR as base currency, Indian developer ecosystem), MySQL provides:

- **Universal availability** — MySQL is supported by virtually every cloud host, VPS, and shared hosting provider
- **Mature ecosystem** — `mysql2` is a battle-tested Node.js driver with Prisma first-class support
- **Familiarity** — The developer is more familiar with MySQL's tooling (MySQL Workbench, phpMyAdmin) than PostgreSQL's
- **Sufficient feature set** — The schema uses standard SQL types (`VARCHAR`, `DECIMAL`, `JSON`, `DATETIME`) that MySQL handles correctly

SQLite was ruled out because it is a file-based database, not suitable for a multi-user web application with concurrent writes. PostgreSQL was considered but the additional operational complexity (different auth model, different default port, different CLI tools) was not justified given that no PostgreSQL-specific feature (JSONB indexing, CTEs, array columns) was required.

### Benefits

- `mysql2` driver integrates seamlessly with Prisma's connection pooling
- `DECIMAL(10,2)` columns are used for all monetary amounts — avoiding floating-point rounding errors that `FLOAT` or `DOUBLE` would introduce
- `JSON` column type (used in `ImportRecord.rawData`) is well-supported in MySQL 8+
- Connection strings follow the familiar `mysql://user:pass@host:port/db` format

### Tradeoffs

| Tradeoff | Accepted Because |
|---|---|
| MySQL's default transaction isolation (`REPEATABLE READ`) may cause phantom reads in some edge cases | The application does not perform complex concurrent writes to the same rows; single-user session model reduces risk |
| MySQL does not enforce `CHECK` constraints as strictly as PostgreSQL in older versions | Prisma-level validations and service-layer guards compensate |
| No native `ENUM` support as flexible as PostgreSQL | Prisma maps enums to MySQL `ENUM` columns correctly; no issues observed |

---

## Decision 3 — Dynamic Balance Calculation over Stored Balances

### Decision

**Do not store** computed balances in a dedicated table. Recalculate net balances **on every request** from raw `Expense`, `ExpenseParticipant`, and `Settlement` records.

### Reason

Storing pre-computed balances introduces a **cache invalidation problem**: every time an expense is created, updated, or deleted — or a settlement is recorded — the stored balance for every affected member must be updated atomically. Missing an update produces incorrect data silently.

Dynamic calculation trades compute time for **guaranteed correctness**:

- Balance is always derived from the authoritative source — the actual transaction records
- No possibility of stale or inconsistent cached values
- Membership date enforcement (a member's balance only includes transactions while they were active) is naturally expressed as a filter during computation — it cannot easily be maintained in a stored column

For groups of practical size (< 500 expenses), the in-memory computation completes in milliseconds.

### Benefits

- **Zero risk of balance drift** — no sync bug between the transaction table and a balance cache
- Membership timeline enforcement is applied correctly on every calculation without special invalidation logic
- Simplifies expense and settlement creation — no balance table to update in the same transaction
- Easy to audit — given the raw expense data, the balance can always be independently verified

### Tradeoffs

| Tradeoff | Accepted Because |
|---|---|
| Computation scales linearly with the number of expenses in a group | Acceptable for groups with hundreds of expenses; a caching layer (Redis) can be added when groups exceed 1,000+ transactions |
| Multiple API calls to the same group's balance endpoint in rapid succession duplicate the computation | Stateless REST design; a short-lived in-memory cache per request cycle would address this if needed |
| No historical snapshot of balances at a past point in time | A separate snapshot feature can be added without changing the core calculation model |

---

## Decision 4 — Settlements Stored Separately from Expenses

### Decision

Use a dedicated **`Settlement`** model rather than marking certain `Expense` records as settlement-type entries.

### Reason

Settlements and expenses are **semantically different financial events**:

- An **expense** represents money spent on a shared cost (e.g. dinner, hotel) that is divided among participants
- A **settlement** represents a direct **debt repayment** from one member to another — no split, no participants, just a bilateral transfer

Mixing them in a single table would require:
- Nullable `payer` and `receiver` columns on expenses, or vice versa
- A `type` discriminator column with conditional validation
- Query filters on `type` everywhere expenses are listed

The separate model keeps the schema clean and each table's purpose unambiguous.

### Benefits

- `Settlement` has its own dedicated columns (`payerId`, `receiverId`, `notes`) appropriate to its semantics
- Expenses and settlements are independently listed, paginated, and reported
- Balance calculation can apply them in separate loops with different logic, clearly expressed in code
- The CSV import pipeline can route rows to the correct table based on settlement keyword detection without ambiguity

### Tradeoffs

| Tradeoff | Accepted Because |
|---|---|
| Two separate endpoints for creating expense vs settlement | The distinction is meaningful to users; merging them would create a more confusing single endpoint |
| Balance calculation must query both tables | Two queries per balance calculation — acceptable overhead; both are indexed by `groupId` |

---

## Decision 5 — Anomaly Resolution Requires Explicit User Approval

### Decision

Detected anomalies are **never automatically resolved or silently discarded**. Every anomaly with a non-`OPEN` status must reach that status through an explicit reviewer action (approve, reject, manual fix, or merge).

### Reason

Financial data correctness is the primary obligation of an expense management system. Automatically overriding or suppressing anomalies — even LOW severity ones — risks committing incorrect data to the ledger:

- A **MEDIUM** severity duplicate row might be a genuine second expense at the same amount, or it might be a copy-paste error. Only the user knows.
- A **future date** anomaly might be a pre-planned expense or a typo. Auto-approving it could create phantom future expenses.
- An **unusually large amount** might be a legitimate hotel booking or an extra zero typed accidentally.

The reviewer workflow forces a **deliberate decision** before any anomalous record enters the ledger.

### Benefits

- No accidental data commits from ambiguous rows
- Full resolution history (`ImportResolution`) creates an auditable trail of every reviewer decision
- The review UI surfaces anomaly context (original row data, detected issue, suggested action) so reviewers can make informed decisions
- The readiness validator (`assertImportReady`) blocks execution if any anomaly is still `OPEN` — preventing accidental partial imports

### Tradeoffs

| Tradeoff | Accepted Because |
|---|---|
| More steps required before a CSV import is complete | The extra steps prevent financial errors; bulk-approve is available for low-risk sessions |
| Reviewer must understand the domain to make correct decisions | Expected — the system is used by the group owner or an accountable member, not anonymous users |
| Sessions with many anomalies can take significant time to review | The Resolution Center provides a bulk-strategy interface to handle multiple anomalies at once |

---

## Decision 6 — INR as the Base Currency

### Decision

All balance calculations, debt simplification, and outstanding amount reporting use **INR (Indian Rupee) as the single base currency**. Multi-currency amounts are stored as `convertedAmount` in INR.

### Reason

The application is designed primarily for **Indian users** who operate in groups where the majority of expenses are INR-denominated. Choosing a single base currency simplifies balance computation substantially:

- All member net balances are expressed in the same unit — no cross-currency comparison logic required
- Debt simplification operates on a single numeric value per member — no currency-aware graph matching needed
- The outstanding amount in reports is a single subtraction (`Σ expenses − Σ settlements`) rather than a per-currency breakdown

USD was included as a supported input currency (for international trips, online purchases) but converts immediately to INR via the `exchangeRate` field.

### Benefits

- Balance calculations are simple arithmetic on `DECIMAL` values — no currency conversion at read time
- Outstanding balance reporting is accurate without currency-aware aggregation
- Users transacting exclusively in INR (the majority) have zero friction — no currency selection required for most expenses

### Tradeoffs

| Tradeoff | Accepted Because |
|---|---|
| Exchange rates are entered manually — no live conversion | Acceptable for the current scope; a rate API integration is documented as a future improvement |
| Non-INR groups (e.g. fully USD-denominated) have less accurate balances if exchange rates are not entered | System warns via the expense form; the `convertedAmount` field is optional but recommended |
| INR-centric design may limit adoption in markets where INR is not relevant | Intentional — the current scope targets Indian users; internationalisation is a future improvement |

---

## Decision 7 — Import Records Staged Before Expense Creation

### Decision

CSV rows are **saved as `ImportRecord` rows** (with raw JSON data and a `PENDING` status) before any expense or settlement is created. Expenses are only created during the explicit **execution** phase.

### Reason

This **staging pattern** (also known as a two-phase commit for imports) separates the risky parsing and validation phase from the safe write phase:

1. **Stage** — parse the CSV, save every row as a raw record, detect anomalies. No business data is written.
2. **Review** — the user inspects and resolves anomalies at their own pace.
3. **Execute** — only after the user explicitly triggers execution do records enter the `Expense` / `Settlement` tables.

Without staging, a single bad row in a 500-row CSV could cause a partial import with no way to distinguish which rows succeeded and which failed. With staging, every row's status is tracked independently.

### Benefits

- **Idempotent staging** — the CSV can be re-uploaded if parsing fails; no partial expenses are created
- **Anomaly detection before any data is committed** — the ledger is never polluted by bad rows
- Row-level status tracking (`PENDING` → `VALID` / `INVALID` / `REVIEW_REQUIRED`) gives reviewers full visibility into every record
- Execution can be cancelled or retried without any ledger impact
- The `ImportExecution` record provides a permanent record of what was imported, skipped, and failed for each run

### Tradeoffs

| Tradeoff | Accepted Because |
|---|---|
| More database writes per import (one `ImportRecord` per CSV row) | Storage cost is negligible; correctness outweighs storage concerns |
| The user must take multiple steps (upload → review → execute) to complete an import | Intentional — the review step is a safety gate, not friction |
| `ImportRecord` rows persist in the database after execution | They serve as an audit of the import; a cleanup job can archive old sessions in a future version |

---

## Decision 8 — Membership History Preserved Instead of Deleting Members

### Decision

When a user is removed from a group, the `GroupMember` record is **not deleted**. Instead, the `leftAt` field is set to the current timestamp. The record remains in the database permanently.

### Reason

Deleting a membership record would make it impossible to correctly calculate historical balances:

- If Alice paid for an expense on 1 June, was in the group until 15 June, and is then removed — her contribution to the June 1st expense must still be credited to her balance, and the other members must still owe her for it.
- Deleting the `GroupMember` row would orphan historical expense participants and break balance calculations for the entire group's history.

The `leftAt` timestamp allows the balance service to apply **membership date bounds** precisely:
- `joinedAt ≤ transactionDate` — member was present
- `leftAt IS NULL OR leftAt ≥ transactionDate` — member had not yet left

### Benefits

- Historical expense calculations remain correct after a member leaves
- The membership timeline is queryable — useful for auditing who was in a group when a specific expense was recorded
- Re-adding a previously removed member creates a new `GroupMember` row with a new `joinedAt`, preserving the gap in history
- Consistent with standard soft-delete patterns — no accidental data loss

### Tradeoffs

| Tradeoff | Accepted Because |
|---|---|
| `GroupMember` table grows indefinitely for groups with high churn | Membership history is small (one row per join event); storage is not a concern at this scale |
| `leftAt IS NULL` filter must be applied in every active-member query | The filter is a simple indexed condition; no performance concern |
| Removed members still appear in membership history UI | Intentional — this is a feature, not a bug; the timeline shows join and leave events clearly |

---

## Decision 9 — Greedy Algorithm for Debt Simplification

### Decision

Implement debt simplification using a **greedy creditor–debtor matching algorithm** rather than an exact minimum-cost flow algorithm.

### Reason

The mathematically optimal solution to debt simplification (finding the absolute minimum number of transactions) is equivalent to a **minimum weighted graph partitioning** problem, which is NP-hard for general graphs. For a web application serving small groups, a provably optimal but exponential-time algorithm is neither necessary nor practical.

The greedy approach:

1. Separates members into **creditors** (positive balance) and **debtors** (negative balance)
2. Sorts both lists in descending order of amount
3. Repeatedly matches the largest debtor with the largest creditor
4. Generates a transaction and reduces both balances until all are settled

This produces a near-optimal result — typically achieving the theoretical minimum or within one transaction of it — in O(n log n) time.

### Benefits

- Executes in microseconds for groups of any practical size (< 100 members)
- Produces a simple, readable list of `{ from, to, amount }` transactions
- Easy to understand and audit — the algorithm's logic is transparent
- No external dependency required — implemented in ~60 lines of plain JavaScript

### Tradeoffs

| Tradeoff | Accepted Because |
|---|---|
| Not guaranteed to find the global minimum transaction set | The difference is at most 1–2 transactions; negligible for practical groups |
| Does not account for pre-existing settlement relationships or payment preferences | Out of scope — the simplification is advisory, not enforced |
| Cannot produce multiple equally-optimal solutions for user choice | The single greedy solution is sufficient for the application's purpose |

---

## Decision 10 — Audit Trail Implementation

### Decision

Implement an **audit trail** that traces each group member's balance contribution back to the individual expense and settlement records that produced it. The trail is derived from live transaction data, not from a separate log table.

### Reason

Financial applications have an obligation of **explainability** — users need to understand *why* their balance is what it is, not just what the number is. Without an audit trail:

- A user who sees they owe ₹2,340 has no way to verify which expenses contributed to that amount
- Disputes between group members cannot be resolved without manually scrolling through all expense records
- Errors (e.g. a wrong split type applied to an old expense) are invisible until someone notices the balance is wrong

The decision to derive the audit trail from live data (rather than an event log table) avoids maintaining a second source of truth that can drift out of sync with the actual records.

### Benefits

- **Always accurate** — the audit trace reflects the current state of all expense and settlement records; there is no separate log that can become stale
- **Expense trace** shows every transaction that affected a specific member's balance in a group, with amounts and dates
- **Group-level history** gives a chronological view of all financial events in a group
- Supports dispute resolution — any member can independently verify any other member's balance contribution
- Complements the CSV import resolution history (`ImportResolution`) — the full paper trail from raw CSV row to committed expense is queryable

### Tradeoffs

| Tradeoff | Accepted Because |
|---|---|
| The audit view requires querying the same transaction tables as the balance calculation — no dedicated audit store | The queries are indexed and performant; a materialised audit log would add complexity without proportional benefit at current scale |
| Historical state cannot be replayed if an expense is deleted | Deletes are permanent (no soft-delete yet); this is a known limitation documented in SCOPE.md |
| No system-level event log (e.g. "user X deleted expense Y at time Z") | User-action logging is a separate concern from financial audit and is documented as a future improvement |

---

<div align="center">

*Decision log last updated: June 2026*

</div>
