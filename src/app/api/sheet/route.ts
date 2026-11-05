import { connection } from 'next/server'
import { isMemoryBackend } from '@/lib/server/backend'
import { errorResponse, withCookies } from '@/lib/server/http'
import { requireSession } from '@/lib/server/repo'

export async function GET(req: Request) {
  await connection() // 사용자별 데이터: 항상 요청 시점에 실행
  try {
    const { token, setCookies } = await requireSession(req)
    const url =
      !isMemoryBackend && token.spreadsheetId
        ? `https://docs.google.com/spreadsheets/d/${token.spreadsheetId}/edit`
        : null
    return withCookies(Response.json({ url }), setCookies)
  } catch (e) {
    return errorResponse(e)
  }
}
