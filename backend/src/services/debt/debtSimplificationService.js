/**
 * Simplifies mutual debts inside a group based on net user balances.
 * Separates creditors and debtors and matches the largest debtor with the largest creditor
 * until all balances are settled, returning an optimized transaction list.
 * 
 * @param {Array} balances - Array of objects { userId: number, balance: number }
 * @returns {Array} List of optimized transactions { from: userId, to: userId, amount: number }
 */
function simplifyDebts(balances) {
  let debtors = [];
  let creditors = [];
  
  // 1. Separate creditors and debtors
  for (const member of balances) {
    const balance = Math.round(member.balance * 100) / 100;
    if (balance < 0) {
      debtors.push({ userId: member.userId, amount: -balance });
    } else if (balance > 0) {
      creditors.push({ userId: member.userId, amount: balance });
    }
  }
  
  // Sort descending to settle largest balances first
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  
  const transactions = [];
  let dIdx = 0;
  let cIdx = 0;
  
  // 2. Match largest debtor with largest creditor and loop until settled
  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    
    if (debtor.amount < 0.01) {
      dIdx++;
      continue;
    }
    if (creditor.amount < 0.01) {
      cIdx++;
      continue;
    }
    
    const settleAmount = Math.min(debtor.amount, creditor.amount);
    
    transactions.push({
      from: debtor.userId,
      to: creditor.userId,
      amount: settleAmount
    });
    
    debtor.amount = Math.round((debtor.amount - settleAmount) * 100) / 100;
    creditor.amount = Math.round((creditor.amount - settleAmount) * 100) / 100;
    
    if (debtor.amount < 0.01) dIdx++;
    if (creditor.amount < 0.01) cIdx++;
  }
  
  // 3. Return transaction list
  return transactions;
}

module.exports = {
  simplifyDebts
};
