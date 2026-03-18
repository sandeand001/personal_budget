/**
 * Tax calculation engine — US federal + state income tax, FICA, 401(k).
 * All values are ANNUAL.
 * Estimates only — not tax advice.
 */

// ─── 2025 Federal Tax Brackets ───

const FEDERAL_BRACKETS = {
  single: [
    { min: 0, max: 11925, rate: 0.10 },
    { min: 11925, max: 48475, rate: 0.12 },
    { min: 48475, max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250525, rate: 0.32 },
    { min: 250525, max: 626350, rate: 0.35 },
    { min: 626350, max: Infinity, rate: 0.37 },
  ],
  married_jointly: [
    { min: 0, max: 23850, rate: 0.10 },
    { min: 23850, max: 96950, rate: 0.12 },
    { min: 96950, max: 206700, rate: 0.22 },
    { min: 206700, max: 394600, rate: 0.24 },
    { min: 394600, max: 501050, rate: 0.32 },
    { min: 501050, max: 751600, rate: 0.35 },
    { min: 751600, max: Infinity, rate: 0.37 },
  ],
  married_separately: [
    { min: 0, max: 11925, rate: 0.10 },
    { min: 11925, max: 48475, rate: 0.12 },
    { min: 48475, max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250525, rate: 0.32 },
    { min: 250525, max: 375800, rate: 0.35 },
    { min: 375800, max: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { min: 0, max: 17000, rate: 0.10 },
    { min: 17000, max: 64850, rate: 0.12 },
    { min: 64850, max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250500, rate: 0.32 },
    { min: 250500, max: 626350, rate: 0.35 },
    { min: 626350, max: Infinity, rate: 0.37 },
  ],
};

// ─── Standard Deduction 2025 ───

const STANDARD_DEDUCTION = {
  single: 15000,
  married_jointly: 30000,
  married_separately: 15000,
  head_of_household: 22500,
};

// ─── FICA 2025 ───

const SOCIAL_SECURITY_RATE = 0.062;
const SOCIAL_SECURITY_WAGE_BASE = 176100;
const MEDICARE_RATE = 0.0145;
const ADDITIONAL_MEDICARE_RATE = 0.009;
const ADDITIONAL_MEDICARE_THRESHOLD = 200000;
const SELF_EMPLOYMENT_TAX_RATE = 0.153;

// ─── Child Tax Credit ───

const CHILD_TAX_CREDIT_PER_CHILD = 2000;

// ─── 401(k) Limits 2025 ───

const MAX_401K_CONTRIBUTION = 23500;

// ─── State Tax Rates (simplified — top marginal rate and effective rate approach) ───

const STATE_TAX_DATA = {
  AL: { name: 'Alabama', rate: 0.05 },
  AK: { name: 'Alaska', rate: 0 },
  AZ: { name: 'Arizona', rate: 0.025 },
  AR: { name: 'Arkansas', rate: 0.039 },
  CA: { name: 'California', rate: 0.0725 },
  CO: { name: 'Colorado', rate: 0.044 },
  CT: { name: 'Connecticut', rate: 0.055 },
  DE: { name: 'Delaware', rate: 0.055 },
  FL: { name: 'Florida', rate: 0 },
  GA: { name: 'Georgia', rate: 0.0549 },
  HI: { name: 'Hawaii', rate: 0.065 },
  ID: { name: 'Idaho', rate: 0.058 },
  IL: { name: 'Illinois', rate: 0.0495 },
  IN: { name: 'Indiana', rate: 0.0305 },
  IA: { name: 'Iowa', rate: 0.038 },
  KS: { name: 'Kansas', rate: 0.057 },
  KY: { name: 'Kentucky', rate: 0.04 },
  LA: { name: 'Louisiana', rate: 0.0425 },
  ME: { name: 'Maine', rate: 0.0715 },
  MD: { name: 'Maryland', rate: 0.0575 },
  MA: { name: 'Massachusetts', rate: 0.05 },
  MI: { name: 'Michigan', rate: 0.0425 },
  MN: { name: 'Minnesota', rate: 0.0685 },
  MS: { name: 'Mississippi', rate: 0.047 },
  MO: { name: 'Missouri', rate: 0.048 },
  MT: { name: 'Montana', rate: 0.059 },
  NE: { name: 'Nebraska', rate: 0.0564 },
  NV: { name: 'Nevada', rate: 0 },
  NH: { name: 'New Hampshire', rate: 0 },
  NJ: { name: 'New Jersey', rate: 0.0637 },
  NM: { name: 'New Mexico', rate: 0.049 },
  NY: { name: 'New York', rate: 0.0685 },
  NC: { name: 'North Carolina', rate: 0.045 },
  ND: { name: 'North Dakota', rate: 0.0195 },
  OH: { name: 'Ohio', rate: 0.035 },
  OK: { name: 'Oklahoma', rate: 0.0475 },
  OR: { name: 'Oregon', rate: 0.0875 },
  PA: { name: 'Pennsylvania', rate: 0.0307 },
  RI: { name: 'Rhode Island', rate: 0.0599 },
  SC: { name: 'South Carolina', rate: 0.064 },
  SD: { name: 'South Dakota', rate: 0 },
  TN: { name: 'Tennessee', rate: 0 },
  TX: { name: 'Texas', rate: 0 },
  UT: { name: 'Utah', rate: 0.0465 },
  VT: { name: 'Vermont', rate: 0.066 },
  VA: { name: 'Virginia', rate: 0.0575 },
  WA: { name: 'Washington', rate: 0 },
  WV: { name: 'West Virginia', rate: 0.051 },
  WI: { name: 'Wisconsin', rate: 0.0533 },
  WY: { name: 'Wyoming', rate: 0 },
  DC: { name: 'District of Columbia', rate: 0.065 },
};

export const STATES = Object.entries(STATE_TAX_DATA)
  .map(([code, data]) => ({ code, ...data }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const FILING_STATUSES = [
  { value: 'single', label: 'Single' },
  { value: 'married_jointly', label: 'Married Filing Jointly' },
  { value: 'married_separately', label: 'Married Filing Separately' },
  { value: 'head_of_household', label: 'Head of Household' },
];

// ─── Calculation Functions ───

function calcBracketTax(taxableIncome, brackets) {
  let tax = 0;
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    tax += taxableInBracket * bracket.rate;
  }
  return tax;
}

export function calculateFederalTax(taxableIncome, filingStatus) {
  const brackets = FEDERAL_BRACKETS[filingStatus] || FEDERAL_BRACKETS.single;
  const deduction = STANDARD_DEDUCTION[filingStatus] || STANDARD_DEDUCTION.single;
  const adjustedIncome = Math.max(0, taxableIncome - deduction);
  return calcBracketTax(adjustedIncome, brackets);
}

export function calculateStateTax(taxableIncome, stateCode, filingStatus) {
  const state = STATE_TAX_DATA[stateCode];
  if (!state) return 0;
  const deduction = STANDARD_DEDUCTION[filingStatus] || STANDARD_DEDUCTION.single;
  const adjustedIncome = Math.max(0, taxableIncome - deduction);
  return adjustedIncome * state.rate;
}

export function calculateFICA(grossIncome, isW2) {
  if (isW2) {
    const ss = Math.min(grossIncome, SOCIAL_SECURITY_WAGE_BASE) * SOCIAL_SECURITY_RATE;
    let medicare = grossIncome * MEDICARE_RATE;
    if (grossIncome > ADDITIONAL_MEDICARE_THRESHOLD) {
      medicare += (grossIncome - ADDITIONAL_MEDICARE_THRESHOLD) * ADDITIONAL_MEDICARE_RATE;
    }
    return { socialSecurity: ss, medicare, total: ss + medicare };
  } else {
    // Self-employed: full 15.3% on 92.35% of net earnings
    const selfEmploymentIncome = grossIncome * 0.9235;
    const ss = Math.min(selfEmploymentIncome, SOCIAL_SECURITY_WAGE_BASE) * (SOCIAL_SECURITY_RATE * 2);
    const medicare = selfEmploymentIncome * (MEDICARE_RATE * 2);
    const total = ss + medicare;
    // Deductible half for income tax purposes
    return { socialSecurity: ss, medicare, total, deductibleHalf: total / 2 };
  }
}

export function calculate401k(grossW2Income, traditionalPct, rothPct) {
  const totalPct = (traditionalPct || 0) + (rothPct || 0);
  const totalContribution = Math.min(grossW2Income * (totalPct / 100), MAX_401K_CONTRIBUTION);
  const traditionalContribution = totalPct > 0
    ? totalContribution * ((traditionalPct || 0) / totalPct)
    : 0;
  const rothContribution = totalContribution - traditionalContribution;
  return { traditional: traditionalContribution, roth: rothContribution, total: totalContribution };
}

export function calculateChildTaxCredit(dependents, federalTax) {
  const credit = (dependents || 0) * CHILD_TAX_CREDIT_PER_CHILD;
  return Math.min(credit, federalTax);
}

/**
 * Master calculation — takes all inputs, returns full breakdown.
 */
export function calculateAllDeductions({
  incomeStreams = [],
  taxProfile = {},
  retirement = {},
}) {
  const { filingStatus = 'single', state = 'TX', dependents = 0, extraWithholding = 0 } = taxProfile;
  const { traditionalPct = 0, rothPct = 0, employerMatchPct = 0 } = retirement;

  // Separate W-2 and 1099 income (taxable only)
  let w2TaxableAnnual = 0;
  let selfEmployTaxableAnnual = 0;
  let totalGrossAnnual = 0;
  let totalTaxableAnnual = 0;

  for (const s of incomeStreams) {
    const annual = s.amount * (s.periodsPerYear || 12);
    totalGrossAnnual += annual;
    if (s.isTaxable) {
      totalTaxableAnnual += annual;
      if (s.type === '1099') {
        selfEmployTaxableAnnual += annual;
      } else {
        w2TaxableAnnual += annual;
      }
    }
  }

  // 401(k) — only applies to W-2 income
  const k401 = calculate401k(w2TaxableAnnual, traditionalPct, rothPct);

  // FICA
  const ficaW2 = calculateFICA(w2TaxableAnnual, true);
  const fica1099 = calculateFICA(selfEmployTaxableAnnual, false);
  const totalFICA = ficaW2.total + fica1099.total;

  // Adjusted taxable income for federal tax
  // Traditional 401k is pre-tax, so subtract from taxable income
  // Self-employment deductible half also subtracted
  const adjustedTaxableIncome = totalTaxableAnnual - k401.traditional - (fica1099.deductibleHalf || 0);

  // Federal tax
  const federalTax = calculateFederalTax(adjustedTaxableIncome, filingStatus);

  // Child Tax Credit
  const childCredit = calculateChildTaxCredit(dependents, federalTax);
  const federalTaxAfterCredits = federalTax - childCredit;

  // State tax
  const stateTax = calculateStateTax(adjustedTaxableIncome, state, filingStatus);

  // Extra withholding (annual)
  const extraWithholdingAnnual = (extraWithholding || 0) * 12;

  // Estimated total tax withheld (federal + state + FICA + extra)
  const totalWithheld = federalTaxAfterCredits + stateTax + totalFICA + extraWithholdingAnnual;

  // Projected refund/owed
  const totalLiability = federalTaxAfterCredits + stateTax + totalFICA;
  const refundOrOwed = totalWithheld - totalLiability; // positive = refund with extra withholding

  return {
    totalGrossAnnual,
    totalTaxableAnnual,
    w2TaxableAnnual,
    selfEmployTaxableAnnual,
    standardDeduction: STANDARD_DEDUCTION[filingStatus] || STANDARD_DEDUCTION.single,
    k401,
    ficaW2,
    fica1099,
    totalFICA,
    federalTax,
    childCredit,
    federalTaxAfterCredits,
    stateTax,
    stateName: STATE_TAX_DATA[state]?.name || state,
    extraWithholdingAnnual,
    totalWithheld,
    totalLiability,
    refundOrOwed: extraWithholdingAnnual, // extra withholding = potential refund
    totalDeductions: federalTaxAfterCredits + stateTax + totalFICA + k401.total,
    netAnnual: totalGrossAnnual - (federalTaxAfterCredits + stateTax + totalFICA + k401.total),
  };
}
