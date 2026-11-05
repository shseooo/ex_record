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

export async function ensureFreshToken<T extends GoogleTokenState>(
  token: T,
  {
    now = Date.now(),
    fetchFn = fetch,
    clientId = process.env.AUTH_GOOGLE_ID,
    clientSecret = process.env.AUTH_GOOGLE_SECRET,
  }: Options = {},
): Promise<T> {
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
