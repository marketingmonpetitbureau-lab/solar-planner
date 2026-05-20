// Standard peak sun hours by month for southern France (Toulouse area)
const MONTHLY_PEAK_SUN = [2.8, 3.5, 4.7, 5.6, 6.2, 7.1, 7.4, 6.8, 5.4, 3.8, 2.7, 2.4]

export function computeEnergyReport(segments, panelModel) {
  const totalPanels = segments.reduce((s, seg) => s + (seg.panels?.length || 0), 0)
  const kWp = (totalPanels * panelModel.power) / 1000

  const monthlyKWh = MONTHLY_PEAK_SUN.map(sunHours =>
    Math.round(kWp * sunHours * 30 * 0.80) // kWp * peak_hours/day * days * PR
  )
  const annualKWh = monthlyKWh.reduce((s, v) => s + v, 0)
  const co2Avoided = Math.round(annualKWh * 0.5) // 500g CO2/kWh avoided

  return { totalPanels, kWp, monthlyKWh, annualKWh, co2Avoided }
}

export function computeFinancialReport(kWp, annualKWh, params) {
  const { costPerKWp = 1400, electricityPrice = 0.25, performanceRatio = 0.80 } = params
  const totalCost = Math.round(kWp * costPerKWp)
  const annualSavings = Math.round(annualKWh * electricityPrice)
  const paybackYears = totalCost / annualSavings
  const revenue25y = Math.round(annualSavings * 25 - totalCost)
  return { totalCost, annualSavings, paybackYears, revenue25y }
}
