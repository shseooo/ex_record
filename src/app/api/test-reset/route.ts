import { isMemoryBackend } from '@/lib/server/backend'
import { errorResponse, withCookies } from '@/lib/server/http'
import { requireSession, resetMemoryRepo } from '@/lib/server/repo'

/** E2E 전용: 로그인한 사용자 본인의 메모리 저장소 초기화. 메모리 백엔드가 아니면 404. */
export async function POST(req: Request) {
  if (!isMemoryBackend) return new Response(null, { status: 404 })
  try {
    const { userId, setCookies } = await requireSession(req)
    resetMemoryRepo(userId)
    return withCookies(new Response(null, { status: 204 }), setCookies)
  } catch (e) {
    return errorResponse(e)
  }
}
