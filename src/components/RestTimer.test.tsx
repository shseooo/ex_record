import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { RestTimerView } from './RestTimer'
import { createTimer } from '@/lib/domain/timer'

const labels = { rest: '휴식', skip: '건너뛰기', done: '휴식 끝!' }

describe('RestTimerView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })
  afterEach(() => vi.useRealTimers())

  it('남은 시간을 m:ss로 보여주고 0이 되면 onFinish를 한 번만 호출', () => {
    const onFinish = vi.fn()
    render(
      <RestTimerView timer={createTimer(3, 0)} onChange={() => {}} onFinish={onFinish} labels={labels} />,
    )
    expect(screen.getByText('0:03')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText('0:02')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(3000))
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(screen.getByText('휴식 끝!')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1000))
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('+15초 / -15초 / 건너뛰기', () => {
    const onChange = vi.fn()
    const timer = createTimer(60, 0)
    render(<RestTimerView timer={timer} onChange={onChange} onFinish={() => {}} labels={labels} />)

    fireEvent.click(screen.getByRole('button', { name: '+15s' }))
    expect(onChange).toHaveBeenLastCalledWith({ endAt: 75_000, totalSec: 75 })

    fireEvent.click(screen.getByRole('button', { name: '-15s' }))
    expect(onChange).toHaveBeenLastCalledWith({ endAt: 45_000, totalSec: 45 })

    fireEvent.click(screen.getByRole('button', { name: '건너뛰기' }))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('이미 지난 타이머(새로고침 후 등)는 알림 없이 끝 상태', () => {
    vi.setSystemTime(100_000)
    const onFinish = vi.fn()
    render(<RestTimerView timer={createTimer(10, 0)} onChange={() => {}} onFinish={onFinish} labels={labels} />)
    act(() => vi.advanceTimersByTime(500))
    expect(onFinish).not.toHaveBeenCalled()
  })
})
