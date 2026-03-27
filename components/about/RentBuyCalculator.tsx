'use client'

import { useState } from 'react'

export default function RentBuyCalculator() {
  const [rent, setRent] = useState(1500)
  const [price, setPrice] = useState(350000)
  const [deposit, setDeposit] = useState(10)
  const [term, setTerm] = useState(25)

  const depositAmount = price * (deposit / 100)
  const loanAmount = price - depositAmount
  const monthlyRate = 0.045 / 12
  const payments = term * 12
  const monthlyMortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, payments)) / (Math.pow(1 + monthlyRate, payments) - 1)
  const monthlyMaintenance = (price * 0.001) / 12
  const monthlyBuying = monthlyMortgage + monthlyMaintenance

  let breakEvenYears = 0
  for (let year = 1; year <= 30; year++) {
    const totalRent = rent * 12 * year
    const totalBuying = monthlyBuying * 12 * year + depositAmount
    if (totalRent > totalBuying) { breakEvenYears = year; break }
  }

  const yearsToShow = breakEvenYears || 30
  const totalRentAtBE = rent * 12 * yearsToShow
  const totalBuyingAtBE = monthlyBuying * 12 * yearsToShow + depositAmount
  const savings = Math.abs(totalRentAtBE - totalBuyingAtBE)
  const rentingCheaper = breakEvenYears === 0

  return (
    <div className="rounded-xl p-6 md:p-8" style={{ backgroundColor: '#fff', border: '1px solid #E8E2D9' }}>
      <h4 className="text-lg font-bold mb-5" style={{ color: '#1A1714', fontFamily: 'var(--font-sora)' }}>Should I Rent or Buy?</h4>
      <div className="space-y-5">
        <Slider label="Monthly rent" value={rent} min={500} max={5000} step={50} format={v => `£${v.toLocaleString()}`} onChange={setRent} />
        <Slider label="Home purchase price" value={price} min={100000} max={1000000} step={10000} format={v => `£${v.toLocaleString()}`} onChange={setPrice} />
        <Slider label="Deposit saved" value={deposit} min={5} max={30} step={1} format={v => `${v}%`} onChange={setDeposit} />
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: '#1A1714' }}>Mortgage term</p>
          <div className="flex gap-1.5">
            {[15, 20, 25, 30].map(t => (
              <button key={t} onClick={() => setTerm(t)} className="flex-1 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: term === t ? '#BA7517' : '#F5F4F1', color: term === t ? '#fff' : '#6B6B6B', border: term === t ? '1px solid #BA7517' : '1px solid #E8E3DC', cursor: 'pointer' }}>
                {t}yr
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Two large stat boxes */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        <div className="rounded-xl text-center" style={{ backgroundColor: '#fff', border: '1px solid #E8E2D9', padding: '20px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: '#9E948A', textTransform: 'uppercase' as const, marginBottom: '4px' }}>Total rent paid</p>
          <p style={{ fontSize: '32px', fontWeight: 700, color: '#1A1714', fontFamily: 'var(--font-sora)', lineHeight: 1.1 }}>£{Math.round(totalRentAtBE).toLocaleString()}</p>
          <p style={{ fontSize: '12px', color: '#9E948A', marginTop: '4px' }}>over {yearsToShow} years</p>
        </div>
        <div className="rounded-xl text-center" style={{ backgroundColor: '#fff', border: '1px solid #E8E2D9', padding: '20px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: '#9E948A', textTransform: 'uppercase' as const, marginBottom: '4px' }}>Total buying cost</p>
          <p style={{ fontSize: '32px', fontWeight: 700, color: '#1A1714', fontFamily: 'var(--font-sora)', lineHeight: 1.1 }}>£{Math.round(totalBuyingAtBE).toLocaleString()}</p>
          <p style={{ fontSize: '12px', color: '#9E948A', marginTop: '4px' }}>including deposit &amp; interest</p>
        </div>
      </div>

      {/* Result banner */}
      <div className="mt-4 rounded-xl text-center" style={{ backgroundColor: '#FDF6E9', border: '1px solid #F0D9A8', padding: '16px 20px' }}>
        <p className="text-lg font-bold" style={{ color: '#BA7517', fontFamily: 'var(--font-sora)' }}>
          {rentingCheaper ? 'Renting is cheaper over 30 years' : `Buying breaks even in year ${breakEvenYears}`}
        </p>
        <p className="text-sm mt-1" style={{ color: '#6B6259' }}>
          {rentingCheaper
            ? `You save £${Math.round(savings).toLocaleString()} by renting`
            : `Buying saves £${Math.round(savings).toLocaleString()} over 30 years`}
        </p>
      </div>

      <p className="text-[10px] text-center mt-4" style={{ color: '#9E948A' }}>
        ↑ This calculator was generated automatically inside an Unpacked article.
      </p>
    </div>
  )
}


function Slider({ label, value, min, max, step, format, onChange }: { label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-semibold" style={{ color: '#1A1714' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color: '#BA7517' }}>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-[#BA7517]" style={{ cursor: 'pointer' }} />
      <div className="flex justify-between text-[9px]" style={{ color: '#9E948A' }}><span>{format(min)}</span><span>{format(max)}</span></div>
    </div>
  )
}
