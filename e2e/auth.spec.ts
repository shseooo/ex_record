import { test, expect } from '@playwright/test'

// 이 파일은 로그인하지 않은 상태에서 시작한다
test.use({ storageState: { cookies: [], origins: [] } })

test('로그인하지 않으면 메모리 백엔드에서도 페이지는 /login으로, API는 401', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)

  expect((await page.request.get('/api/data')).status()).toBe(401)
  expect((await page.request.post('/api/ops', { data: { ops: [] } })).status()).toBe(400)
  expect((await page.request.get('/api/sheet')).status()).toBe(401)
  expect((await page.request.post('/api/test-reset')).status()).toBe(401)
})

test('개발용 로그인 → 앱 사용 → 로그아웃하면 /login', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /개발용 로그인|Dev sign-in|開発用ログイン/ }).click()
  await expect(page).not.toHaveURL(/\/login/)
  expect((await page.request.get('/api/data')).status()).toBe(200)

  await page.goto('/settings')
  await page.getByRole('button', { name: /로그아웃|Sign out|ログアウト/ }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect((await page.request.get('/api/data')).status()).toBe(401)
})

test('소개 페이지는 로그인 없이 열리고 앱 이름과 개인정보처리방침 링크가 있다 (Google OAuth 홈페이지)', async ({ page }) => {
  const res = await page.goto('/about')
  expect(res?.status()).toBe(200)
  await expect(page).toHaveURL(/\/about$/)
  await expect(page.getByRole('heading', { level: 1 }).first()).toContainText('ex-record')
  await page.getByRole('link', { name: '개인정보처리방침' }).click()
  await expect(page).toHaveURL(/\/privacy$/)
})

