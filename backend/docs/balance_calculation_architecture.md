# Balance Calculation & Debt Simplification Architecture

This document describes the architectural design and algorithm for calculating net balances and simplifying debts ("who owes whom") inside a group. It is designed to be currency-agnostic, transaction-efficient, and temporality-aware.

---

## 1. Architectural Components

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Database (MySQL)                              │
│  (GroupMember, Expense, ExpenseParticipant, Settlement tables)          │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Raw Data Fetch
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Temporal Membership Filter                      │
│   - Drops inactive members for any transaction based on its date       │
│   - Validates that joins/leaves bounds enclose the transaction date    │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Validated Transactions
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Ledger Balance Calculator                       │
│   - Computes: NetBalance = Paid + ReceivedSettles - Owed - PaidSettles │
│   - Translates all operations to INR using `convertedAmount`          │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Net Balances List (Creditors & Debtors)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Debt Simplification Engine                       │
│   - Runs greedy matching minimization algorithm                        │
│   - Outputs optimal "Who owes whom" transaction set                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Mathematical Formulations

To ensure consistency, calculations are processed in **INR equivalent** using the `convertedAmount` field.

For a group $G$ and user $U$:

### A. Total Amount Paid by User ($P_U$)
Sum of INR equivalents of all expenses where the user was the payer:
$$P_U = \sum_{e \in Expenses, e.paidById = U} e.convertedAmount$$

### B. Total Amount Owed by User ($O_U$)
Sum of the user's split share in INR equivalents. If the split is stored as a share amount in original currency, it is scaled proportionally to the converted amount:
$$O_U = \sum_{p \in Participations(U)} \left( \frac{p.shareAmount}{p.expense.amount} \times p.expense.convertedAmount \right)$$

### C. Total Settlements Paid by User ($SP_U$)
Sum of INR equivalents of all settlement payments sent by the user:
$$SP_U = \sum_{s \in Settlements, s.payerId = U} s.convertedAmount$$

### D. Total Settlements Received by User ($SR_U$)
Sum of INR equivalents of all settlement payments received by the user:
$$SR_U = \sum_{s \in Settlements, s.receiverId = U} s.convertedAmount$$

### E. Net Balance ($B_U$)
$$B_U = P_U - O_U + SR_U - SP_U$$

* A positive balance ($B_U > 0$) indicates the user is a **creditor** (is owed money).
* A negative balance ($B_U < 0$) indicates the user is a **debtor** (owes money).
* The sum of all net balances in a group must equal zero: $\sum_{u \in Members} B_u = 0$.

---

## 3. Temporal Validation Rules (Join/Leave Dates)

Members can only participate in splits or record settlements for events occurring within the boundaries of their active membership.

For a given transaction date $T$:
1. A membership record is retrieved for User $U$: `joinedAt`, `leftAt`.
2. $U$ is defined as **Active** at date $T$ if and only if:
   $$joinedAt \le T \le leftAt \quad (\text{if leftAt is not null})$$
   $$joinedAt \le T \quad (\text{if leftAt is null})$$
3. **Filtering Rule**:
   * Any expense participant share where the user is inactive at `expenseDate` is ignored (balance weight = 0).
   * Any settlement recorded on a date where either payer or receiver was inactive in the group is marked as an anomaly or bypassed.

---

## 4. Debt Simplification Algorithm (Greedy Match)

This algorithm simplifies mutual debts (e.g. A owes B $10, B owes C $10 becomes A owes C $10), returning the minimum number of transactions needed to resolve all balances.

### Pseudocode
```javascript
function simplifyDebts(memberBalances) {
  // Input: Array of objects { userId: number, balance: number }
  
  // Separate into debtors (negative) and creditors (positive)
  let debtors = [];
  let creditors = [];
  
  for (const member of memberBalances) {
    // Round to 2 decimal places to prevent float precision noise
    const balance = Math.round(member.balance * 100) / 100;
    if (balance < 0) {
      debtors.push({ userId: member.userId, amount: -balance });
    } else if (balance > 0) {
      creditors.push({ userId: member.userId, amount: balance });
    }
  }
  
  // Sort lists in descending order of amounts
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  
  const transactions = [];
  
  let dIdx = 0;
  let cIdx = 0;
  
  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    
    // Skip settled balances
    if (debtor.amount < 0.01) {
      dIdx++;
      continue;
    }
    if (creditor.amount < 0.01) {
      cIdx++;
      continue;
    }
    
    // Settle the minimum of the debt or credit
    const settleAmount = Math.min(debtor.amount, creditor.amount);
    
    transactions.push({
      from: debtor.userId,
      to: creditor.userId,
      amount: settleAmount // value in INR
    });
    
    // Subtract settled amount
    debtor.amount = Math.round((debtor.amount - settleAmount) * 100) / 100;
    creditor.amount = Math.round((creditor.amount - settleAmount) * 100) / 100;
    
    // Move pointers if fully settled
    if (debtor.amount < 0.01) {
      dIdx++;
    }
    if (creditor.amount < 0.01) {
      cIdx++;
    }
  }
  
  return transactions;
}
```

---

## 5. Implementation & Optimization Strategy

1. **Database Views / Aggregate Queries**:
   * Calculate $P_U$ and $O_U$ directly in SQL queries using sum/joins where possible to minimize JS memory consumption.
   * Filter membership date ranges in Prisma raw sql or select queries using:
     ```prisma
     where: {
       groupMember: {
         joinedAt: { lte: transactionDate },
         OR: [
           { leftAt: null },
           { leftAt: { gte: transactionDate } }
         ]
       }
     }
     ```
2. **Rounding Error Mitigations**:
   * Standard currency math is subject to Floating-point representation errors (e.g. `0.1 + 0.2 === 0.30000000000000004`).
   * Perform all adjustments using integer cents internally (e.g. multiplying by 100, rounding, and dividing by 100 at output), or parse through currency libraries.
