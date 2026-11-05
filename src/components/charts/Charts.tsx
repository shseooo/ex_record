'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface SeriesDef {
  key: string
  label: string
  color: string
}

const axisTick = { fill: 'var(--text-3)', fontSize: 11 }

function ChartTooltip({
  active,
  payload,
  label,
  format,
  labelFormat,
}: {
  active?: boolean
  payload?: readonly { dataKey?: unknown; color?: string; name?: unknown; value?: unknown }[]
  label?: unknown
  format: (v: number) => string
  labelFormat: (l: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs">
      <p className="mb-1 font-semibold text-ink">{labelFormat(String(label))}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2 text-ink-2">
          <span className="inline-block h-0.5 w-3" style={{ background: p.color }} aria-hidden />
          {String(p.name)}: <span className="font-semibold text-ink tabular">{format(Number(p.value))}</span>
        </p>
      ))}
    </div>
  )
}

export function Legend({ series }: { series: SeriesDef[] }) {
  if (series.length < 2) return null
  return (
    <div className="mb-2 flex flex-wrap gap-4 text-xs text-ink-2">
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded" style={{ background: s.color }} aria-hidden />
          {s.label}
        </span>
      ))}
    </div>
  )
}

export function TrendLineChart({
  data,
  series,
  format,
  labelFormat,
  height = 240,
}: {
  data: Record<string, number | string>[]
  series: SeriesDef[]
  format: (v: number) => string
  labelFormat: (l: string) => string
  height?: number
}) {
  return (
    <div>
      <Legend series={series} />
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="key" tickFormatter={labelFormat} tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={24} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={48} tickFormatter={(v) => String(Math.round(v * 10) / 10)} />
          <Tooltip
            cursor={{ stroke: 'var(--text-3)', strokeDasharray: '3 3' }}
            content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} format={format} labelFormat={labelFormat} />}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={data.length > 20 ? false : { r: 4, fill: s.color, stroke: 'var(--surface)', strokeWidth: 2 }}
              activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SimpleBarChart({
  data,
  label,
  format,
  labelFormat,
  height = 200,
}: {
  data: { key: string; value: number }[]
  label: string
  format: (v: number) => string
  labelFormat: (l: string) => string
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="key" tickFormatter={labelFormat} tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={24} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))} />
        <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} format={format} labelFormat={labelFormat} />} />
        <Bar dataKey="value" name={label} fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** 부위별 분포: 가로 막대 (HTML) */
export function HBarList({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="flex flex-col gap-2">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-2 text-sm" title={`${i.label}: ${i.value}`}>
          <span className="truncate text-ink-2">{i.label}</span>
          <span className="h-2.5 rounded-r bg-surface-2">
            <span className="block h-full rounded-r bg-[var(--series-1)]" style={{ width: `${(i.value / max) * 100}%` }} />
          </span>
          <span className="text-right tabular">{i.value}</span>
        </li>
      ))}
    </ul>
  )
}
