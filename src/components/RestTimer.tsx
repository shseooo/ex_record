'use client'

import { useEffect, useRef, useState } from 'react'
import { extendTimer, remainingSec, type RestTimer } from '@/lib/domain/timer'
import { formatDuration } from '@/lib/domain/units'
import { ring } from '@/lib/alarm'
import { useApp, useT } from '@/lib/store/use-app'
import { cx } from './ui'

interface Props {
  timer: RestTimer
  onChange: (t: RestTimer | null) => void
  onFinish: () => void
  labels: { rest: string; skip: string; done: string }
}

export function RestTimerView({ timer, onChange, onFinish, labels }: Props) {
  const [now, setNow] = useState(() => Date.now())
  // 마운트 시점에 이미 끝난 타이머면 알림을 다시 울리지 않는다
  const firedFor = useRef<number | null>(remainingSec(timer.endAt) === 0 ? timer.endAt : null)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  const left = remainingSec(timer.endAt, now)
  const finished = left === 0

  useEffect(() => {
    if (finished && firedFor.current !== timer.endAt) {
      firedFor.current = timer.endAt
      onFinish()
    }
  }, [finished, timer.endAt, onFinish])

  const progress = timer.totalSec > 0 ? 1 - left / timer.totalSec : 1

  return (
    <div
      role="timer"
      aria-live="polite"
      className={cx(
        'relative overflow-hidden rounded-xl text-accent-ink',
        finished ? 'timer-flash bg-good' : 'bg-accent',
      )}
    >
      <div
        className="absolute inset-y-0 left-0 bg-black/15"
        style={{ width: `${Math.min(100, progress * 100)}%` }}
        aria-hidden
      />
      <div className="relative flex items-center gap-2 px-3 py-2">
        <span className="text-sm opacity-90">{finished ? labels.done : labels.rest}</span>
        <span className="tabular text-2xl font-bold">{formatDuration(left)}</span>
        <div className="ml-auto flex gap-1">
          {!finished && (
            <>
              <TimerBtn onClick={() => onChange(extendTimer(timer, -15))}>-15s</TimerBtn>
              <TimerBtn onClick={() => onChange(extendTimer(timer, 15))}>+15s</TimerBtn>
            </>
          )}
          <TimerBtn onClick={() => onChange(null)}>{finished ? '✕' : labels.skip}</TimerBtn>
        </div>
      </div>
    </div>
  )
}

function TimerBtn({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={children === '✕' ? 'close' : children}
      className="h-9 min-w-11 rounded-lg bg-white/20 px-2 text-sm font-medium"
    >
      {children}
    </button>
  )
}

/** 스토어에 연결된 휴식 타이머 (앱 어디서든 하단에 고정 표시) */
export function RestTimerDock() {
  const timer = useApp((s) => s.timer)
  const setTimer = useApp((s) => s.setTimer)
  const { t } = useT()

  useEffect(() => {
    if (!timer) return
    // 끝난 뒤 8초 지나면 자동으로 닫기
    const ms = timer.endAt - Date.now() + 8000
    const id = setTimeout(() => setTimer(null), Math.max(0, ms))
    return () => clearTimeout(id)
  }, [timer, setTimer])

  if (!timer) return null
  return (
    <RestTimerView
      key={timer.endAt - timer.totalSec * 1000}
      timer={timer}
      onChange={setTimer}
      onFinish={ring}
      labels={{ rest: t('timer.rest'), skip: t('timer.skip'), done: t('timer.done') }}
    />
  )
}
