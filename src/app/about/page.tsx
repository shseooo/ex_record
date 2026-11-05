import type { Metadata } from 'next'
import Link from 'next/link'

/**
 * 공개 소개 페이지 (Google OAuth 동의 화면의 "애플리케이션 홈페이지").
 * Google 브랜딩 인증 요건: 로그인 없이 열려야 하고(proxy 제외), 리다이렉트하지 않으며,
 * 앱 이름이 동의 화면의 이름("ex-record")과 같고, 기능 설명과 개인정보처리방침 링크가 있어야 한다.
 */
export const metadata: Metadata = {
  title: 'ex-record · Workout log in your own Google Sheet',
  description:
    'ex-record is a workout log web app that saves your routines and sets to a spreadsheet in your own Google Drive.',
}

const APP_NAME = 'ex-record'

const content = {
  ko: {
    tagline: '내 Google 시트에 저장되는 운동 기록 앱',
    intro:
      'ex-record는 요일별 루틴을 짜고, 운동하면서 세트를 기록하고, 기록과 성장을 확인하는 웹앱입니다. 별도의 서버 데이터베이스 없이 모든 기록을 사용자 본인의 Google Drive 스프레드시트에 저장합니다.',
    featuresTitle: '주요 기능',
    features: [
      '요일별 루틴: 운동, 목표 세트·횟수·무게, 휴식 시간, 슈퍼세트 설정',
      '운동 기록: 세트 체크, 자동 휴식 타이머, 지난 기록 참고, 원판 계산기',
      '달력과 기록: 날짜별 운동 내역, 운동별 무게·볼륨·예상 1RM 추이 차트, 개인 기록(PR)',
      '오프라인 기록: 연결이 끊겨도 기록하고, 다시 연결되면 시트에 동기화',
      '한국어·English·日本語, kg·lb 단위, 모바일 홈 화면에 설치(PWA)',
    ],
    dataTitle: 'Google 데이터 사용',
    data: [
      'Google 계정으로 로그인하면 내 Google Drive에 "Workout Log (ex-record)" 스프레드시트를 만들고, 운동 기록을 그 시트에 저장합니다.',
      'Google Drive의 drive.file 권한만 요청합니다. ex-record가 직접 만든 파일에만 접근하며, 다른 Drive 파일은 볼 수 없습니다.',
      '시트는 사용자 소유이므로 언제든 Google Drive에서 열람·다운로드·삭제할 수 있고, Google 계정 설정에서 앱 권한을 철회할 수 있습니다.',
    ],
    start: 'Google 계정으로 시작하기',
    privacy: '개인정보처리방침',
  },
  en: {
    tagline: 'A workout log that lives in your own Google Sheet',
    intro:
      'ex-record is a web app for planning weekly routines, logging sets while you train, and tracking your progress. There is no server database: all of your records are saved to a spreadsheet in your own Google Drive.',
    featuresTitle: 'Features',
    features: [
      'Weekly routines: exercises, target sets/reps/weight, rest time, and supersets for each weekday',
      'Workout logging: check off sets, automatic rest timer, last-time reference, plate calculator',
      'Calendar and progress: workouts by date, weight/volume/estimated 1RM charts per exercise, personal records',
      'Offline logging: keep logging without a connection and sync to your sheet when you are back online',
      'Korean, English, and Japanese; kg or lb; installable on your phone home screen (PWA)',
    ],
    dataTitle: 'How ex-record uses Google data',
    data: [
      'When you sign in with Google, ex-record creates a "Workout Log (ex-record)" spreadsheet in your Google Drive and saves your workouts to it.',
      'It requests only the Google Drive drive.file scope, so it can access only the files it created and cannot see your other Drive files.',
      'The spreadsheet belongs to you: you can view, download, or delete it in Google Drive at any time, and revoke the app’s access in your Google Account settings.',
    ],
    start: 'Get started with Google',
    privacy: 'Privacy Policy',
  },
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" width={40} height={40} className="size-10" />
        <p className="text-2xl font-bold">{APP_NAME}</p>
      </header>
      <nav className="mt-3 flex gap-3 text-sm text-ink-2">
        <a href="#ko" className="underline">
          한국어
        </a>
        <a href="#en" className="underline">
          English
        </a>
      </nav>

      {(['ko', 'en'] as const).map((lang) => {
        const c = content[lang]
        return (
          <article
            key={lang}
            id={lang}
            lang={lang}
            className="mt-10 border-t border-line pt-8 first-of-type:border-t-0"
          >
            <h1 className="text-2xl leading-snug font-bold">
              {APP_NAME}: {c.tagline}
            </h1>
            <p className="mt-3 leading-relaxed text-ink-2">{c.intro}</p>

            <section className="mt-6">
              <h2 className="font-semibold">{c.featuresTitle}</h2>
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-ink-2">
                {c.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </section>

            <section className="mt-6">
              <h2 className="font-semibold">{c.dataTitle}</h2>
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-ink-2">
                {c.data.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </section>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="flex h-11 items-center justify-center rounded-lg bg-accent px-5 font-medium text-accent-ink"
              >
                {c.start}
              </Link>
              <Link href="/privacy" className="text-sm underline">
                {c.privacy}
              </Link>
            </div>
          </article>
        )
      })}
    </main>
  )
}
