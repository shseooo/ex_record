import 'server-only'
import { SheetsAuthError } from '@/lib/data/sheets'
import type { Repository } from '@/lib/data/repository'
import { repositoryFor, UnauthorizedError } from './repo'

export function withCookies(res: Response, setCookies: string[]): Response {
  for (const c of setCookies) res.headers.append('set-cookie', c)
  return res
}

/** 저장소를 만들어 fn을 실행하고, 갱신된 세션 쿠키를 응답에 붙인다 */
export async function withRepository(
  req: Request,
  fn: (repo: Repository) => Promise<Response>,
): Promise<Response> {
  try {
    const { repo, setCookies } = await repositoryFor(req)
    return withCookies(await fn(repo), setCookies)
  } catch (e) {
    return errorResponse(e)
  }
}

export function errorResponse(e: unknown): Response {
  if (e instanceof UnauthorizedError || e instanceof SheetsAuthError) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  console.error(e)
  return Response.json({ error: 'upstream' }, { status: 502 })
}
