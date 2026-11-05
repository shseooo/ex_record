export interface RestTimer {
  /** epoch ms */
  endAt: number
  totalSec: number
}

export function createTimer(sec: number, now = Date.now()): RestTimer {
  return { endAt: now + sec * 1000, totalSec: sec }
}

export function extendTimer(t: RestTimer, sec: number): RestTimer {
  return { endAt: t.endAt + sec * 1000, totalSec: Math.max(0, t.totalSec + sec) }
}

/** 종료 시각 기준으로 계산하므로 탭이 백그라운드에 있어도 정확하다 */
export function remainingSec(endAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((endAt - now) / 1000))
}
