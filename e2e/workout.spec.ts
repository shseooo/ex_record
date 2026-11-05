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
