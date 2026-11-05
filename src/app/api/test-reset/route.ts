import { resetMemoryRepo } from '@/lib/server/repo'
import { isMemoryBackend } from '@/lib/server/backend'

/** E2E 전용: 메모리 저장소 초기화. 메모리 백엔드가 아니면 404. */
export async function POST() {
  if (!isMemoryBackend) return new Response(null, { status: 404 })
  resetMemoryRepo()
  return new Response(null, { status: 204 })
}
