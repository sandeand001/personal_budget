# Personal Budget

Household budgeting, income, expense, loan, spending-money, and vacation tracking.

## Development and checks

```powershell
npm install
npm run dev
npm test
npm run build
npm run lint
```

Tests use Node's built-in test runner; no additional test dependencies are needed.
Pushes to `main` run the tests and production build before deploying to GitHub Pages.

## Financial calculation assumptions

### Loans

- Balances represent tracked principal/debt estimates, not live lender balances.
- Regular payments accrue estimated interest once per locked month:
  `opening balance * APR / 1200`. Interest and balances are rounded to cents.
- The new balance is `opening balance + interest - loan payments`, floored at
  zero. Uncovered interest increases the estimated balance; overpayments are
  reported and do not create a negative loan balance.
- Mark linked extra-payment expenses **Principal-only payment**. A principal-only
  payment by itself does not accrue another month's interest.
- Enter escrow, insurance, and fees in the linked expense's **Escrow / fees**
  field. They remain expenses but do not reduce the loan. The debt's regular
  payment used for payoff estimates must exclude these amounts.
- Lock-in uses edited actual expense amounts, not the original estimates.
  The preview separates interest, principal-only payments, and balance reduction.
  Enter the lender's actual monthly interest to override the estimate.
- Grouped loans retain individual rates. Payments are allocated proportionally,
  conserving cents and reallocating amounts that exceed a sub-loan's balance.
  This may differ from a servicer's contractual allocation.
- Payoff estimates include only the final partial installment. A payment that
  does not cover interest has no finite payoff; its interest is not shown as zero.
  Non-monthly payments are modeled using monthly equivalents, not exact payment
  dates. Daily accrual, variable rates, separate uncapitalized interest, and
  contractual fees require reconciliation with the lender.

**Previously tracked balances are not automatically repaired.** Earlier versions
subtracted full regular payments without interest. On the Debt page, edit an
affected balance to the lender's latest posted principal balance **after all
posted extra payments**. Do not apply those already-posted payments again.
For example, $344,266.62 minus a newly posted $4,000 principal-only payment is
$340,266.62 if there are no other intervening balance changes.

### Lock-in, unlock, and budget allocations

- An expense lock commits its log, loan adjustments, and budget credits in one
  Firestore transaction. A second lock of the same month is rejected.
- Manual additions to spending money use atomic increments so concurrent deposits
  and expense lock-ins do not overwrite each other's credits.
- Even splits allocate residual cents deterministically. Custom allocations may
  leave money undistributed, but cannot exceed available spending money.
- An enabled bank-balance override is used even when the balance is zero.
  Already-paid bills are excluded from remaining cash needs only in bank-balance
  mode; annual actual expenses still include those bills.
- New locks store each loan's before/after balance. Unlock reverses those exact
  amounts, including fully paid-off loans, and reverses the original budget credit
  without silently clamping a deficit away.
- Lock loan-payment months chronologically and unlock them in reverse order.
  Unlock rejects balances that have subsequently been manually changed.
  Old single-debt logs can be reversed when their recorded balances still match;
  old loan-group logs without per-loan history cannot be safely reconstructed and
  produce an explicit reconciliation error instead of guessed balances.

### Income, expenses, and annual views

- Weekly and biweekly projections use 52 and 26 annual payments, respectively,
  spread across calendar months by day count. They are estimates, not exact
  payday schedules; cumulative rounding preserves the annual total, including
  leap years. Lock actual amounts for months with different paycheck counts.
- Irregular annual totals honor the selected payment months.
- Bonus amounts remain **per paycheck in the selected months**. Monthly and annual
  bonus projections, including tax inputs, use the same calculation.
- Simple mode uses entered take-home pay. Detailed-mode spending money uses
  estimated take-home after deductions rather than gross pay. Manual paystub
  deductions are applied once. New income locks preserve the income basis and
  net snapshot; legacy logs without this metadata are interpreted using the
  current mode and may need reconciliation.
- Draft income actuals are isolated by month, year, and income mode.
- Annual overview and dashboard monthly figures use locked actual expenses where
  available. The Expenses spending breakdown, monthly chart, and recorded budget
  allocations also retain locked actuals instead of reverting to current forecasts.
  Annual-view detailed-mode projections are gross income; locked income
  retains its recorded basis. Net is income less bills, not an after-tax return
  calculation. Forecast annual totals elsewhere remain
  projections based on the configured streams and expenses.
- Spending balances include all transactions, even if a category was removed.
  Filtering a spending chart does not change the account's all-time balance.
  Vacation totals distinguish planned costs, paid costs, and savings contributed;
  editing a legacy vacation preserves its savings goal.

### Taxes are estimates, not a tax return

Automatic federal estimates use **tax year 2026** brackets and standard deductions,
the $184,500 Social Security wage base, the $24,500 under-50 employee 401(k) limit,
and the $2,200 qualifying-child credit with income phaseout.

As configured, income streams are still estimated **separately**; they are not
combined into one taxpayer or household return. Standard deductions, credits,
Social Security caps, and retirement limits can therefore differ from an actual
multi-job return. State tax uses simplified effective rates and federal deductions,
not a full state tax engine. Itemization, catch-up contributions, refundable
credits, and many eligibility rules are not modeled.

Extra household withholding is deducted from take-home once and allocated among
automatically estimated taxable streams. Paystub federal withholding already
includes any extra withheld, so manual deductions are not charged again.
Extra withholding is **not a guaranteed refund**. Legacy W-4 allowance counts
are informational and are not used in the estimate.

Use actual take-home or paystub deductions for reliable cash-flow budgeting.
Tax estimates for other years are not certified by the 2026 tables.

Sources:

- [IRS 2026 tax schedules and credit amounts, Revenue Procedure 2025-32](https://www.irs.gov/irb/2025-45_IRB)
- [IRS 2026 standard deductions](https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill)
- [IRS 2026 401(k) limits](https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500)
- [IRS Social Security and Medicare rates and 2026 wage base](https://www.irs.gov/taxtopics/tc751)