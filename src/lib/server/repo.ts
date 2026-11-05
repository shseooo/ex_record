import 'server-only'
import type { JWT } from 'next-auth/jwt'
import { SheetsRepository } from '@/lib/data/sheets'
import { MemoryRepository, type Repository } from '@/lib/data/repository'
import { DEFAULT_EXERCISES } from '@/lib/data/defaults'
import { emptyData } from '@/lib/data/ops'
import { isMemoryBackend } from './backend'
import { sessionToken } from './session'

/** 메모리 저장소는 세션 사용자(sub)별로 나눈다. 인증은 메모리 모드에서도 항상 거친다. */
const globalForRepo = globalThis as unknown as { memoryRepos?: Map<string, MemoryRepository> }

function memoryRepos() {
  globalForRepo.memoryRepos ??= new Map()
  return globalForRepo.memoryRepos
}

function memoryRepo(userId: string) {
  const repos = memoryRepos()
  let repo = repos.get(userId)
  if (!repo) {
    repo = new MemoryRepository({ ...emptyData(), exercises: DEFAULT_EXERCISES })
    repos.set(userId, repo)
  }
  return repo
}

export function resetMemoryRepo(userId: string) {
  memoryRepos().delete(userId)
}

export class UnauthorizedError extends Error {}

export interface RequestRepository {
  repo: Repository
  /** 갱신된 세션 쿠키. 응답에 붙여야 한다 (withRepository가 처리). */
  setCookies: string[]
}

export interface AuthorizedSession {
  token: JWT
  /** 세션 사용자 식별자 (메모리 저장소의 키) */
  userId: string
  setCookies: string[]
}

/** 요청의 세션을 확인한다. 로그인하지 않았거나 Google 토큰 갱신에 실패했으면 UnauthorizedError. */
export async function requireSession(req: Request): Promise<AuthorizedSession> {
  const { token, setCookies } = await sessionToken(req)
  if (!token?.sub || token.error) throw new UnauthorizedError()
  // 개발 로그인 세션은 메모리 백엔드에서만 받는다 (jwt 콜백도 지우지만 한 번 더 막는다)
  if (token.dev && !isMemoryBackend) throw new UnauthorizedError()
  return { token, userId: token.sub, setCookies }
}

/** 세션 사용자 본인의 저장소를 만든다: 메모리 백엔드면 사용자별 메모리 저장소, 아니면 본인 Google 시트. */
export async function repositoryFor(req: Request): Promise<RequestRepository> {
  const { token, userId, setCookies } = await requireSession(req)
  if (isMemoryBackend) return { repo: memoryRepo(userId), setCookies }

  if (!token.access_token || !token.spreadsheetId) throw new UnauthorizedError()
  return { repo: new SheetsRepository(token.access_token, token.spreadsheetId), setCookies }
}
