import type { RoutineItem, Weekday } from './types'
import { newId } from './id'

export function itemsForDay(routine: RoutineItem[], day: Weekday): RoutineItem[] {
  return routine.filter((i) => i.day === day).sort((a, b) => a.order - b.order)
}

/** from 요일의 루틴으로 to 요일을 덮어쓴다 */
export function copyDay(
  routine: RoutineItem[],
  from: Weekday,
  to: Weekday,
  genId: () => string = newId,
): RoutineItem[] {
  if (from === to) return routine
  const groupMap = new Map<string, string>()
  const groupOf = (g: string) => {
    if (!groupMap.has(g)) groupMap.set(g, genId())
    return groupMap.get(g)!
  }
  const copied = itemsForDay(routine, from)
    .map((item) => ({ ...item, id: genId(), day: to }))
    .map((item) => ({
      ...item,
      supersetGroup: item.supersetGroup ? groupOf(item.supersetGroup) : undefined,
    }))
  return [...routine.filter((i) => i.day !== to), ...copied]
}

export function reorder(
  routine: RoutineItem[],
  day: Weekday,
  id: string,
  delta: -1 | 1,
): RoutineItem[] {
  const list = itemsForDay(routine, day)
  const idx = list.findIndex((i) => i.id === id)
  const target = idx + delta
  if (idx < 0 || target < 0 || target >= list.length) return routine
  ;[list[idx], list[target]] = [list[target], list[idx]]
  const orderOf = new Map(list.map((item, i) => [item.id, i]))
  return routine.map((i) => (orderOf.has(i.id) ? { ...i, order: orderOf.get(i.id)! } : i))
}
