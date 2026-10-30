/**
 * Tax calculation engine — US federal + state income tax, FICA, 401(k).
 * All values are ANNUAL.
 * Estimates only — not tax advice.
 */

import { allocateMoney, getAmountForMonth, getAnnualBonus, getPeriodsPerYear, getStreamMonthTotal, roundCurrency } from './financial.js';

export const TAX_YEAR = 2026;

// IRS Revenue Procedure 2025-32, section 4.01 (tax year 2026).

const FEDERAL_BRACKETS = {
  single: [
    { min: 0, max: 12400, rate: 0.10 },
    { min: 12400, max: 50400, rate: 0.12 },
    { min: 50400, max: 105700, rate: 0.22 },
    { min: 105700, max: 201775, rate: 0.24 },
    { min: 201775, max: 256225, rate: 0.32 },
    { min: 256225, max: 640600, rate: 0.35 },
    { min: 640600, max: Infinity, rate: 0.37 },
  ],
  married_jointly: [
    { min: 0, max: 24800, rate: 0.10 },
    { min: 24800, max: 100800, rate: 0.12 },
    { min: 100800, max: 211400, rate: 0.22 },
    { min: 211400, max: 403550, rate: 0.24 },
    { min: 403550, max: 512450, rate: 0.32 },
    { min: 512450, max: 768700, rate: 0.35 },
    { min: 768700, max: Infinity, rate: 0.37 },
  ],
  married_separately: [
    { min: 0, max: 12400, rate: 0.10 },
    { min: 12400, max: 50400, rate: 0.12 },
    { min: 50400, max: 105700, rate: 0.22 },
    { min: 105700, max: 201775, rate: 0.24 },
    { min: 201775, max: 256225, rate: 0.32 },
    { min: 256225, max: 384350, rate: 0.35 },
    { min: 384350, max: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { min: 0, max: 17700, rate: 0.10 },
    { min: 17700, max: 67450, rate: 0.12 },
    { min: 67450, max: 105700, rate: 0.22 },
    { min: 105700, max: 201750, rate: 0.24 },
    { min: 201750, max: 256200, rate: 0.32 },
    { min: 256200, max: 640600, rate: 0.35 },
    { min: 640600, max: Infinity, rate: 0.37 },
  ],
};

// ─── Standard Deduction 2026 ───

const STANDARD_DEDUCTION = {
  single: 16100,
  married_jointly: 32200,
  married_separately: 16100,
  head_of_household: 24150,
};

// ─── FICA 2026 ───

const SOCIAL_SECURITY_RATE = 0.062;
const SOCIAL_SECURITY_WAGE_BASE = 184500;
const MEDICARE_RATE = 0.0145;
const ADDITIONAL_MEDICARE_RATE = 0.009;
const ADDITIONAL_MEDICARE_THRESHOLDS = {
  single: 200000, married_jointly: 250000, married_separately: 125000, head_of_household: 200000,
};

// ─── Child Tax Credit ───

const CHILD_TAX_CREDIT_PER_CHILD = 2200;

// ─── 401(k) Limits 2026 (under age 50) ───

const MAX_401K_CONTRIBUTION = 24500;

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
  return roundCurrency(calcBracketTax(adjustedIncome, brackets));
}

export function calculateStateTax(taxableIncome, stateCode, filingStatus) {
  const state = STATE_TAX_DATA[stateCode];
  if (!state) return 0;
  const deduction = STANDARD_DEDUCTION[filingStatus] || STANDARD_DEDUCTION.single;
  const adjustedIncome = Math.max(0, taxableIncome - deduction);
  return roundCurrency(adjustedIncome * state.rate);
}

export function calculateFICA(grossIncome, isW2, filingStatus = 'single', w2Income = 0) {
  grossIncome = Math.max(0, grossIncome);
  const threshold = ADDITIONAL_MEDICARE_THRESHOLDS[filingStatus] || ADDITIONAL_MEDICARE_THRESHOLDS.single;
  if (isW2) {
    const ss = roundCurrency(Math.min(grossIncome, SOCIAL_SECURITY_WAGE_BASE) * SOCIAL_SECURITY_RATE);
    let medicare = grossIncome * MEDICARE_RATE;
    if (grossIncome > threshold) {
      medicare += (grossIncome - threshold) * ADDITIONAL_MEDICARE_RATE;
    }
    medicare = roundCurrency(medicare);
    return { socialSecurity: ss, medicare, total: roundCurrency(ss + medicare) };
  } else {
    const selfEmploymentIncome = grossIncome * 0.9235;
    if (selfEmploymentIncome < 400) return { socialSecurity: 0, medicare: 0, total: 0, deductibleHalf: 0 };
    const ss = roundCurrency(Math.min(selfEmploymentIncome, Math.max(0, SOCIAL_SECURITY_WAGE_BASE - w2Income)) * SOCIAL_SECURITY_RATE * 2);
    const basicMedicare = roundCurrency(selfEmploymentIncome * MEDICARE_RATE * 2);
    const additionalMedicare = roundCurrency((
      Math.max(0, w2Income + selfEmploymentIncome - threshold) - Math.max(0, w2Income - threshold)
    ) * ADDITIONAL_MEDICARE_RATE);
    const medicare = roundCurrency(basicMedicare + additionalMedicare);
    return {
      socialSecurity: ss, medicare, total: roundCurrency(ss + medicare),
      deductibleHalf: roundCurrency((ss + basicMedicare) / 2),
    };
  }
}

export function calculate401k(grossW2Income, traditionalPct, rothPct) {
  const totalPct = (traditionalPct || 0) + (rothPct || 0);
  const totalContribution = roundCurrency(Math.min(grossW2Income * (totalPct / 100), MAX_401K_CONTRIBUTION, grossW2Income));
  const traditionalContribution = totalPct > 0
    ? roundCurrency(totalContribution * ((traditionalPct || 0) / totalPct))
    : 0;
  const rothContribution = roundCurrency(totalContribution - traditionalContribution);
  return { traditional: traditionalContribution, roth: rothContribution, total: totalContribution };
}

export function calculateChildTaxCredit(dependents, federalTax, adjustedIncome = 0, filingStatus = 'single') {
  const threshold = filingStatus === 'married_jointly' ? 400000 : 200000;
  const phaseout = Math.ceil(Math.max(0, adjustedIncome - threshold) / 1000) * 50;
  const credit = Math.max(0, (dependents || 0) * CHILD_TAX_CREDIT_PER_CHILD - phaseout);
  return Math.min(credit, Math.max(0, federalTax));
}

function streamPeriods(stream) {
  return stream.frequency
    ? getPeriodsPerYear(stream.frequency, stream.applicableMonths)
    : (stream.periodsPerYear || 12);
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
  const { traditionalPct = 0, rothPct = 0 } = retirement;

  // Separate W-2 and 1099 income (taxable only)
  let w2TaxableAnnual = 0;
  let selfEmployTaxableAnnual = 0;
  let totalGrossAnnual = 0;
  let totalTaxableAnnual = 0;

  for (const s of incomeStreams) {
    const baseAmount = s.grossAmount ?? s.amount ?? 0;
    const annual = roundCurrency(baseAmount * streamPeriods(s));
    const bonusAnnual = getAnnualBonus(s, TAX_YEAR);
    totalGrossAnnual += annual + bonusAnnual;
    if (s.isTaxable) {
      totalTaxableAnnual += annual + bonusAnnual;
      if (s.type === '1099') {
        selfEmployTaxableAnnual += annual + bonusAnnual;
      } else {
        w2TaxableAnnual += annual + bonusAnnual;
      }
    }
  }

  // 401(k) — only applies to W-2 income
  const k401 = calculate401k(w2TaxableAnnual, traditionalPct, rothPct);

  // FICA
  const ficaW2 = calculateFICA(w2TaxableAnnual, true, filingStatus);
  const fica1099 = calculateFICA(selfEmployTaxableAnnual, false, filingStatus, w2TaxableAnnual);
  const totalFICA = roundCurrency(ficaW2.total + fica1099.total);

  // Adjusted taxable income for federal tax
  // Traditional 401k is pre-tax, so subtract from taxable income
  // Self-employment deductible half also subtracted
  const adjustedTaxableIncome = totalTaxableAnnual - k401.traditional - (fica1099.deductibleHalf || 0);

  // Federal tax
  const federalTax = calculateFederalTax(adjustedTaxableIncome, filingStatus);

  // Child Tax Credit
  const childCredit = calculateChildTaxCredit(dependents, federalTax, adjustedTaxableIncome, filingStatus);
  const federalTaxAfterCredits = federalTax - childCredit;

  // State tax
  const stateTax = calculateStateTax(adjustedTaxableIncome, state, filingStatus);

  // Extra withholding (annual)
  const extraWithholdingAnnual = roundCurrency((extraWithholding || 0) * 12);

  // Estimated total tax withheld (federal + state + FICA + extra)
  const totalWithheld = roundCurrency(federalTaxAfterCredits + stateTax + totalFICA + extraWithholdingAnnual);

  // Projected refund/owed
  const totalLiability = federalTaxAfterCredits + stateTax + totalFICA;

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
    totalDeductions: roundCurrency(totalWithheld + k401.total),
    netAnnual: roundCurrency(totalGrossAnnual - totalWithheld - k401.total),
  };
}

/**
 * Per-stream tax calculation — calculates deductions for a single income stream
 * using its own tax profile. Used when each income source has individual tax settings.
 */
export function calculateStreamDeductions(stream, retirement = {}, householdTaxProfile = {}) {
  // Use household-level tax profile as the source (per-stream taxProfile is legacy fallback)
  const { filingStatus = 'single', state = 'TX', dependents = 0, extraWithholding = 0, w4Allowances = 0 } = { ...stream.taxProfile, ...householdTaxProfile };
  const { traditionalPct = 0, rothPct = 0 } = retirement;

  // Check stream-level manual deductions first, then household fallback
  const manualDeductions = (stream.manualDeductions?.enabled ? stream.manualDeductions : null)
    || (householdTaxProfile.manualDeductions?.enabled ? householdTaxProfile.manualDeductions : null);

  const periodsPerYear = streamPeriods(stream);
  const baseAmount = stream.grossAmount ?? stream.amount ?? 0;
  const baseAnnual = roundCurrency(baseAmount * periodsPerYear);
  const bonusAnnual = getAnnualBonus(stream, TAX_YEAR);
  const grossAnnual = roundCurrency(baseAnnual + bonusAnnual);

  if (!stream.isTaxable) {
    return {
      streamId: stream.id,
      streamName: stream.name,
      grossAnnual,
      baseAnnual,
      bonusAnnual,
      isTaxable: false,
      federalTax: 0,
      stateTax: 0,
      stateName: STATE_TAX_DATA[state]?.name || state,
      totalFICA: 0,
      k401: { traditional: 0, roth: 0, total: 0 },
      childCredit: 0,
      federalTaxAfterCredits: 0,
      extraWithholdingAnnual: 0,
      otherDeductions: 0,
      totalDeductions: 0,
      netAnnual: grossAnnual,
      periodsPerYear,
      perPaycheck: grossAnnual / periodsPerYear,
    };
  }

  const isW2 = stream.type !== '1099';

  // If manual deductions are provided, use paystub values scaled to annual
  if (manualDeductions && manualDeductions.enabled) {
    const md = manualDeductions;
    const fedTaxAnnual = (parseFloat(md.federalTax) || 0) * periodsPerYear;
    const stateTaxAnnual = (parseFloat(md.stateTax) || 0) * periodsPerYear;
    const ficaAnnual = (parseFloat(md.fica) || 0) * periodsPerYear;
    const k401Annual = (parseFloat(md.retirement) || 0) * periodsPerYear;
    const otherPerCheck = md.otherDeductions?.length
      ? md.otherDeductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
      : (parseFloat(md.other) || 0);
    const otherAnnual = otherPerCheck * periodsPerYear;
    const totalDeductions = roundCurrency(fedTaxAnnual + stateTaxAnnual + ficaAnnual + k401Annual + otherAnnual);
    const netAnnual = roundCurrency(grossAnnual - totalDeductions);
    // Paystub federal withholding already includes any extra withheld.
    const extraWithholdingAnnual = 0;

    return {
      streamId: stream.id,
      streamName: stream.name,
      grossAnnual,
      baseAnnual,
      bonusAnnual,
      periodsPerYear,
      isTaxable: true,
      filingStatus,
      state,
      stateName: STATE_TAX_DATA[state]?.name || state,
      dependents,
      w4Allowances,
      isManual: true,
      standardDeduction: STANDARD_DEDUCTION[filingStatus] || STANDARD_DEDUCTION.single,
      k401: { traditional: k401Annual, roth: 0, total: k401Annual },
      fica: { total: ficaAnnual },
      totalFICA: ficaAnnual,
      federalTax: fedTaxAnnual,
      childCredit: 0,
      federalTaxAfterCredits: fedTaxAnnual,
      stateTax: stateTaxAnnual,
      otherDeductions: otherAnnual,
      otherDeductionsList: md.otherDeductions || [],
      extraWithholdingAnnual,
      totalDeductions,
      netAnnual,
      perPaycheck: netAnnual / periodsPerYear,
    };
  }

  // 401(k) — only for W-2
  const k401 = isW2 ? calculate401k(grossAnnual, traditionalPct, rothPct) : { traditional: 0, roth: 0, total: 0 };

  // FICA
  const fica = calculateFICA(grossAnnual, isW2, filingStatus);

  // Adjusted taxable income
  const adjustedTaxable = grossAnnual - k401.traditional - (fica.deductibleHalf || 0);

  // Federal tax
  const federalTax = calculateFederalTax(adjustedTaxable, filingStatus);
  const childCredit = calculateChildTaxCredit(dependents, federalTax, adjustedTaxable, filingStatus);
  const federalTaxAfterCredits = federalTax - childCredit;

  // State tax
  const stateTax = calculateStateTax(adjustedTaxable, state, filingStatus);

  const extraWithholdingAnnual = roundCurrency((extraWithholding || 0) * 12);
  const totalDeductions = roundCurrency(federalTaxAfterCredits + stateTax + fica.total + k401.total + extraWithholdingAnnual);
  const netAnnual = roundCurrency(grossAnnual - totalDeductions);

  return {
    streamId: stream.id,
    streamName: stream.name,
    grossAnnual,
    baseAnnual,
    bonusAnnual,
    isTaxable: true,
    filingStatus,
    state,
    stateName: STATE_TAX_DATA[state]?.name || state,
    dependents,
    standardDeduction: STANDARD_DEDUCTION[filingStatus] || STANDARD_DEDUCTION.single,
    k401,
    fica,
    totalFICA: fica.total,
    federalTax,
    childCredit,
    federalTaxAfterCredits,
    stateTax,
    otherDeductions: 0,
    extraWithholdingAnnual,
    totalDeductions,
    netAnnual,
    periodsPerYear,
    perPaycheck: netAnnual / periodsPerYear,
  };
}

/**
 * Calculate deductions for all streams individually, then aggregate.
 */
export function calculateAllStreamDeductions(incomeStreams = [], retirement = {}, householdTaxProfile = {}) {
  const hasHouseholdExtra = householdTaxProfile.extraWithholding != null;
  const streamResults = incomeStreams.map((s) => calculateStreamDeductions(s, retirement,
    hasHouseholdExtra ? { ...householdTaxProfile, extraWithholding: 0 } : householdTaxProfile));
  const eligible = streamResults.filter((r) => r.isTaxable && !r.isManual && r.grossAnnual > 0);
  const extras = allocateMoney((householdTaxProfile.extraWithholding || 0) * 12, eligible.map((r) => r.grossAnnual));
  eligible.forEach((result, i) => {
    result.extraWithholdingAnnual = roundCurrency(result.extraWithholdingAnnual + extras[i]);
    result.totalDeductions = roundCurrency(result.totalDeductions + extras[i]);
    result.netAnnual = roundCurrency(result.netAnnual - extras[i]);
    result.perPaycheck = result.netAnnual / result.periodsPerYear;
  });

  const totals = streamResults.reduce((acc, r) => ({
    totalGrossAnnual: acc.totalGrossAnnual + r.grossAnnual,
    totalBonusAnnual: acc.totalBonusAnnual + r.bonusAnnual,
    totalFederalTax: acc.totalFederalTax + r.federalTaxAfterCredits,
    totalStateTax: acc.totalStateTax + r.stateTax,
    totalFICA: acc.totalFICA + r.totalFICA,
    totalK401: acc.totalK401 + r.k401.total,
    totalOtherDeductions: acc.totalOtherDeductions + (r.otherDeductions || 0),
    totalDeductions: acc.totalDeductions + r.totalDeductions,
    totalNet: acc.totalNet + r.netAnnual,
    totalExtraWithholding: acc.totalExtraWithholding + r.extraWithholdingAnnual,
  }), {
    totalGrossAnnual: 0,
    totalBonusAnnual: 0,
    totalFederalTax: 0,
    totalStateTax: 0,
    totalFICA: 0,
    totalK401: 0,
    totalOtherDeductions: 0,
    totalDeductions: 0,
    totalNet: 0,
    totalExtraWithholding: 0,
  });

  return { streams: streamResults, totals: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, roundCurrency(value)])) };
}

/** Cash-flow estimate, not a payroll withholding or tax-return calculation. */
export function calculateMonthlyTakeHome({ incomeStreams, streamResults, isSimpleMode, month, year, incomeLog }) {
  if (incomeLog?.netTotal != null) return roundCurrency(incomeLog.netTotal);
  const basis = incomeLog?.incomeBasis ?? (isSimpleMode ? 'take_home' : 'gross');
  if (incomeLog && basis === 'take_home') return roundCurrency(incomeLog.total);
  if (!incomeLog && isSimpleMode) {
    return roundCurrency(incomeStreams.reduce((sum, stream) => sum + getStreamMonthTotal(stream, true, month, year), 0));
  }
  const monthlyNet = incomeStreams.reduce((sum, stream) => {
    const result = streamResults.find((item) => item.streamId === stream.id);
    if (!result) throw new Error(`Missing deduction estimate for ${stream.name}.`);
    const gross = incomeLog?.entries?.find((entry) => entry.id === stream.id)?.actual
      ?? getStreamMonthTotal(stream, false, month, year);
    const deductions = gross <= 0 ? 0 : result.isManual
      ? getAmountForMonth(result.totalDeductions / result.periodsPerYear, stream.frequency, stream.applicableMonths, month, year)
      : (result.grossAnnual > 0 ? gross * result.totalDeductions / result.grossAnnual : 0);
    return sum + gross - deductions;
  }, 0);
  return roundCurrency(monthlyNet);
}
