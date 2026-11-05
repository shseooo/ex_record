import { connection } from 'next/server'
import { isMemoryBackend } from '@/lib/server/backend'
import { withCookies } from '@/lib/server/http'
import { sessionToken } from '@/lib/server/session'

export async function GET(req: Request) {
  await connection() // 사용자별 데이터: 항상 요청 시점에 실행
  if (isMemoryBackend) return Response.json({ url: null })
  const { token, setCookies } = await sessionToken(req)
  if (!token?.spreadsheetId) return Response.json({ error: 'unauthorized' }, { status: 401 })
  return withCookies(
    Response.json({ url: `https://docs.google.com/spreadsheets/d/${token.spreadsheetId}/edit` }),
    setCookies,
  )
}
