export const KG_TO_LB = 2.20462

/** Step size in kg for the weight steppers */
export function weightStep(unit: 'kg' | 'lb'): number {
  // 0.25 kg  or  0.5 lb (stored as kg)
  return unit === 'lb' ? 0.5 / KG_TO_LB : 0.25
}

/** Display a kg value in the user's preferred unit */
export function fmtWeight(kg: number, unit: 'kg' | 'lb'): string {
  if (unit === 'lb') {
    const lb = kg * KG_TO_LB
    // Round to nearest 0.5 for clean display
    return `${(Math.round(lb * 2) / 2).toFixed(1)}`
  }
  return parseFloat(kg.toFixed(2)).toString()
}

/** Unit label string */
export function unitLabel(unit: 'kg' | 'lb'): string {
  return unit
}
