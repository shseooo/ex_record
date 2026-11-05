import { describe, it, expect } from 'vitest'
import { translate, exerciseName, detectLocale, dictionaries } from './index'
import { ko } from './ko'

describe('i18n', () => {
  it('모든 언어 사전이 같은 키를 가진다', () => {
    const keys = Object.keys(ko).sort()
    expect(Object.keys(dictionaries.en).sort()).toEqual(keys)
    expect(Object.keys(dictionaries.ja).sort()).toEqual(keys)
  })

  it('변수 치환', () => {
    expect(translate('en', 'home.weekGoal', { done: 2, goal: 3 })).toBe('This week 2/3')
    expect(translate('ko', 'sync.offline', { n: 4 })).toBe('오프라인 · 4건 대기')
  })

  it('@로 시작하는 운동 이름은 번역, 아니면 그대로', () => {
    expect(exerciseName({ name: '@squat' }, 'ja')).toBe('スクワット')
    expect(exerciseName({ name: '@unknown_key' }, 'en')).toBe('unknown_key')
    expect(exerciseName({ name: '내 운동' }, 'en')).toBe('내 운동')
  })

  it('브라우저 언어 감지', () => {
    expect(detectLocale(['ja-JP', 'en'])).toBe('ja')
    expect(detectLocale(['fr-FR', 'en-US'])).toBe('en')
    expect(detectLocale(['fr'])).toBe('ko')
  })
})
