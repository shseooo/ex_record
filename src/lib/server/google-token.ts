export interface GoogleTokenState {
  access_token: string
  /** epoch seconds */
  expires_at: number
  refresh_token?: string
  error?: 'RefreshTokenError'
}

interface Options {
  now?: number
  fetchFn?: typeof fetch
  clientId?: string
  clientSecret?: string
}

const SKEW_SEC = 60

/** Google 로그인 세션 토큰인지 (개발 로그인 세션에는 Google 토큰이 없다) */
export function hasGoogleToken<T extends Partial<GoogleTokenState>>(token: T): token is T & GoogleTokenState {
  return typeof token.access_token === 'string' && typeof token.expires_at === 'number'
}

export async function ensureFreshToken<T extends GoogleTokenState>(
  token: T,
  {
    now = Date.now(),
    fetchFn = fetch,
    clientId = process.env.AUTH_GOOGLE_ID,
    clientSecret = process.env.AUTH_GOOGLE_SECRET,
  }: Options = {},
): Promise<T> {
  // 이미 갱신에 실패한 세션은 다시 시도하지 않는다 (expires_at이 그대로라 요청마다 Google을 다시 부르게 된다).
  // 사용자는 proxy/API에서 로그인 페이지로 보내진다.
  if (token.error) return token
  if (now / 1000 < token.expires_at - SKEW_SEC) return token
  if (!token.refresh_token) return { ...token, error: 'RefreshTokenError' }

  try {
    const res = await fetchFn('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: clientId ?? '',
        client_secret: clientSecret ?? '',
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token,
      }),
    })
    const json = await res.json()
    if (!res.ok) throw json
    const rest = { ...token }
    delete rest.error
    return {
      ...rest,
      access_token: json.access_token,
      expires_at: Math.floor(now / 1000 + json.expires_in),
      refresh_token: json.refresh_token ?? token.refresh_token,
    }
  } catch (e) {
    console.error('Failed to refresh Google access token', e)
    return { ...token, error: 'RefreshTokenError' }
  }
}
