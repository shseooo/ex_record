import { test, expect, type Page } from '@playwright/test'

// 로그인한 사용자 본인의 메모리 저장소를 초기화한다 (page.request는 브라우저 쿠키를 공유한다)
test.beforeEach(async ({ page }) => {
  expect((await page.request.post('/api/test-reset')).status()).toBe(204)
})

const nav = (page: Page, name: string) =>
  page.getByRole('navigation').filter({ visible: true }).getByRole('link', { name }).click()

test('루틴 설정 → 오늘 운동 → 세트 체크 시 휴식 타이머 → 완료 → 달력/기록 반영', async ({ page }) => {
  await page.goto('/routine')

  // 오늘 요일에 벤치프레스 추가 후 저장
  await page.getByRole('button', { name: '운동 추가' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /벤치프레스/ }).click()
  await expect(page.getByText('벤치프레스').filter({ visible: true })).toHaveCount(1)
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('button', { name: '저장' })).toBeDisabled()

  // 홈에서 오늘 운동 시작
  await nav(page, '홈')
  await page.getByRole('button', { name: '오늘 운동 시작' }).click()
  await expect(page).toHaveURL(/\/workout/)
  await expect(page.getByRole('heading', { name: '벤치프레스' })).toBeVisible()

  const weights = page.getByLabel('kg', { exact: true }).filter({ visible: true })
  await expect(weights).toHaveCount(3)
  await weights.first().fill('60')

  // 세트 완료 → 휴식 타이머
  await page.getByRole('button', { name: '세트 ✓' }).filter({ visible: true }).first().click()
  const timer = page.getByRole('timer')
  await expect(timer).toBeVisible()
  await expect(timer).toContainText('휴식')
  await timer.getByRole('button', { name: '+15s' }).click()
  await timer.getByRole('button', { name: '건너뛰기' }).click()
  await expect(timer).toBeHidden()

  await page.getByRole('button', { name: /운동 완료/ }).click()
  await expect(page.getByRole('dialog')).toContainText('저장했습니다')
  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).last().click()

  // 달력: 오늘 표시
  await nav(page, '달력')
  const d = new Date()
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  await expect(page.getByRole('button', { name: key })).toHaveAttribute('data-marked', 'true')
  await expect(page.getByText('60kg×10', { exact: true }).filter({ visible: true })).toBeVisible()

  // 기록: 운동 선택 + 차트
  await nav(page, '기록')
  await expect(page.getByLabel('운동')).toHaveValue('bench_press')
  await expect(page.locator('.recharts-surface').first()).toBeVisible()
})

test('설정에서 언어와 단위 변경', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('radio', { name: 'English' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await page.getByRole('radio', { name: 'lb' }).click()
  await page.getByRole('radio', { name: '日本語' }).click()
  await expect(page.getByRole('heading', { name: '設定' })).toBeVisible()
  // 원복
  await page.getByRole('radio', { name: 'kg' }).click()
  await page.getByRole('radio', { name: '한국어' }).click()
  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible()
})

test('운동 시작 없이 바로 기록: 날짜 선택, 휴식 타이머 없음', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '기록만 하기' }).click()
  await expect(page).toHaveURL(/\/workout/)
  await expect(page.getByRole('heading', { name: '운동 기록' })).toBeVisible()

  const y = new Date(Date.now() - 86400000)
  const key = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
  await page.getByLabel('날짜').fill(key)

  await page.getByRole('button', { name: '운동 추가' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /벤치프레스/ }).click()
  await page.getByLabel('kg', { exact: true }).filter({ visible: true }).first().fill('50')
  await page.getByLabel('횟수', { exact: true }).filter({ visible: true }).first().fill('8')
  await page.getByRole('button', { name: '세트 ✓' }).filter({ visible: true }).first().click()
  await expect(page.getByRole('timer')).toBeHidden()

  await page.getByRole('button', { name: /^저장/ }).click()
  await expect(page.getByRole('dialog')).toContainText('저장했습니다')

  // 요약을 닫고 홈으로 돌아온 뒤에도 메뉴를 누를 수 있어야 한다 (모달이 화면을 막으면 안 됨)
  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).last().click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  await nav(page, '달력')
  await expect(page.getByRole('heading', { name: '달력' })).toBeVisible({ timeout: 3000 })
})

test('개인정보처리방침 페이지는 공개', async ({ page }) => {
  await page.goto('/privacy')
  await expect(page.getByRole('heading', { name: '개인정보처리방침' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible()
})

test('설정에서 시트 초기화: 기록이 모두 지워진다', async ({ page }) => {
  page.on('dialog', (d) => void d.accept())
  // 기록 하나 남기기
  await page.goto('/')
  await page.getByRole('button', { name: '기록만 하기' }).click()
  await page.getByRole('button', { name: '운동 추가' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /벤치프레스/ }).click()
  await page.getByRole('button', { name: '세트 ✓' }).filter({ visible: true }).first().click()
  await page.getByRole('button', { name: /^저장/ }).click()
  await expect(page.getByRole('dialog')).toContainText('저장했습니다')
  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).last().click()

  await nav(page, '설정')
  const reset = page.waitForResponse((r) => r.url().endsWith('/api/sheet/reset'))
  await page.getByRole('button', { name: '시트 초기화' }).click()
  expect((await reset).status()).toBe(204)

  await nav(page, '기록')
  await expect(page.getByText('기록이 없습니다').filter({ visible: true }).first()).toBeVisible()
})
