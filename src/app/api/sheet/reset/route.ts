import { resetSpreadsheet } from '@/lib/data/sheets'
import { isMemoryBackend } from '@/lib/server/backend'
import { errorResponse, withCookies } from '@/lib/server/http'
import { requireSession, resetMemoryRepo, UnauthorizedError } from '@/lib/server/repo'

/**
 * 시트 초기화: 본인 시트를 지우고(휴지통에 백업 사본) 기본값으로 새로 만든 뒤,
 * 세션 쿠키의 spreadsheetId를 새 시트로 바꾼다.
 */
export async function POST(req: Request) {
  try {
    const { token, userId, setCookies } = await requireSession(req)
    if (isMemoryBackend) {
      resetMemoryRepo(userId)
      return withCookies(new Response(null, { status: 204 }), setCookies)
    }
    if (!token.access_token) throw new UnauthorizedError()
    await resetSpreadsheet(token.access_token)
    // jwt 콜백(trigger: 'update')이 Drive에서 새 시트를 직접 찾아 쿠키에 넣는다.
    // 갱신된 쿠키는 unstable_update가 직접 붙이므로 위 setCookies는 쓰지 않는다.
    const { unstable_update } = await import('@/auth')
    await unstable_update({})
    return new Response(null, { status: 204 })
  } catch (e) {
    return errorResponse(e)
  }
}
