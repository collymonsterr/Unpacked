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

  const totalRentAtBE = rent * 12 * (breakEvenYears || 30)
  const totalBuyingAtBE = monthlyBuying * 12 * (breakEvenYears || 30) + depositAmount

  return (
    <div>
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid #E8E3DC' }}>
        <p className="text-[10px] font-semibold uppercase tracking-wide mb-3" style={{ color: '#94918D' }}>Also in this article:</p>
        <h4 className="text-base font-bold mb-4" style={{ color: '#1A1714' }}>Should I Rent or Buy?</h4>
        <div className="space-y-4">
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
        <div className="mt-5 pt-4 text-center" style={{ borderTop: '1px solid #E8E3DC' }}>
          <p className="text-2xl font-extrabold" style={{ color: '#BA7517', fontFamily: 'var(--font-sora)' }}>
            {breakEvenYears > 0 ? `You break even in ${breakEvenYears} years` : 'Renting is cheaper over 30 years'}
          </p>
          <div className="flex justify-center gap-6 mt-2 text-xs" style={{ color: '#94918D' }}>
            <span>Total rent: £{Math.round(totalRentAtBE).toLocaleString()}</span>
            <span>Total buying: £{Math.round(totalBuyingAtBE).toLocaleString()}</span>
          </div>
        </div>
        <p className="text-[10px] text-center mt-3" style={{ color: '#94918D' }}>↑ This calculator was generated automatically inside an Unpacked article.</p>
      </div>
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
      <div className="flex justify-between text-[9px]" style={{ color: '#94918D' }}><span>{format(min)}</span><span>{format(max)}</span></div>
    </div>
  )
}
