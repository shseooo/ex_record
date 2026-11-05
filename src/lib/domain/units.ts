import type { WeightUnit } from './types'

const LB_PER_KG = 2.2046226218

export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value / LB_PER_KG
}

export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg * LB_PER_KG
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** 표시용 수치 (단위 없이) */
export function displayWeight(kg: number | undefined, unit: WeightUnit): string {
  if (kg === undefined || Number.isNaN(kg)) return ''
  return String(round2(fromKg(kg, unit)))
}

export function formatWeight(kg: number | undefined, unit: WeightUnit): string {
  if (kg === undefined || Number.isNaN(kg)) return '-'
  return `${displayWeight(kg, unit)}${unit}`
}

export function formatVolume(kg: number, unit: WeightUnit): string {
  return `${Math.round(fromKg(kg, unit)).toLocaleString('en-US')}${unit}`
}

export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`
  return `${m}:${ss}`
}

export function parseDuration(input: string): number | undefined {
  const text = input.trim()
  if (!text) return undefined
  if (!/^\d+(:\d{1,2}){0,2}$/.test(text)) return undefined
  return text.split(':').reduce((acc, part) => acc * 60 + Number(part), 0)
}
