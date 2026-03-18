# Personal Budget App — Project Plan

## Overview

A mobile-responsive personal budget web application for tracking income, expenses, personal spending, and vacation planning. Hosted as a static SPA on **GitHub Pages** with **Firebase** backend (Firestore + Authentication).

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | React (via Vite) | Component-based, massive ecosystem, great mobile-responsive tooling |
| **Styling** | Tailwind CSS + shadcn/ui | Clean modern UI, responsive out of the box, consistent design system |
| **Charts** | Recharts (built on D3) | React-native charting, polished visuals, responsive |
| **Database** | Firebase Firestore | Flexible document model, real-time sync, scales naturally to multi-user |
| **Auth** | Firebase Authentication | Google sign-in + email/password, minimal setup |
| **Hosting** | GitHub Pages | Free, deploys from repo, CI/CD via GitHub Actions |
| **Routing** | React Router | SPA client-side routing (hash-based for GitHub Pages compatibility) |
| **State** | React Context + hooks | Simple, no extra dependencies needed at this scale |

---

## Pages & Features

### 1. Dashboard (Home Page)

The central hub — a single-glance summary of your financial picture.

**Components:**
- **Welcome / quick-start guide** — collapsible explanation for first-time users
- **Income summary card** — total gross income (monthly/annual toggle)
- **Expenses summary card** — total deductions, net income
- **Budget tracker cards** — one per user, showing remaining budget, % spent
- **Vacation progress cards** — per-vacation savings goal progress bars
- **Recent activity feed** — last 5-10 transactions across all budgets
- **Tax refund/owed card** — projected refund or amount owed at a glance
- **Alerts/warnings** — over-budget notifications, upcoming vacation payment deadlines

**Data:** Aggregated from all other pages in real-time via Firestore listeners.

---

### 2. Income Page

Track all income streams and calculate total gross income.

**Features:**
- Add/edit/remove **income streams** (name, type, amount, frequency, taxable/non-taxable)
- Income types: **W-2 Employee** or **1099/Self-Employed** (selectable per stream)
- **Taxable vs. Non-taxable toggle** — non-taxable income (e.g., VA disability, child support, gifts, municipal bond interest) is included in total gross income but **excluded from tax calculations** on the Expenses page
- Frequency options: **Weekly, Bi-weekly (every 2 weeks / 26 pay periods), Semi-monthly (twice per month / 24 pay periods), Monthly, Annual**
  - Clear labeling to distinguish bi-weekly vs. semi-monthly
- Auto-calculate **total gross income** (displayed monthly and annually)
- Separate display of **taxable income** vs. **non-taxable income** totals
- Support for multiple income streams (side jobs, rental income, etc.)

**Visualizations:**
- **Pie/donut chart** — income breakdown by stream
- **Bar chart** — monthly income over time (historical tracking)

---

### 3. Expenses & Deductions Page

Calculate all deductions from gross income to arrive at net income.

**Auto-Calculated Deductions (based on user inputs):**

| Deduction | Required User Inputs |
|---|---|
| **Federal income tax** | Filing status, dependents, gross income |
| **State income tax** | State of residence, filing status, gross income |
| **FICA (Social Security + Medicare)** | Gross income, W-2 vs 1099 (self-employment tax) |
| **401(k) Traditional** | Contribution % (optional), employer match % |
| **401(k) Roth** | Contribution % (optional) |
| **Health insurance premium** | User-entered monthly amount |

**Tax Calculation Details:**
- 2025/2026 federal tax brackets (updated annually)
- State tax brackets for all 50 states (+ DC)
- Standard deduction applied by default (itemized as future feature)
- W-2: employer withholds half of FICA
- 1099: full self-employment tax (15.3%), deductible half
- Support for: extra tax withholding, additional dependents/credits
- **Disclaimer displayed:** "Estimates only — not tax advice"

**Projected Tax Refund / Amount Owed:**
- Calculates **estimated annual tax liability** using:
  - Total taxable income (excludes non-taxable streams like VA disability)
  - Filing status (Single, Married Filing Jointly, Married Filing Separately, Head of Household)
  - Standard deduction based on filing status
  - Number of dependents / Child Tax Credit ($2,000 per qualifying child)
  - Earned Income Tax Credit (if applicable)
  - Federal tax brackets applied to taxable income after standard deduction
  - State tax calculated similarly per state rules
- Compares **total tax liability** vs. **total tax withheld** (sum of per-paycheck withholdings across all income streams over the year)
- Displays result as:
  - 🟢 **Estimated Refund: $X** — if withheld > liability
  - 🔴 **Estimated Amount Owed: $X** — if liability > withheld
- Updates in real-time as income, withholding, or tax profile changes
- Shown prominently on the Expenses page and as a summary card on the Dashboard

**User-Added Variable Expenses:**
- Add/edit/remove custom expenses (name, amount, frequency)
- Examples: rent/mortgage, car payment, utilities, subscriptions, insurance, student loans
- Same frequency options as income

**Calculations:**
- Total gross income (pulled from Income page)
- Total deductions (auto + manual)
- **Net income** (gross - all deductions)
- Disposable income (net - fixed expenses)

**Visualizations:**
- **Stacked bar chart** — deduction breakdown
- **Sankey or waterfall chart** — income → deductions → net income flow
- **Pie chart** — expense categories as % of gross

---

### 4. Personal Budget Page

Per-user monthly spending tracker with category breakdowns.

**Structure:**
- **Multi-user support** — each authenticated user (or named profile) gets their own budget tab/section
- Ability to **add additional budget profiles** (e.g., "Andre's Budget", "Wife's Budget")
- Future: tied to user accounts

**Budget Setup:**
- Set **total budget amount** for the period
- Choose **budget period**: Weekly, Bi-weekly, Semi-monthly, Monthly
- **Subdivide** total budget into categories:
  - Default suggestions: Food, Clothing, Transportation, Entertainment, School/Education, Personal, Miscellaneous
  - Add/edit/remove custom categories
  - Unallocated amount shown (total - sum of categories)

**Transaction Entry:**
- Manual entry: **Date, Description, Amount, Category**
- Edit/delete transactions
- Transactions log (sortable, filterable by category/date)

**Tracking:**
- **Running total** — remaining budget (total - spent)
- **Per-category remaining** — budget vs. spent per category
- **Carry-over** — unused budget rolls into next period automatically
- **Over-budget warnings** — visual indicator when category or total exceeded

**Visualizations:**
- **Progress bars** — per category and total budget usage
- **Pie chart** — spending by category
- **Line chart** — daily spending trend over the period
- **Transaction history table** — with search/filter

---

### 5. Vacation Planning Page

Plan, track, and save for vacations.

**Structure:**
- Support for **multiple simultaneous vacations**
- Each vacation is a separate card/section with its own data

**Per Vacation:**
- **Name & dates** (trip name, start date, end date)
- **Expected expenses** — itemized list:
  - Airfare, Hotel, Rental car, Activities, Food, Souvenirs, Travel insurance, Miscellaneous
  - Add custom expense items
  - Each item: name, estimated cost, **paid/unpaid status**, actual cost (once paid)
- **Totals:**
  - Total estimated cost
  - Total paid so far
  - Total remaining (unpaid)

**Savings Goal Tracker:**
- Set a **target amount** to save
- **Add contributions** — manual entry (date, amount, note)
- Running total of amount saved
- **Projected timeline** — "At $X/month, you'll reach your goal by [date]"
- Auto-calculate suggested monthly savings based on trip date

**Visualizations:**
- **Progress bar** — saved vs. goal
- **Paid vs. unpaid** — stacked bar or pie chart per vacation
- **Timeline chart** — projected savings trajectory
- **Checklist view** — items paid ✅ vs. remaining ⬜

---

### 6. Loan / Debt Repayment Page

Track all debts being paid over time and visualize payoff progress.

**Supported Debt Types:**
- Student Loan
- Mortgage
- Auto Loan
- Credit Card
- Medical Debt
- Personal Loan
- Home Equity / HELOC
- Other (custom)

**Per Debt Entry:**
- **Name** (e.g., "Chase Visa", "Federal Student Loan")
- **Type** — select from list above
- **Original balance** — total borrowed
- **Current balance** — remaining amount owed
- **Interest rate (APR %)**
- **Minimum monthly payment**
- **Extra monthly payment** (optional — for accelerated payoff)
- **Due date** — day of month

**Auto-Calculated:**
- **Monthly payment total** (minimum + extra)
- **Estimated payoff date** — based on balance, rate, and payments
- **Total interest paid** over life of loan
- **Total cost** (principal + interest)
- **Months remaining**

**Payoff Strategies (toggle between):**
- **Avalanche** — pay minimums on all, extra toward highest interest rate first
- **Snowball** — pay minimums on all, extra toward lowest balance first
- Show estimated payoff timeline for each strategy

**Totals:**
- Total debt across all entries
- Total monthly debt payments
- Aggregate payoff timeline

**Visualizations:**
- **Progress bars** — per debt (paid vs. remaining)
- **Pie chart** — debt breakdown by type
- **Stacked area chart** — projected balance over time (payoff trajectory)
- **Comparison chart** — avalanche vs. snowball strategy

---

## Data Architecture (Firestore)

All financial data is scoped to a **household**, not an individual user.
Multiple users can share the same household data.

```
households/
  {householdId}/
    { name, ownerId, memberIds[], createdAt }
    income/
      {incomeId}/
        { name, type, amount, frequency, isTaxable, createdAt }
    settings/
      taxProfile/
        { filingStatus, state, dependents, extraWithholding }
      retirement/
        { traditional401kPct, roth401kPct, employerMatchPct }
    expenses/
      {expenseId}/
        { name, amount, frequency, createdAt }
    budgetProfiles/
      {profileId}/
        { name, totalBudget, period, categories[], createdAt }
        transactions/
          {txnId}/
            { date, description, amount, category, createdAt }
    vacations/
      {vacationId}/
        { name, startDate, endDate, targetSavings, createdAt }
        expenses/
          {expenseId}/
            { name, estimatedCost, actualCost, isPaid, category }
        contributions/
          {contributionId}/
            { date, amount, note }
    debts/
      {debtId}/
        { name, type, originalBalance, currentBalance, interestRate, minPayment, extraPayment, dueDate, createdAt }

userProfiles/
  {userId}/
    { email, displayName, householdId }

invitations/
  {inviteId}/
    { householdId, householdName, invitedEmail, invitedBy, status, createdAt }
```

---

## Authentication & Household Flow

1. **Landing state** — unauthenticated users see a login/signup page
2. **Sign-in options** — Google sign-in (primary) + email/password
3. **First login** — auto-create a household for the user (they become the owner)
4. **Household sharing** — owner can invite members by email
5. **Invitation flow** — invited user sees pending invitations on login, can accept to join the household
6. **Data sharing** — all household members see and edit the same data (income, expenses, budget, vacations, debt)
7. **Household management** — settings page to view members, send invites, leave household
8. **Data isolation** — Firestore security rules restrict access to household members only

---

## Navigation Structure

```
┌─────────────────────────────────┐
│  Header / Nav Bar               │
│  [Dashboard] [Income] [Expenses]│
│  [Budget] [Debt] [Vacations]    │
└─────────────────────────────────┘
```

- **Mobile:** Hamburger menu
- **Desktop/Tablet:** Top nav bar
- Each page has a collapsible **"How to use this page"** section at the top

---

## Implementation Phases

### Phase 1 — Foundation ✅
- [x] Project scaffolding (Vite + React + Tailwind + React Router)
- [x] Firebase project setup (Firestore, Auth)
- [x] Authentication (Google + email/password)
- [x] App shell — responsive layout, navigation, routing
- [x] GitHub Pages deployment pipeline (GitHub Actions)

### Phase 2 — Income & Expenses
- [ ] Income page — CRUD income streams, frequency normalization, totals
- [ ] Tax profile setup — state, filing status, dependents
- [ ] Auto-calculated deductions (federal, state, FICA, 401k)
- [ ] User-added variable expenses
- [ ] Net income calculation
- [ ] Projected tax refund/amount owed
- [ ] Charts for income and expense pages

### Phase 3 — Personal Budget
- [ ] Budget profile creation (multi-user)
- [ ] Category subdivision with allocation tracking
- [ ] Transaction entry (date, description, amount, category)
- [ ] Running totals, per-category tracking
- [ ] Period carry-over logic
- [ ] Budget visualizations

### Phase 4 — Vacation Planning
- [ ] Multi-vacation support
- [ ] Expected expense tracking (paid/unpaid)
- [ ] Savings goal + contribution tracking
- [ ] Projected savings timeline
- [ ] Vacation visualizations

### Phase 5 — Loan / Debt Repayment
- [ ] Debt CRUD (add/edit/delete loans)
- [ ] Payoff calculator (date, total interest, total cost)
- [ ] Avalanche vs. Snowball strategy comparison
- [ ] Debt visualizations

### Phase 6 — Dashboard
- [ ] Aggregate data from all pages (including debt)
- [ ] Summary cards, activity feed, alerts
- [ ] Quick-start guide for new users

### Phase 7 — Polish & Future
- [ ] Animations and transitions
- [ ] Offline support (Firestore persistence)
- [ ] PWA manifest (installable on mobile)
- [ ] Dark mode toggle
- [ ] Future: retirement tracking page
- [ ] Future: API integrations for live bill amounts
- [ ] Future: shared household accounts
- [ ] Future: data export (CSV/PDF)

---

## Additional Recommendations

1. **PWA (Progressive Web App)** — Adding a manifest + service worker makes it installable on phones like a native app.
2. **Offline support** — Firestore has built-in offline persistence. Data entered without internet syncs when connectivity returns.
3. **Dark mode** — Tailwind makes this trivial. Good for a finance app used at night.
4. **Input validation** — All financial inputs sanitized and validated client-side.
5. **Period normalization engine** — A shared utility that converts any amount + frequency into monthly/annual equivalents.
6. **Undo/confirmation** — Deletion of income streams, expenses, transactions, and vacations should require confirmation.
7. **Helpful defaults** — Pre-populate common expense categories, suggest standard deduction, default to current tax year brackets.

---

## Notes

- **No PII stored** — No SSNs, bank accounts, or sensitive data. All financial figures are user-entered estimates.
- **Tax calculations are estimates** — Prominent disclaimer on expenses page.
- **Security rules** — Firestore rules scope data per user for clean multi-user expansion.
