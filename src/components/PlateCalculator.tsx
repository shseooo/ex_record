'use client'

import { useState } from 'react'
import { calcPlates } from '@/lib/domain/plates'
import { useT } from '@/lib/store/use-app'
import { Field, Sheet, inputClass } from './ui'

export function PlateCalculator({
  open,
  onClose,
  initial,
}: {
  open: boolean
  onClose: () => void
  /** 표시 단위 기준 */
  initial?: number
}) {
  const { t, unit } = useT()
  const [target, setTarget] = useState(initial ? String(initial) : '')
  const [bar, setBar] = useState(unit === 'kg' ? '20' : '45')
  const result = calcPlates(Number(target) || 0, unit, Number(bar) || 0)

  return (
    <Sheet open={open} onClose={onClose} title={t('plates.title')}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`${t('plates.target')} (${unit})`}>
          <input className={inputClass} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
        </Field>
        <Field label={`${t('plates.bar')} (${unit})`}>
          <input className={inputClass} inputMode="decimal" value={bar} onChange={(e) => setBar(e.target.value)} />
        </Field>
      </div>
      <div className="mt-5">
        <p className="mb-2 text-sm text-ink-2">{t('plates.perSide')}</p>
        <div className="flex min-h-24 items-center gap-1 rounded-lg bg-surface-2 p-3">
          <div className="h-3 w-10 rounded-sm bg-ink-3" aria-hidden />
          {result.perSide.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-center rounded-sm bg-accent text-[11px] font-semibold text-accent-ink"
              style={{ width: 22, height: 28 + Math.min(p, 25) * 2.4 }}
              title={`${p}${unit}`}
            >
              <span className="-rotate-90 whitespace-nowrap">{p}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm tabular">
          {result.perSide.length > 0 ? result.perSide.join(' + ') + ` ${unit}` : '-'}
        </p>
        {result.remainder > 0 && (
          <p className="mt-1 text-sm text-danger">{t('plates.remainder', { w: `${result.remainder}${unit}` })}</p>
        )}
      </div>
    </Sheet>
  )
}
