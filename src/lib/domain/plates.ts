import type { WeightUnit } from './types'

const PLATES: Record<WeightUnit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
}
const BAR: Record<WeightUnit, number> = { kg: 20, lb: 45 }

export interface PlateResult {
  perSide: number[]
  /** 맞추지 못한 무게 (양쪽 합계 기준) */
  remainder: number
  bar: number
}

/** total, bar는 표시 단위 기준 */
export function calcPlates(total: number, unit: WeightUnit, bar = BAR[unit]): PlateResult {
  if (total <= bar) return { perSide: [], remainder: 0, bar }
  // 부동소수 오차 방지: 0.01 단위 정수 연산
  let side = Math.round(((total - bar) / 2) * 100)
  const perSide: number[] = []
  for (const plate of PLATES[unit]) {
    const p = Math.round(plate * 100)
    while (side >= p) {
      perSide.push(plate)
      side -= p
    }
  }
  return { perSide, remainder: (side * 2) / 100, bar }
}
