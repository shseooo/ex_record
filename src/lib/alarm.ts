'use client'

/**
 * 휴식 종료 알림.
 * - 진동: Vibration API (Android Chrome 등). iOS Safari는 미지원 → 소리 + 화면 깜빡임으로 대체.
 * - 소리: 브라우저 자동재생 정책 때문에 사용자 동작(세트 완료 탭) 시점에 AudioContext를 깨워 둔다.
 */
let ctx: AudioContext | null = null

export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

export function unlockAudio() {
  if (typeof window === 'undefined') return
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    /* 무시 */
  }
}

function beep(at: number, freq: number) {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = freq
  osc.connect(gain)
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(0.3, at + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.25)
  osc.start(at)
  osc.stop(at + 0.3)
}

export function ring() {
  if (canVibrate()) navigator.vibrate([300, 120, 300, 120, 500])
  if (ctx) {
    const t = ctx.currentTime
    beep(t, 880)
    beep(t + 0.35, 880)
    beep(t + 0.7, 1320)
  }
}
