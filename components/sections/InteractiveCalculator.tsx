'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { InteractiveCalculatorSection } from '@/types/article'

const ACCENT = '#E07A3A'
const ACCENT_LIGHT = '#FEF3EC'

// ── Built-in formulas ────────────────────────────────────────────────────────

type CalcResult = { outputs: Record<string, number>; chartData: Array<Record<string, number | string>> }

function calcCompoundInterest(inputs: Record<string, number>): CalcResult {
  // Detect which variant we're dealing with based on available inputs
  const hasAges = inputs.starting_age != null && inputs.retirement_age != null
  const hasInitialAmount = inputs.initial_amount != null || inputs.initial_investment != null
  const hasInflation = inputs.inflation_rate != null

  // Lump-sum investment variant (e.g. inflation calculator, investment growth)
  if (hasInitialAmount && !hasAges) {
    const initial = inputs.initial_amount ?? inputs.initial_investment ?? 10000
    const annualReturn = (inputs.annual_return ?? inputs.rate ?? 7) / 100
    const inflationRate = (inputs.inflation_rate ?? 0) / 100
    const years = inputs.time_period ?? inputs.years ?? 20
    const monthly = inputs.monthly_savings ?? inputs.monthly_contribution ?? 0

    // Nominal value: initial * (1+r)^years + monthly contributions
    let nominalValue = initial * Math.pow(1 + annualReturn, years)
    if (monthly > 0) {
      const r = annualReturn / 12
      const months = years * 12
      if (r > 0) {
        nominalValue += monthly * ((Math.pow(1 + r, months) - 1) / r)
      } else {
        nominalValue += monthly * months
      }
    }

    // Real value adjusted for inflation
    const realValue = nominalValue / Math.pow(1 + inflationRate, years)
    const realAnnualReturn = hasInflation
      ? Math.round(((1 + annualReturn) / (1 + inflationRate) - 1) * 1000) / 10
      : Math.round(annualReturn * 1000) / 10

    const chartData = []
    const step = Math.max(1, Math.floor(years / 20))
    for (let y = 0; y <= years; y += step) {
      let nv = initial * Math.pow(1 + annualReturn, y)
      if (monthly > 0) {
        const r = annualReturn / 12
        const m = y * 12
        if (r > 0) nv += monthly * ((Math.pow(1 + r, m) - 1) / r)
        else nv += monthly * m
      }
      chartData.push({ year: `Year ${y}`, value: Math.round(nv) })
    }
    if (chartData[chartData.length - 1]?.year !== `Year ${years}`) {
      chartData.push({ year: `Year ${years}`, value: Math.round(nominalValue) })
    }

    return {
      outputs: {
        nominal_value: Math.round(nominalValue),
        real_value: Math.round(realValue),
        real_annual_return: Math.round(realAnnualReturn),
        total_saved: Math.round(nominalValue),
        total_contributed: Math.round(initial + monthly * years * 12),
        interest_earned: Math.round(nominalValue - initial - monthly * years * 12),
      },
      chartData,
    }
  }

  // Age-based savings variant (retirement, college, etc.)
  const startAge = inputs.starting_age ?? inputs.current_age ?? 25
  const monthly = inputs.monthly_savings ?? inputs.monthly_contribution ?? 300
  const annualReturn = (inputs.annual_return ?? 7) / 100
  const retireAge = inputs.retirement_age ?? inputs.target_age ?? 65
  const months = Math.max(0, (retireAge - startAge) * 12)
  const r = annualReturn / 12

  const totalContributed = monthly * months
  let total = 0
  if (r > 0) {
    total = monthly * ((Math.pow(1 + r, months) - 1) / r)
  } else {
    total = totalContributed
  }

  const years = retireAge - startAge
  const chartData = []
  const step = Math.max(1, Math.floor(years / 20))
  for (let y = 0; y <= years; y += step) {
    const m = y * 12
    let val = 0
    if (r > 0) {
      val = monthly * ((Math.pow(1 + r, m) - 1) / r)
    } else {
      val = monthly * m
    }
    chartData.push({ year: `Age ${startAge + y}`, value: Math.round(val) })
  }
  if (chartData.length === 0 || chartData[chartData.length - 1].year !== `Age ${retireAge}`) {
    chartData.push({ year: `Age ${retireAge}`, value: Math.round(total) })
  }

  return {
    outputs: {
      total_saved: Math.round(total),
      total_contributed: Math.round(totalContributed),
      interest_earned: Math.round(total - totalContributed),
    },
    chartData,
  }
}

function calcMortgage(inputs: Record<string, number>): CalcResult {
  const principal = inputs.home_price ?? inputs.principal ?? 300000
  const downPct = (inputs.down_payment ?? inputs.down_payment_pct ?? 20) / 100
  const annualRate = (inputs.interest_rate ?? inputs.annual_rate ?? 6) / 100
  const termYears = inputs.loan_term ?? inputs.term_years ?? 30
  const loanAmount = principal * (1 - downPct)
  const r = annualRate / 12
  const n = termYears * 12

  let monthlyPayment = 0
  if (r > 0) {
    monthlyPayment = loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  } else {
    monthlyPayment = n > 0 ? loanAmount / n : 0
  }

  const totalPaid = monthlyPayment * n
  const totalInterest = totalPaid - loanAmount

  const chartData = []
  let balance = loanAmount
  for (let y = 0; y <= termYears; y += Math.max(1, Math.floor(termYears / 20))) {
    chartData.push({ year: `Year ${y}`, value: Math.round(balance), paid: Math.round(loanAmount - balance) })
    const monthsStep = Math.max(1, Math.floor(termYears / 20)) * 12
    for (let m = 0; m < monthsStep && balance > 0; m++) {
      const interest = balance * r
      const principalPmt = monthlyPayment - interest
      balance = Math.max(0, balance - principalPmt)
    }
  }

  return {
    outputs: {
      monthly_payment: Math.round(monthlyPayment),
      total_paid: Math.round(totalPaid),
      total_interest: Math.round(totalInterest),
      loan_amount: Math.round(loanAmount),
    },
    chartData,
  }
}

function calcRoiComparison(inputs: Record<string, number>): CalcResult {
  const investment = inputs.investment ?? inputs.initial_investment ?? 10000
  const rateA = (inputs.return_a ?? inputs.rate_a ?? 5) / 100
  const rateB = (inputs.return_b ?? inputs.rate_b ?? 8) / 100
  const years = inputs.years ?? inputs.time_horizon ?? 10

  const chartData = []
  for (let y = 0; y <= years; y++) {
    chartData.push({
      year: `Year ${y}`,
      value: Math.round(investment * Math.pow(1 + rateA, y)),
      optionB: Math.round(investment * Math.pow(1 + rateB, y)),
    })
  }

  return {
    outputs: {
      option_a_total: Math.round(investment * Math.pow(1 + rateA, years)),
      option_b_total: Math.round(investment * Math.pow(1 + rateB, years)),
      difference: Math.round(investment * Math.pow(1 + rateB, years) - investment * Math.pow(1 + rateA, years)),
    },
    chartData,
  }
}

function calcBudget(inputs: Record<string, number>): CalcResult {
  const income = inputs.monthly_income ?? inputs.income ?? 5000
  const allKeys = Object.keys(inputs).filter(k => k !== 'monthly_income' && k !== 'income')
  let totalExpenses = 0
  allKeys.forEach(k => { totalExpenses += inputs[k] ?? 0 })
  const remaining = income - totalExpenses

  const chartData = allKeys.map(k => ({
    year: k.replace(/_/g, ' '),
    value: inputs[k] ?? 0,
  }))
  if (remaining > 0) {
    chartData.push({ year: 'Remaining', value: remaining })
  }

  return {
    outputs: {
      total_expenses: Math.round(totalExpenses),
      remaining: Math.round(remaining),
      savings_rate: income > 0 ? Math.round((remaining / income) * 100) : 0,
    },
    chartData,
  }
}

/**
 * Generic custom calculator — infers calculations from input/output IDs.
 * Handles commute costs, subscription totals, cooking comparisons,
 * home gym vs membership, smoking costs, house affordability, etc.
 */
function calcCustom(inputs: Record<string, number>, outputIds: string[]): CalcResult {
  const out: Record<string, number> = {}
  const vals = inputs

  // ── Commute calculator ──
  if (vals.miles_one_way != null && vals.commute_time != null) {
    const milesDay = (vals.miles_one_way ?? 15) * 2
    const days = vals.work_days ?? 250
    const wage = vals.hourly_wage ?? 25
    const commuteMinutes = (vals.commute_time ?? 30) * 2
    const annualMiles = milesDay * days
    const vehicleCost = annualMiles * 0.67 // IRS rate approx
    const timeCost = (commuteMinutes / 60) * days * wage
    out.annual_vehicle_cost = Math.round(vehicleCost)
    out.annual_time_cost = Math.round(timeCost)
    out.total_annual_cost = Math.round(vehicleCost + timeCost)
    out.monthly_cost = Math.round((vehicleCost + timeCost) / 12)
  }

  // ── Subscription calculator ──
  if (vals.streaming_count != null || vals.avg_streaming_cost != null) {
    const streaming = (vals.streaming_count ?? 3) * (vals.avg_streaming_cost ?? 15)
    const software = (vals.software_count ?? 2) * (vals.avg_software_cost ?? 12)
    const other = (vals.other_count ?? 1) * (vals.avg_other_cost ?? 10)
    const forgotten = (vals.forgotten_factor ?? 1.15)
    const monthly = (streaming + software + other) * forgotten
    out.monthly_total = Math.round(monthly)
    out.annual_total = Math.round(monthly * 12)
    out.vs_average = Math.round(monthly - 91) // avg US household ~$91/mo
  }

  // ── Cooking vs eating out ──
  if (vals.restaurant_meals_week != null && vals.home_cooking_cost != null) {
    const size = vals.household_size ?? 1
    const eatOutWeekly = (vals.restaurant_meals_week ?? 5) * (vals.avg_meal_cost ?? 15) * size
    const cookWeekly = (7 - (vals.restaurant_meals_week ?? 5)) * (vals.home_cooking_cost ?? 5) * size
    const currentAnnual = (eatOutWeekly + cookWeekly) * 52
    const allCookAnnual = 7 * (vals.home_cooking_cost ?? 5) * size * 52
    out.annual_savings = Math.round(currentAnnual - allCookAnnual)
    out.cost_difference = Math.round((eatOutWeekly - cookWeekly) * 52 / 12)
    out.weekly_eating_out = Math.round(eatOutWeekly)
    out.weekly_cooking = Math.round(cookWeekly)
  }

  // ── Home gym vs membership ──
  if (vals.monthly_gym_cost != null && vals.home_gym_cost != null) {
    const gymMonthly = (vals.monthly_gym_cost ?? 50) + (vals.travel_costs ?? 20)
    const gymAnnual = gymMonthly * 12 + (vals.annual_fees ?? 50)
    const gym5yr = gymAnnual * 5
    const homeGym5yr = (vals.home_gym_cost ?? 2000) + (200 * 5) // maintenance
    const visits = (vals.visits_per_month ?? 12) * 12 * 5
    out.gym_total_5yr = Math.round(gym5yr)
    out.home_gym_total_5yr = Math.round(homeGym5yr)
    out.savings = Math.round(gym5yr - homeGym5yr)
    out.cost_per_workout_gym = visits > 0 ? Math.round((gym5yr / visits) * 100) / 100 : 0
  }

  // ── Smoking cost ──
  if (vals.packs_per_day != null && vals.pack_price != null) {
    const dailyCost = (vals.packs_per_day ?? 1) * (vals.pack_price ?? 8)
    const years = vals.years_smoking ?? 30
    const directCost = dailyCost * 365 * years
    const r = (vals.investment_return ?? 7) / 100
    let opportunity = 0
    const monthlyAmount = dailyCost * 30
    if (r > 0) {
      const mr = r / 12
      const months = years * 12
      opportunity = monthlyAmount * ((Math.pow(1 + mr, months) - 1) / mr)
    }
    out.direct_cost = Math.round(directCost)
    out.opportunity_cost = Math.round(opportunity)
    out.total_cost = Math.round(directCost + opportunity)
  }

  // ── House affordability ──
  if (vals.annual_income != null && vals.mortgage_rate != null && outputIds.includes('max_house_price')) {
    const monthlyIncome = (vals.annual_income ?? 80000) / 12
    const maxPayment = monthlyIncome * 0.28 - (vals.monthly_debts ?? 0)
    const downPct = (vals.down_payment ?? 20) / 100
    const r = (vals.mortgage_rate ?? 6.5) / 100 / 12
    const n = 360
    let maxLoan = 0
    if (r > 0) {
      maxLoan = maxPayment * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n))
    }
    const maxPrice = maxLoan / (1 - downPct)
    out.max_house_price = Math.round(maxPrice)
    out.monthly_payment = Math.round(maxPayment)
    out.front_end_ratio = Math.round((maxPayment / monthlyIncome) * 100)
  }

  // ── Freelance vs full-time ──
  if (vals.salary != null && vals.hourly_rate != null) {
    const salary = vals.salary ?? 80000
    const taxRate = 0.25
    const employeeTakeHome = salary * (1 - taxRate)
    const freelanceGross = (vals.hourly_rate ?? 75) * (vals.billable_hours ?? 1500)
    const seTax = freelanceGross * 0.153
    const healthIns = (vals.health_insurance ?? 500) * 12
    const freelanceTakeHome = freelanceGross * (1 - taxRate) - seTax - healthIns
    out.employee_takehome = Math.round(employeeTakeHome)
    out.freelance_takehome = Math.round(freelanceTakeHome)
    out.difference = Math.round(freelanceTakeHome - employeeTakeHome)
  }

  // ── Dog ownership ──
  if (vals.dog_size != null && vals.lifespan != null) {
    const annualCost = vals.annual_cost ?? 2000
    const multiplier = vals.region_multiplier ?? 1
    const lifetime = annualCost * multiplier * (vals.lifespan ?? 12)
    out.lifetime_cost = Math.round(lifetime)
    out.monthly_budget = Math.round((annualCost * multiplier) / 12)
  }

  // ── London vs Lisbon ──
  if (vals.monthly_salary != null && outputIds.includes('london_disposable')) {
    const salary = vals.monthly_salary ?? 5000
    const rentPref = vals.rent_preference ?? 2 // 1=budget, 2=mid, 3=premium
    const lifestyle = vals.lifestyle_spending ?? 500
    const londonRent = [1200, 1800, 2800][Math.min(2, Math.max(0, rentPref - 1))]
    const lisbonRent = [600, 900, 1500][Math.min(2, Math.max(0, rentPref - 1))]
    const londonTax = salary * 0.25
    const lisbonTax = salary * 0.15 // NHR regime approx
    const londonDisp = salary - londonTax - londonRent - lifestyle * 1.3
    const lisbonDisp = salary - lisbonTax - lisbonRent - lifestyle * 0.7
    out.london_disposable = Math.round(londonDisp)
    out.lisbon_disposable = Math.round(lisbonDisp)
    out.savings_difference = Math.round(lisbonDisp - londonDisp)
  }

  // ── Airbnb vs long-term rental ──
  if (vals.nightly_rate != null && vals.monthly_rent != null) {
    const occ = (vals.occupancy_rate ?? 65) / 100
    const strGross = (vals.nightly_rate ?? 150) * 30 * occ
    const strExpenses = strGross * 0.35 // cleaning, platform fees, turnover
    const strNet = strGross - strExpenses
    const ltrNet = (vals.monthly_rent ?? 2000) * 0.9 // 10% for maintenance/vacancy
    out.str_monthly = Math.round(strGross)
    out.str_net = Math.round(strNet)
    out.ltr_net = Math.round(ltrNet)
    out.annual_difference = Math.round((strNet - ltrNet) * 12)
  }

  // ── Mortgage early payoff ──
  if (vals.mortgage_balance != null && vals.extra_payment != null) {
    const balance = vals.mortgage_balance ?? 250000
    const rate = (vals.mortgage_rate ?? 6) / 100 / 12
    const extra = vals.extra_payment ?? 500
    const investReturn = (vals.investment_return ?? 8) / 100
    // Standard payoff
    const stdPayment = balance * (rate * Math.pow(1 + rate, 360)) / (Math.pow(1 + rate, 360) - 1)
    let bal = balance; let totalInterest = 0; let months = 0
    while (bal > 0 && months < 360) {
      const int = bal * rate; totalInterest += int; bal -= (stdPayment - int); months++
    }
    // With extra payment
    let bal2 = balance; let totalInterest2 = 0; let months2 = 0
    while (bal2 > 0 && months2 < 360) {
      const int = bal2 * rate; totalInterest2 += int; bal2 -= (stdPayment + extra - int); months2++
    }
    const interestSaved = totalInterest - totalInterest2
    // Investment alternative
    const mr = investReturn / 12
    const investValue = extra * ((Math.pow(1 + mr, months) - 1) / mr)
    out.payoff_savings = Math.round(interestSaved)
    out.investment_value = Math.round(investValue)
    out.opportunity_cost = Math.round(investValue - interestSaved)
    out.interest_saved = Math.round(interestSaved)
    out.time_saved = Math.round((months - months2))
    out.effective_return = Math.round((vals.mortgage_rate ?? 6) * (1 - (vals.tax_bracket ?? 22) / 100) * 10) / 10
  }

  // ── College savings ──
  if (vals.child_age != null && outputIds.includes('monthly_savings')) {
    const age = vals.child_age ?? 5
    const yearsToCollege = Math.max(1, 18 - age)
    const collegeCosts: Record<number, number> = { 1: 120000, 2: 200000, 3: 300000 }
    const target = collegeCosts[vals.college_type ?? 2] ?? 200000
    const coverage = (vals.target_coverage ?? 75) / 100
    const needed = target * coverage
    const r = (vals.annual_return ?? 7) / 100 / 12
    const months = yearsToCollege * 12
    let monthly = 0
    if (r > 0) { monthly = needed * r / (Math.pow(1 + r, months) - 1) }
    else { monthly = needed / months }
    out.monthly_savings = Math.round(monthly)
    out.total_saved = Math.round(monthly * months)
    out.projected_cost = Math.round(target)
  }

  // ── Car budgeting ──
  if (vals.gross_income != null && vals.take_home_percentage != null) {
    const takeHome = (vals.gross_income ?? 80000) * ((vals.take_home_percentage ?? 70) / 100) / 12
    const maxTransport = takeHome * 0.175 // 15-20% midpoint
    const max110th = (vals.gross_income ?? 80000) / 10
    const ins = vals.insurance_monthly ?? 150
    const fuel = vals.fuel_monthly ?? 150
    out.monthly_take_home = Math.round(takeHome)
    out.max_transportation_budget = Math.round(maxTransport)
    out.max_payment_110th = Math.round(max110th)
    out.available_for_payment = Math.round(maxTransport - ins - fuel)
  }

  // ── Dubai salary / generic salary calculator ──
  if (outputIds.includes('monthly_salary') && vals.family_size != null) {
    const base = 15000 // Base salary AED
    const familyAdj = (vals.family_size ?? 1) * 3000
    const childrenAdj = (vals.children ?? 0) * 5000
    const areaAdj = [0, 3000, 6000, 10000][Math.min(3, vals.area_preference ?? 2)]
    const lifestyleAdj = [0, 2000, 5000, 10000][Math.min(3, vals.lifestyle ?? 2)]
    const total = base + familyAdj + childrenAdj + areaAdj + lifestyleAdj
    out.monthly_salary = Math.round(total)
    out.housing_budget = Math.round(total * 0.3)
    out.school_costs = Math.round((vals.children ?? 0) * 4000)
    out.monthly_salary_needed = Math.round(total)
    out.annual_salary_needed = Math.round(total * 12)
  }

  // ── Mortgage principal vs interest (how it works) ──
  if (vals.loan_amount != null && outputIds.includes('interest_saved')) {
    const loan = vals.loan_amount ?? 300000
    const rate = (vals.interest_rate ?? 6) / 100 / 12
    const stdPayment = loan * (rate * Math.pow(1 + rate, 360)) / (Math.pow(1 + rate, 360) - 1)
    const extra = vals.extra_payment ?? 200
    const lump = vals.lump_sum ?? 0
    let bal = loan - lump; let totalInt = 0; let m1 = 0
    while (bal > 0 && m1 < 360) { const i = bal * rate; totalInt += i; bal -= (stdPayment - i); m1++ }
    let bal2 = loan - lump; let totalInt2 = 0; let m2 = 0
    while (bal2 > 0 && m2 < 360) { const i = bal2 * rate; totalInt2 += i; bal2 -= (stdPayment + extra - i); m2++ }
    out.interest_saved = Math.round(totalInt - totalInt2)
    out.time_saved = Math.round(m1 - m2)
    out.effective_return = Math.round((vals.interest_rate ?? 6) * 10) / 10
  }

  // ── Baby / first year cost calculator ──
  if ((vals.childcare != null || vals.feeding != null) && outputIds.includes('total_first_year')) {
    const location = vals.location ?? 2 // 1=low COL, 2=medium, 3=high
    const locMultiplier = [0.7, 1.0, 1.5][Math.min(2, Math.max(0, Math.round(location) - 1))]
    const childcare = (vals.childcare ?? 1000) * 12 * locMultiplier
    const feeding = (vals.feeding ?? 200) * 12 * locMultiplier
    const gear = 2500 * locMultiplier // one-time: crib, stroller, car seat, etc.
    const medical = 1500 * locMultiplier
    const diapers = 80 * 12 * locMultiplier
    const incomeLoss = (vals.income_loss ?? 0) * 3 // months of lost income
    const total = childcare + feeding + gear + medical + diapers + incomeLoss
    out.total_first_year = Math.round(total)
    out.monthly_average = Math.round(total / 12)
    out.childcare_cost = Math.round(childcare)
    out.gear_and_medical = Math.round(gear + medical)
  }

  // ── Generic fallback — if no pattern matched, try summing inputs as costs ──
  if (Object.keys(out).length === 0 && outputIds.length > 0) {
    const inputValues = Object.values(vals).filter(v => typeof v === 'number')
    const total = inputValues.reduce((sum, v) => sum + v, 0)
    // Try to intelligently map outputs
    for (const oid of outputIds) {
      if (oid.includes('total') || oid.includes('cost')) {
        out[oid] = Math.round(total * 12)  // assume monthly → annual
      } else if (oid.includes('monthly') || oid.includes('average')) {
        out[oid] = Math.round(total)
      } else if (oid.includes('rate') || oid.includes('percent')) {
        const income = vals.monthly_income ?? vals.income ?? vals.salary ?? total * 2
        out[oid] = income > 0 ? Math.round((total / income) * 100) : 0
      } else if (oid.includes('saving') || oid.includes('remain') || oid.includes('left')) {
        const income = vals.monthly_income ?? vals.income ?? 0
        out[oid] = Math.round(income - total)
      } else {
        out[oid] = Math.round(total)
      }
    }
  }

  // Build simple chart data if we have outputs
  const chartData: Array<Record<string, number | string>> = []
  const outKeys = Object.keys(out)
  if (outKeys.length > 0) {
    outKeys.slice(0, 4).forEach(key => {
      chartData.push({ year: key.replace(/_/g, ' '), value: out[key] })
    })
  }

  return { outputs: out, chartData }
}

// ── Named calculator functions (promoted from calcCustom patterns) ───────────

function calcCommuteCost(inputs: Record<string, number>): CalcResult {
  const milesDay = (inputs.miles_one_way ?? 15) * 2
  const days = inputs.work_days ?? 250
  const wage = inputs.hourly_wage ?? 25
  const commuteMinutes = (inputs.commute_time ?? 30) * 2
  const annualMiles = milesDay * days
  const vehicleCost = annualMiles * 0.67
  const timeCost = (commuteMinutes / 60) * days * wage
  return {
    outputs: {
      annual_vehicle_cost: Math.round(vehicleCost),
      annual_time_cost: Math.round(timeCost),
      total_annual_cost: Math.round(vehicleCost + timeCost),
      monthly_cost: Math.round((vehicleCost + timeCost) / 12),
    },
    chartData: [
      { year: 'Vehicle costs', value: Math.round(vehicleCost) },
      { year: 'Time cost', value: Math.round(timeCost) },
    ],
  }
}

function calcSubscriptionAudit(inputs: Record<string, number>): CalcResult {
  const streaming = (inputs.streaming_count ?? 3) * (inputs.avg_streaming_cost ?? 15)
  const software = (inputs.software_count ?? 2) * (inputs.avg_software_cost ?? 12)
  const other = (inputs.other_count ?? 1) * (inputs.avg_other_cost ?? 10)
  const forgotten = inputs.forgotten_factor ?? 1.15
  const monthly = (streaming + software + other) * forgotten
  return {
    outputs: {
      monthly_total: Math.round(monthly),
      annual_total: Math.round(monthly * 12),
      vs_average: Math.round(monthly - 91),
    },
    chartData: [
      { year: 'Streaming', value: Math.round(streaming) },
      { year: 'Software', value: Math.round(software) },
      { year: 'Other', value: Math.round(other) },
    ],
  }
}

function calcCookingComparison(inputs: Record<string, number>): CalcResult {
  const size = inputs.household_size ?? 1
  const eatOutWeekly = (inputs.restaurant_meals_week ?? 5) * (inputs.avg_meal_cost ?? 15) * size
  const cookWeekly = (7 - (inputs.restaurant_meals_week ?? 5)) * (inputs.home_cooking_cost ?? 5) * size
  const currentAnnual = (eatOutWeekly + cookWeekly) * 52
  const allCookAnnual = 7 * (inputs.home_cooking_cost ?? 5) * size * 52
  return {
    outputs: {
      annual_savings: Math.round(currentAnnual - allCookAnnual),
      cost_difference: Math.round((eatOutWeekly - cookWeekly) * 52 / 12),
      weekly_eating_out: Math.round(eatOutWeekly),
      weekly_cooking: Math.round(cookWeekly),
    },
    chartData: [
      { year: 'Eating out', value: Math.round(eatOutWeekly * 52) },
      { year: 'Cooking', value: Math.round(allCookAnnual) },
    ],
  }
}

function calcGymComparison(inputs: Record<string, number>): CalcResult {
  const gymMonthly = (inputs.monthly_gym_cost ?? 50) + (inputs.travel_costs ?? 20)
  const gymAnnual = gymMonthly * 12 + (inputs.annual_fees ?? 50)
  const gym5yr = gymAnnual * 5
  const homeGym5yr = (inputs.home_gym_cost ?? 2000) + (200 * 5)
  const visits = (inputs.visits_per_month ?? 12) * 12 * 5
  return {
    outputs: {
      gym_total_5yr: Math.round(gym5yr),
      home_gym_total_5yr: Math.round(homeGym5yr),
      savings: Math.round(gym5yr - homeGym5yr),
      cost_per_workout_gym: visits > 0 ? Math.round((gym5yr / visits) * 100) / 100 : 0,
    },
    chartData: [
      { year: 'Gym membership', value: Math.round(gym5yr) },
      { year: 'Home gym', value: Math.round(homeGym5yr) },
    ],
  }
}

function calcSmokingCost(inputs: Record<string, number>): CalcResult {
  const dailyCost = (inputs.packs_per_day ?? 1) * (inputs.pack_price ?? 8)
  const years = inputs.years_smoking ?? 30
  const directCost = dailyCost * 365 * years
  const r = (inputs.investment_return ?? 7) / 100
  const monthlyAmount = dailyCost * 30
  let opportunity = 0
  if (r > 0) {
    const mr = r / 12
    const months = years * 12
    opportunity = monthlyAmount * ((Math.pow(1 + mr, months) - 1) / mr)
  }
  return {
    outputs: {
      direct_cost: Math.round(directCost),
      opportunity_cost: Math.round(opportunity),
      total_cost: Math.round(directCost + opportunity),
    },
    chartData: [
      { year: 'Direct cost', value: Math.round(directCost) },
      { year: 'Opportunity cost', value: Math.round(opportunity) },
    ],
  }
}

function calcHouseAffordability(inputs: Record<string, number>): CalcResult {
  const monthlyIncome = (inputs.annual_income ?? 80000) / 12
  const maxPayment = monthlyIncome * 0.28 - (inputs.monthly_debts ?? 0)
  const downPct = (inputs.down_payment ?? 20) / 100
  const r = (inputs.mortgage_rate ?? 6.5) / 100 / 12
  const n = 360
  let maxLoan = 0
  if (r > 0) { maxLoan = maxPayment * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n)) }
  const maxPrice = maxLoan / (1 - downPct)
  return {
    outputs: {
      max_house_price: Math.round(maxPrice),
      monthly_payment: Math.round(maxPayment),
      front_end_ratio: Math.round((maxPayment / monthlyIncome) * 100),
    },
    chartData: [
      { year: 'Max price', value: Math.round(maxPrice) },
      { year: 'Down payment', value: Math.round(maxPrice * downPct) },
      { year: 'Loan amount', value: Math.round(maxLoan) },
    ],
  }
}

function calcFreelanceComparison(inputs: Record<string, number>): CalcResult {
  const salary = inputs.salary ?? 80000
  const taxRate = 0.25
  const employeeTakeHome = salary * (1 - taxRate)
  const freelanceGross = (inputs.hourly_rate ?? 75) * (inputs.billable_hours ?? 1500)
  const seTax = freelanceGross * 0.153
  const healthIns = (inputs.health_insurance ?? 500) * 12
  const freelanceTakeHome = freelanceGross * (1 - taxRate) - seTax - healthIns
  return {
    outputs: {
      employee_takehome: Math.round(employeeTakeHome),
      freelance_takehome: Math.round(freelanceTakeHome),
      difference: Math.round(freelanceTakeHome - employeeTakeHome),
    },
    chartData: [
      { year: 'Employee', value: Math.round(employeeTakeHome) },
      { year: 'Freelance', value: Math.round(freelanceTakeHome) },
    ],
  }
}

function calcDogOwnership(inputs: Record<string, number>): CalcResult {
  const annualCost = inputs.annual_cost ?? 2000
  const multiplier = inputs.region_multiplier ?? 1
  const lifetime = annualCost * multiplier * (inputs.lifespan ?? 12)
  return {
    outputs: {
      lifetime_cost: Math.round(lifetime),
      monthly_budget: Math.round((annualCost * multiplier) / 12),
    },
    chartData: Array.from({ length: Math.min(inputs.lifespan ?? 12, 15) }, (_, i) => ({
      year: `Year ${i + 1}`,
      value: Math.round(annualCost * multiplier * (i + 1)),
    })),
  }
}

function calcCostOfLivingComparison(inputs: Record<string, number>): CalcResult {
  const salary = inputs.monthly_salary ?? 5000
  const rentPref = inputs.rent_preference ?? 2
  const lifestyle = inputs.lifestyle_spending ?? 500
  const londonRent = [1200, 1800, 2800][Math.min(2, Math.max(0, rentPref - 1))]
  const lisbonRent = [600, 900, 1500][Math.min(2, Math.max(0, rentPref - 1))]
  const londonTax = salary * 0.25
  const lisbonTax = salary * 0.15
  const londonDisp = salary - londonTax - londonRent - lifestyle * 1.3
  const lisbonDisp = salary - lisbonTax - lisbonRent - lifestyle * 0.7
  return {
    outputs: {
      london_disposable: Math.round(londonDisp),
      lisbon_disposable: Math.round(lisbonDisp),
      savings_difference: Math.round(lisbonDisp - londonDisp),
    },
    chartData: [
      { year: 'London', value: Math.round(londonDisp) },
      { year: 'Lisbon', value: Math.round(lisbonDisp) },
    ],
  }
}

function calcRentalComparison(inputs: Record<string, number>): CalcResult {
  const occ = (inputs.occupancy_rate ?? 65) / 100
  const strGross = (inputs.nightly_rate ?? 150) * 30 * occ
  const strExpenses = strGross * 0.35
  const strNet = strGross - strExpenses
  const ltrNet = (inputs.monthly_rent ?? 2000) * 0.9
  return {
    outputs: {
      str_monthly: Math.round(strGross),
      str_net: Math.round(strNet),
      ltr_net: Math.round(ltrNet),
      annual_difference: Math.round((strNet - ltrNet) * 12),
    },
    chartData: [
      { year: 'Airbnb net', value: Math.round(strNet) },
      { year: 'Long-term net', value: Math.round(ltrNet) },
    ],
  }
}

function calcMortgagePayoff(inputs: Record<string, number>): CalcResult {
  const balance = inputs.mortgage_balance ?? inputs.loan_amount ?? 250000
  const rate = (inputs.mortgage_rate ?? inputs.interest_rate ?? 6) / 100 / 12
  const extra = inputs.extra_payment ?? 500
  const investReturn = (inputs.investment_return ?? 8) / 100
  const lump = inputs.lump_sum ?? 0
  const stdPayment = balance * (rate * Math.pow(1 + rate, 360)) / (Math.pow(1 + rate, 360) - 1)
  let bal = balance - lump; let totalInterest = 0; let months = 0
  while (bal > 0 && months < 360) { const int = bal * rate; totalInterest += int; bal -= (stdPayment - int); months++ }
  let bal2 = balance - lump; let totalInterest2 = 0; let months2 = 0
  while (bal2 > 0 && months2 < 360) { const int = bal2 * rate; totalInterest2 += int; bal2 -= (stdPayment + extra - int); months2++ }
  const interestSaved = totalInterest - totalInterest2
  const mr = investReturn / 12
  const investValue = mr > 0 ? extra * ((Math.pow(1 + mr, months) - 1) / mr) : extra * months
  return {
    outputs: {
      payoff_savings: Math.round(interestSaved),
      interest_saved: Math.round(interestSaved),
      investment_value: Math.round(investValue),
      opportunity_cost: Math.round(investValue - interestSaved),
      time_saved: Math.round(months - months2),
      effective_return: Math.round((inputs.mortgage_rate ?? inputs.interest_rate ?? 6) * (1 - (inputs.tax_bracket ?? 22) / 100) * 10) / 10,
    },
    chartData: [
      { year: 'Interest saved', value: Math.round(interestSaved) },
      { year: 'Investment value', value: Math.round(investValue) },
    ],
  }
}

function calcCollegeSavings(inputs: Record<string, number>): CalcResult {
  const age = inputs.child_age ?? 5
  const yearsToCollege = Math.max(1, 18 - age)
  const collegeCosts: Record<number, number> = { 1: 120000, 2: 200000, 3: 300000 }
  const target = collegeCosts[inputs.college_type ?? 2] ?? 200000
  const coverage = (inputs.target_coverage ?? 75) / 100
  const needed = target * coverage
  const r = (inputs.annual_return ?? 7) / 100 / 12
  const months = yearsToCollege * 12
  let monthly = 0
  if (r > 0) { monthly = needed * r / (Math.pow(1 + r, months) - 1) } else { monthly = needed / months }
  return {
    outputs: {
      monthly_savings: Math.round(monthly),
      total_saved: Math.round(monthly * months),
      projected_cost: Math.round(target),
    },
    chartData: Array.from({ length: yearsToCollege + 1 }, (_, i) => {
      let saved = 0
      if (r > 0) { saved = monthly * ((Math.pow(1 + r, i * 12) - 1) / r) } else { saved = monthly * i * 12 }
      return { year: `Age ${age + i}`, value: Math.round(saved) }
    }),
  }
}

function calcCarBudget(inputs: Record<string, number>): CalcResult {
  const takeHome = (inputs.gross_income ?? 80000) * ((inputs.take_home_percentage ?? 70) / 100) / 12
  const maxTransport = takeHome * 0.175
  const max110th = (inputs.gross_income ?? 80000) / 10
  const ins = inputs.insurance_monthly ?? 150
  const fuel = inputs.fuel_monthly ?? 150
  return {
    outputs: {
      monthly_take_home: Math.round(takeHome),
      max_transportation_budget: Math.round(maxTransport),
      max_payment_110th: Math.round(max110th),
      available_for_payment: Math.round(maxTransport - ins - fuel),
    },
    chartData: [
      { year: 'Insurance', value: Math.round(ins) },
      { year: 'Fuel', value: Math.round(fuel) },
      { year: 'Available', value: Math.round(maxTransport - ins - fuel) },
    ],
  }
}

function calcSalaryCalculator(inputs: Record<string, number>): CalcResult {
  const base = 15000
  const familyAdj = (inputs.family_size ?? 1) * 3000
  const childrenAdj = (inputs.children ?? 0) * 5000
  const areaAdj = [0, 3000, 6000, 10000][Math.min(3, inputs.area_preference ?? 2)]
  const lifestyleAdj = [0, 2000, 5000, 10000][Math.min(3, inputs.lifestyle ?? 2)]
  const total = base + familyAdj + childrenAdj + areaAdj + lifestyleAdj
  return {
    outputs: {
      monthly_salary: Math.round(total),
      monthly_salary_needed: Math.round(total),
      annual_salary_needed: Math.round(total * 12),
      housing_budget: Math.round(total * 0.3),
      school_costs: Math.round((inputs.children ?? 0) * 4000),
    },
    chartData: [
      { year: 'Housing', value: Math.round(total * 0.3) },
      { year: 'Schools', value: Math.round((inputs.children ?? 0) * 4000) },
      { year: 'Living', value: Math.round(total * 0.4) },
    ],
  }
}

function calcBabyCost(inputs: Record<string, number>): CalcResult {
  const location = inputs.location ?? 2
  const locMultiplier = [0.7, 1.0, 1.5][Math.min(2, Math.max(0, Math.round(location) - 1))]
  const childcare = (inputs.childcare ?? 1000) * 12 * locMultiplier
  const feeding = (inputs.feeding ?? 200) * 12 * locMultiplier
  const gear = 2500 * locMultiplier
  const medical = 1500 * locMultiplier
  const diapers = 80 * 12 * locMultiplier
  const incomeLoss = (inputs.income_loss ?? 0) * 3
  const total = childcare + feeding + gear + medical + diapers + incomeLoss
  return {
    outputs: {
      total_first_year: Math.round(total),
      monthly_average: Math.round(total / 12),
      childcare_cost: Math.round(childcare),
      gear_and_medical: Math.round(gear + medical),
    },
    chartData: [
      { year: 'Childcare', value: Math.round(childcare) },
      { year: 'Feeding', value: Math.round(feeding) },
      { year: 'Gear + Medical', value: Math.round(gear + medical) },
      { year: 'Diapers', value: Math.round(diapers) },
    ],
  }
}

function calcEngagementRingBudget(inputs: Record<string, number>): CalcResult {
  const annualIncome = inputs.annual_income ?? 75000
  const monthlyIncome = annualIncome / 12
  const rent = inputs.monthly_rent_mortgage ?? inputs.monthly_expenses ?? 1800
  const debt = inputs.monthly_debt_payments ?? inputs.debt_payments ?? 400
  const other = inputs.monthly_other_expenses ?? 1500
  const savingsGoal = inputs.monthly_savings_goal ?? 800
  const currentSavings = inputs.current_ring_savings ?? inputs.current_savings ?? 2000
  const tax = monthlyIncome * 0.25
  const disposable = monthlyIncome - tax - rent - debt - other - savingsGoal
  const conservative = Math.max(0, disposable) // 1 month disposable
  const comfortable = Math.max(0, disposable * 2) // 2 months
  return {
    outputs: {
      monthly_disposable_income: Math.round(disposable),
      recommended_budget: Math.round(conservative + currentSavings),
      conservative_budget: Math.round(conservative + currentSavings),
      max_budget: Math.round(comfortable + currentSavings),
      comfortable_budget: Math.round(comfortable + currentSavings),
      total_available_budget: Math.round(comfortable + currentSavings),
      monthly_savings_needed: Math.round(comfortable > 0 ? (comfortable - currentSavings) / 6 : 0),
    },
    chartData: [
      { year: 'Conservative', value: Math.round(conservative + currentSavings) },
      { year: 'Comfortable', value: Math.round(comfortable + currentSavings) },
    ],
  }
}

// ── Calculator dispatcher ────────────────────────────────────────────────────

// Expected input IDs per calculator type — used for positional fallback
const EXPECTED_INPUTS: Record<string, string[]> = {
  compound_interest: ['starting_age', 'monthly_savings', 'annual_return', 'retirement_age'],
  mortgage: ['home_price', 'down_payment', 'interest_rate', 'loan_term'],
  mortgage_payoff: ['mortgage_balance', 'mortgage_rate', 'extra_payment', 'investment_return'],
  roi_comparison: ['initial_investment', 'rate_a', 'rate_b', 'years'],
  budget: ['monthly_income', 'housing', 'transport', 'food', 'utilities', 'entertainment'],
  commute_cost: ['miles_one_way', 'work_days', 'hourly_wage', 'commute_time'],
  subscription_audit: ['streaming_count', 'avg_streaming_cost', 'software_count', 'avg_software_cost'],
  cooking_comparison: ['restaurant_meals_week', 'avg_meal_cost', 'home_cooking_cost', 'household_size'],
  gym_comparison: ['monthly_gym_cost', 'home_gym_cost', 'visits_per_month', 'annual_fees', 'travel_costs'],
  smoking_cost: ['packs_per_day', 'pack_price', 'years_smoking', 'investment_return'],
  house_affordability: ['annual_income', 'monthly_debts', 'down_payment', 'mortgage_rate'],
  freelance_comparison: ['salary', 'hourly_rate', 'billable_hours', 'health_insurance'],
  dog_ownership: ['annual_cost', 'region_multiplier', 'lifespan'],
  cost_of_living_comparison: ['monthly_salary', 'rent_preference', 'lifestyle_spending'],
  rental_comparison: ['nightly_rate', 'monthly_rent', 'occupancy_rate', 'property_value'],
  college_savings: ['child_age', 'college_type', 'target_coverage', 'annual_return'],
  car_budget: ['gross_income', 'take_home_percentage', 'insurance_monthly', 'fuel_monthly'],
  salary_calculator: ['family_size', 'children', 'area_preference', 'lifestyle'],
  baby_cost: ['location', 'childcare', 'feeding', 'income_loss'],
  engagement_ring_budget: ['annual_income', 'monthly_rent_mortgage', 'monthly_debt_payments', 'monthly_other_expenses', 'monthly_savings_goal', 'current_ring_savings'],
}

/**
 * Remap input values to expected IDs if the actual IDs don't match.
 * Falls back to positional mapping — first slider value maps to first expected ID, etc.
 */
function remapInputs(type: string, inputs: Record<string, number>): Record<string, number> {
  const expected = EXPECTED_INPUTS[type]
  if (!expected) return inputs

  // Check if at least half the expected IDs are present
  const matchCount = expected.filter(id => inputs[id] !== undefined).length
  if (matchCount >= expected.length / 2) return inputs // IDs match well enough

  // Positional fallback: map actual values (in insertion order) to expected IDs
  const actualValues = Object.values(inputs)
  const remapped: Record<string, number> = { ...inputs } // Keep originals too
  for (let i = 0; i < expected.length && i < actualValues.length; i++) {
    remapped[expected[i]] = actualValues[i]
  }
  return remapped
}

function runCalculation(
  type: string,
  inputs: Record<string, number>,
  _formula?: string,
  outputIds?: string[]
): CalcResult {
  // Remap inputs if IDs don't match expected — positional fallback
  const remapped = remapInputs(type, inputs)

  switch (type) {
    // Tier 1 — original named types
    case 'compound_interest': return calcCompoundInterest(remapped)
    case 'mortgage': return calcMortgage(remapped)
    case 'roi_comparison': return calcRoiComparison(remapped)
    case 'budget': return calcBudget(remapped)
    // Tier 2 — promoted from custom
    case 'commute_cost': return calcCommuteCost(remapped)
    case 'subscription_audit': return calcSubscriptionAudit(remapped)
    case 'cooking_comparison': return calcCookingComparison(remapped)
    case 'gym_comparison': return calcGymComparison(remapped)
    case 'smoking_cost': return calcSmokingCost(remapped)
    case 'house_affordability': return calcHouseAffordability(remapped)
    case 'freelance_comparison': return calcFreelanceComparison(remapped)
    case 'dog_ownership': return calcDogOwnership(remapped)
    case 'cost_of_living_comparison': return calcCostOfLivingComparison(remapped)
    case 'rental_comparison': return calcRentalComparison(remapped)
    case 'mortgage_payoff': return calcMortgagePayoff(remapped)
    case 'college_savings': return calcCollegeSavings(remapped)
    case 'car_budget': return calcCarBudget(remapped)
    case 'salary_calculator': return calcSalaryCalculator(remapped)
    case 'baby_cost': return calcBabyCost(remapped)
    case 'engagement_ring_budget': return calcEngagementRingBudget(remapped)
    // Legacy fallback — pattern matching for old articles
    case 'custom':
    default:
      return calcCustom(remapped, outputIds ?? [])
  }
}

// ── Animated number ──────────────────────────────────────────────────────────

function AnimatedNumber({ value, format }: { value: number; format: string }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)

  useEffect(() => {
    const from = prev.current
    const to = value
    prev.current = value

    if (Math.abs(from - to) < 1) {
      setDisplay(to)
      return
    }

    const duration = 400
    const steps = 20
    const stepTime = duration / steps
    let step = 0

    const interval = setInterval(() => {
      step++
      const progress = step / steps
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (to - from) * eased)
      if (step >= steps) {
        clearInterval(interval)
        setDisplay(to)
      }
    }, stepTime)

    return () => clearInterval(interval)
  }, [value])

  const formatted = useMemo(() => {
    const n = Math.round(display)
    if (format === 'currency') {
      return '$' + n.toLocaleString('en-US')
    }
    if (format === 'percentage') {
      return n + '%'
    }
    return n.toLocaleString('en-US')
  }, [display, format])

  return <>{formatted}</>
}

// ── Main component ───────────────────────────────────────────────────────────

export default function InteractiveCalculator({ section }: { section: InteractiveCalculatorSection }) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    section.inputs.forEach(inp => { initial[inp.id] = inp.default })
    return initial
  })

  const handleChange = useCallback((id: string, val: number) => {
    setValues(prev => ({ ...prev, [id]: val }))
  }, [])

  const rawResult = useMemo(
    () => runCalculation(section.calculator_type, values, section.formula, section.outputs?.map(o => o.id)),
    [section.calculator_type, section.formula, values]
  )

  const outputDefs = section.outputs ?? []

  // Remap outputs: if the section's output IDs don't match the calc function's output IDs,
  // map by position so values still render correctly
  const result = useMemo(() => {
    const outputs = rawResult.outputs
    const outKeys = Object.keys(outputs)
    const defIds = outputDefs.map(d => d.id)

    // Check if output IDs match
    const matchCount = defIds.filter(id => outputs[id] !== undefined && outputs[id] !== 0).length
    if (matchCount >= defIds.length / 2) return rawResult // IDs match well enough

    // Positional fallback: map calc output values to section output IDs by position
    const outValues = Object.values(outputs)
    const remappedOutputs: Record<string, number> = { ...outputs }
    for (let i = 0; i < defIds.length && i < outValues.length; i++) {
      remappedOutputs[defIds[i]] = outValues[i]
    }
    return { ...rawResult, outputs: remappedOutputs }
  }, [rawResult, outputDefs])

  return (
    <div className="mb-8">
      <div
        className="rounded-2xl overflow-hidden p-5 md:p-7"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: ACCENT_LIGHT }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="8" y1="10" x2="10" y2="10" />
              <line x1="12" y1="10" x2="14" y2="10" />
              <line x1="8" y1="14" x2="10" y2="14" />
              <line x1="12" y1="14" x2="14" y2="14" />
              <line x1="8" y1="18" x2="14" y2="18" />
            </svg>
          </div>
          <div>
            <h3
              className="text-lg font-bold"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              {section.heading}
            </h3>
            {section.description && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {section.description}
              </p>
            )}
          </div>
        </div>

        {/* Sliders */}
        <div className="mt-5 space-y-5">
          {section.inputs.map((input) => (
            <div key={input.id}>
              <div className="flex items-baseline justify-between mb-1.5">
                <label
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {input.label}
                </label>
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color: ACCENT, fontFamily: 'var(--font-sora)' }}
                >
                  {input.unit === '$' && '$'}
                  {values[input.id]?.toLocaleString('en-US')}
                  {input.unit && input.unit !== '$' && ` ${input.unit}`}
                </span>
              </div>
              <input
                type="range"
                min={input.min}
                max={input.max}
                step={input.step}
                value={values[input.id] ?? input.default}
                onChange={(e) => handleChange(input.id, parseFloat(e.target.value))}
                className="calc-slider"
                style={{
                  width: '100%',
                  accentColor: ACCENT,
                }}
              />
              <div className="flex justify-between text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                <span>{input.unit === '$' ? `$${input.min.toLocaleString()}` : `${input.min}${input.unit ? ` ${input.unit}` : ''}`}</span>
                <span>{input.unit === '$' ? `$${input.max.toLocaleString()}` : `${input.max}${input.unit ? ` ${input.unit}` : ''}`}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Output stat cards */}
        {outputDefs.length > 0 && (
          <div className={`grid gap-3 mt-6 ${outputDefs.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
            {outputDefs.map((out) => (
              <div
                key={out.id}
                className="rounded-xl p-4 text-center"
                style={{
                  backgroundColor: ACCENT_LIGHT,
                  border: `1px solid #f0d5be`,
                }}
              >
                <p
                  className="text-xl md:text-2xl font-extrabold mb-0.5"
                  style={{ fontFamily: 'var(--font-sora)', color: ACCENT }}
                >
                  <AnimatedNumber
                    value={result.outputs[out.id] ?? 0}
                    format={out.format}
                  />
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {out.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Growth chart */}
        {result.chartData.length > 1 && (
          <div className="mt-6" style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={result.chartData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="calcGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  tickFormatter={(v) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`}
                  width={65}
                />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={ACCENT}
                  fill="url(#calcGradient)"
                  strokeWidth={2.5}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Source / disclaimer */}
        {section.source && (
          <p className="text-xs mt-4 italic" style={{ color: 'var(--text-secondary)' }}>
            {section.source}
          </p>
        )}
      </div>

      <style>{`
        .calc-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 3px;
          background: var(--border);
          outline: none;
          cursor: pointer;
        }
        .calc-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${ACCENT};
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
        .calc-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${ACCENT};
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  )
}
