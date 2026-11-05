import 'server-only'
import { SheetsRepository } from '@/lib/data/sheets'
import { MemoryRepository, type Repository } from '@/lib/data/repository'
import { DEFAULT_EXERCISES } from '@/lib/data/defaults'
import { emptyData } from '@/lib/data/ops'
import { isMemoryBackend } from './backend'
import { sessionToken } from './session'

const globalForRepo = globalThis as unknown as { memoryRepo?: MemoryRepository }

function memoryRepo() {
  globalForRepo.memoryRepo ??= new MemoryRepository({ ...emptyData(), exercises: DEFAULT_EXERCISES })
  return globalForRepo.memoryRepo
}

export function resetMemoryRepo() {
  globalForRepo.memoryRepo = undefined
}

export class UnauthorizedError extends Error {}

export interface RequestRepository {
  repo: Repository
  /** 갱신된 세션 쿠키. 응답에 붙여야 한다 (withRepository가 처리). */
  setCookies: string[]
}

/** 요청의 세션에서 (필요하면 갱신된) Google 토큰을 꺼내 사용자 본인의 시트 저장소를 만든다 */
export async function repositoryFor(req: Request): Promise<RequestRepository> {
  if (isMemoryBackend) return { repo: memoryRepo(), setCookies: [] }

  const { token, setCookies } = await sessionToken(req)
  if (!token?.access_token || !token.spreadsheetId || token.error) throw new UnauthorizedError()
  return { repo: new SheetsRepository(token.access_token, token.spreadsheetId), setCookies }
}
