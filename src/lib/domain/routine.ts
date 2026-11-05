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

/**
 * 요일 안에서 슈퍼세트 그룹을 "연속된 같은 그룹 id 묶음" 기준으로 정리한다.
 * - 혼자 남은 항목은 그룹 해제
 * - 같은 id가 떨어진 두 묶음으로 나뉘었으면 뒤 묶음에 새 id
 */
export function normalizeSupersets(
  routine: RoutineItem[],
  day: Weekday,
  genId: () => string = newId,
): RoutineItem[] {
  const list = itemsForDay(routine, day)
  const next = new Map<string, string | undefined>()
  const seen = new Set<string>()
  let i = 0
  while (i < list.length) {
    const g = list[i].supersetGroup
    let j = i + 1
    while (g && j < list.length && list[j].supersetGroup === g) j++
    if (g) {
      const id = j - i < 2 ? undefined : seen.has(g) ? genId() : g
      seen.add(g)
      for (let k = i; k < j; k++) next.set(list[k].id, id)
    }
    i = j
  }
  return routine.map((r) =>
    next.has(r.id) && next.get(r.id) !== r.supersetGroup ? { ...r, supersetGroup: next.get(r.id) } : r,
  )
}

/** 항목을 바로 앞 항목과 슈퍼세트로 묶거나, 이미 묶여 있으면 그 지점에서 끊는다 */
export function toggleSupersetWithPrev(
  routine: RoutineItem[],
  day: Weekday,
  id: string,
  genId: () => string = newId,
): RoutineItem[] {
  const list = itemsForDay(routine, day)
  const idx = list.findIndex((i) => i.id === id)
  if (idx <= 0) return routine
  const cur = list[idx]
  const prev = list[idx - 1]
  // cur부터 이어지는 같은 그룹 묶음(뒤쪽 꼬리)
  const tail = new Set<string>()
  if (cur.supersetGroup) {
    for (let k = idx; k < list.length && list[k].supersetGroup === cur.supersetGroup; k++) tail.add(list[k].id)
  } else {
    tail.add(cur.id)
  }
  const linked = !!cur.supersetGroup && cur.supersetGroup === prev.supersetGroup
  const group = linked ? genId() : (prev.supersetGroup ?? genId())
  const changed = routine.map((r) =>
    tail.has(r.id) || (!linked && r.id === prev.id) ? { ...r, supersetGroup: group } : r,
  )
  return normalizeSupersets(changed, day, genId)
}
