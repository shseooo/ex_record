import type { UserData } from '@/lib/domain/types'
import { applyOps, type Op } from './ops'

export interface Repository {
  load(): Promise<UserData>
  /**
   * ops를 반영하고 반영 후의 전체 데이터를 돌려준다.
   * 전체를 다시 읽지 않고 반영했으면 null (클라이언트는 낙관적으로 반영해 둔 로컬 데이터를 쓴다).
   */
  apply(ops: Op[]): Promise<UserData | null>
}

/** 테스트/로컬 개발용 */
export class MemoryRepository implements Repository {
  constructor(private data: UserData) {}

  async load() {
    return structuredClone(this.data)
  }

  async apply(ops: Op[]) {
    this.data = applyOps(this.data, ops)
    return this.load()
  }
}
