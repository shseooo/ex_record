import 'server-only'
import type { GetServerSidePropsContext } from 'next'
import { getToken, type JWT } from 'next-auth/jwt'

/**
 * 요청의 Cookie 헤더에 Set-Cookie 결과를 덮어써, 응답 이후 브라우저가 갖게 될 쿠키를 만든다.
 * 만료된 쿠키(세션 토큰 조각 정리 등)는 뺀다.
 */
export function mergeCookies(cookieHeader: string | null, setCookies: string[], now = Date.now()): string {
  const jar = new Map<string, string>()
  for (const part of (cookieHeader ?? '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) jar.set(part.slice(0, i).trim(), part.slice(i + 1).trim())
  }
  for (const header of setCookies) {
    const [pair, ...attrs] = header.split(';')
    const i = pair.indexOf('=')
    if (i <= 0) continue
    const name = pair.slice(0, i).trim()
    const value = pair.slice(i + 1).trim()
    const expired = attrs.some((a) => {
      const [k, v = ''] = a.split('=').map((x) => x.trim())
      if (/^max-age$/i.test(k)) return Number(v) <= 0
      if (/^expires$/i.test(k)) return Date.parse(v) <= now
      return false
    })
    if (expired || value === '') jar.delete(name)
    else jar.set(name, value)
  }
  return [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
}

/** Auth.js 세션 토큰 쿠키 (https면 __Secure- 접두사, 길면 .0 .1 … 조각으로 나뉜다) */
const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?=/

/**
 * Auth.js 세션을 확인한다. 이 과정에서 jwt 콜백이 만료된 Google 토큰을 갱신하고,
 * 갱신된 세션 쿠키를 setCookies로 돌려준다. 호출한 쪽이 이를 응답에 붙여야 다음 요청이
 * 같은 토큰을 다시 갱신하지 않는다. /api는 proxy를 거치지 않으므로 여기서 해야 한다.
 */
export async function sessionToken(req: Request): Promise<{ token: JWT | null; setCookies: string[] }> {
  // 테스트에서 모듈을 불러올 때 next-auth 설정(@/auth)까지 끌려오지 않도록 지연 import
  const { auth } = await import('@/auth')
  const res = { headers: new Headers() }
  // { req, res } 형태로 부르면 Auth.js가 갱신된 세션 쿠키를 res.headers에 붙인다
  await auth({ req, res } as unknown as GetServerSidePropsContext)
  // 세션 확인 시 csrf/callback-url 쿠키도 붙는데, API 응답으로 내보낼 필요는 없다
  const setCookies = res.headers.getSetCookie().filter((c) => SESSION_COOKIE.test(c))

  // 방금 발급된 쿠키를 읽어야 갱신된 access_token을 쓴다
  const token = await getToken({
    req: { headers: new Headers({ cookie: mergeCookies(req.headers.get('cookie'), setCookies) }) },
    secret: process.env.AUTH_SECRET,
    secureCookie: new URL(req.url).protocol === 'https:',
  })
  return { token, setCookies }
}
