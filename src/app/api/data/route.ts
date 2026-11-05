import { connection } from 'next/server'
import { withRepository } from '@/lib/server/http'

export async function GET(req: Request) {
  await connection() // 사용자별 데이터: 항상 요청 시점에 실행
  return withRepository(req, async (repo) =>
    Response.json(await repo.load(), { headers: { 'cache-control': 'no-store' } }),
  )
}
