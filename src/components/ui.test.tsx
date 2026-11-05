import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { Activity } from 'react'
import { render, screen } from '@testing-library/react'
import { Sheet } from './ui'

// jsdom에는 모달 dialog API가 없어서 브라우저 동작을 흉내 낸다
const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>
beforeAll(() => {
  proto.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  proto.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})
afterAll(() => {
  delete proto.showModal
  delete proto.close
})

function Harness({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Activity mode={visible ? 'visible' : 'hidden'}>
      <Sheet open onClose={onClose} title="summary">
        body
      </Sheet>
    </Activity>
  )
}

describe('Sheet', () => {
  it('페이지가 숨겨지면(Next가 이전 페이지를 보존할 때) 모달을 닫아 화면을 막지 않는다', () => {
    const onClose = vi.fn()
    const { rerender } = render(<Harness visible onClose={onClose} />)
    const dialog = screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement
    expect(dialog.open).toBe(true)
    rerender(<Harness visible={false} onClose={onClose} />)
    expect(dialog.open).toBe(false)
    // 사용자가 닫은 게 아니므로 onClose(페이지 이동 등)는 부르지 않는다
    expect(onClose).not.toHaveBeenCalled()
  })

  it('사용자가 닫으면 onClose', () => {
    const onClose = vi.fn()
    render(<Harness visible onClose={onClose} />)
    ;(screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement).close()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
