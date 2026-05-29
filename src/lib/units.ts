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

/**
 * Format a volume value (stored in kg) for display.
 * Converts to the user's unit first, then applies compact notation:
 *   < 1 000        → exact integer   e.g. 850
 *   1 k – 99 999   → 1 decimal, trailing .0 trimmed   e.g. 1.5k, 16.9k, 12k
 *   100 000+       → no decimal   e.g. 145k
 */
export function fmtVolume(kg: number, unit: 'kg' | 'lb'): string {
  const val = unit === 'lb' ? kg * KG_TO_LB : kg
  if (val < 1000) return String(Math.round(val))
  if (val < 100000) {
    const k = (Math.round((val / 1000) * 10) / 10).toString()
    return `${k}k`
  }
  return `${Math.round(val / 1000)}k`
}
