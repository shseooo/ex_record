import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy · ex-record" };

/** TODO: 배포 전에 실제 연락처로 바꾸세요 (Google OAuth 동의 화면의 지원 이메일과 같게) */
const CONTACT_EMAIL = "34seod@gmail.com";
const EFFECTIVE = "2026-11-05";

const content = {
  ko: {
    title: "개인정보처리방침",
    effective: `시행일: ${EFFECTIVE}`,
    sections: [
      {
        h: "1. 개요",
        p: [
          'ex-record(이하 "서비스")는 운동 기록 웹앱입니다. 서비스는 자체 데이터베이스를 운영하지 않으며, 사용자의 운동 기록은 사용자 본인의 Google Drive에 있는 스프레드시트에 저장됩니다.',
        ],
      },
      {
        h: "2. 수집하는 정보",
        p: [
          "Google 계정 기본 정보: 이메일 주소, 이름, 프로필 사진. Google 로그인 시 전달되며 로그인 상태 유지에만 사용합니다.",
          "운동 기록: 운동 종류, 세트·횟수·무게·시간·거리, 루틴, 체중, 메모, 앱 설정. 사용자의 Google Drive 스프레드시트에 저장됩니다.",
          "서비스는 위치, 연락처, 광고 식별자 등 그 밖의 정보를 수집하지 않습니다.",
        ],
      },
      {
        h: "3. Google 사용자 데이터의 접근과 사용",
        p: [
          '서비스는 Google Drive의 drive.file 권한만 요청합니다. 이 권한으로는 서비스가 직접 만든 파일("Workout Log (ex-record)" 스프레드시트)에만 접근할 수 있으며, 사용자의 다른 Drive 파일은 볼 수 없습니다.',
          "이 권한은 운동 기록 스프레드시트를 만들고, 읽고, 수정하는 데에만 사용합니다.",
          "ex-record가 Google API로부터 받은 정보의 사용 및 다른 앱으로의 전송은 제한적 사용(Limited Use) 요구사항을 포함한 Google API 서비스 사용자 데이터 정책을 준수합니다.",
        ],
      },
      {
        h: "4. 저장 위치와 보관",
        p: [
          "운동 기록: 사용자의 Google Drive. 서비스 서버에는 저장하지 않습니다.",
          "로그인 정보: Google 접근 토큰과 계정 기본 정보는 암호화된 쿠키에 담겨 사용자 브라우저에 보관되며, 서버 데이터베이스에 저장하지 않습니다.",
          "브라우저 저장소: 오프라인 기록과 빠른 화면 표시를 위해 운동 기록 사본과 전송 대기 중인 변경사항을 브라우저 localStorage에 보관합니다. 로그아웃하면 삭제됩니다.",
          "서비스는 Vercel에서 호스팅되며, 요청 처리 과정에서 호스팅 업체의 표준 접속 로그가 남을 수 있습니다.",
        ],
      },
      {
        h: "5. 제3자 제공",
        p: [
          "서비스는 사용자 정보를 판매하거나 제3자에게 제공하지 않습니다. 광고, 분석 도구, 추적 쿠키를 사용하지 않습니다.",
          "데이터는 서비스 기능을 위해 Google(인증 및 Sheets/Drive API)과 Vercel(호스팅)을 거쳐 처리됩니다.",
        ],
      },
      {
        h: "6. 사용자의 권리와 삭제",
        p: [
          "스프레드시트는 사용자 소유이므로 언제든 Google Drive에서 열람, 다운로드, 삭제할 수 있습니다.",
          "서비스의 접근 권한은 Google 계정 설정(myaccount.google.com/permissions)에서 언제든 철회할 수 있습니다.",
          "로그아웃하면 브라우저에 보관된 사본과 로그인 쿠키가 삭제됩니다.",
        ],
      },
      {
        h: "7. 변경",
        p: ["이 방침이 바뀌면 이 페이지에 게시하고 시행일을 갱신합니다."],
      },
      {
        h: "8. 문의",
        p: [`개인정보 관련 문의: ${CONTACT_EMAIL}`],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    effective: `Effective date: ${EFFECTIVE}`,
    sections: [
      {
        h: "1. Overview",
        p: [
          'ex-record (the "Service") is a workout logging web app. The Service does not operate its own database; your workout data is stored in a spreadsheet in your own Google Drive.',
        ],
      },
      {
        h: "2. Information we collect",
        p: [
          "Basic Google account information: email address, name and profile picture, provided by Google Sign-In and used only to keep you signed in.",
          "Workout data: exercises, sets, reps, weight, duration, distance, routines, body weight, notes and app settings, stored in your Google Drive spreadsheet.",
          "We do not collect location, contacts, advertising identifiers or any other information.",
        ],
      },
      {
        h: "3. Access to and use of Google user data",
        p: [
          'The Service requests only the Google Drive drive.file scope. This scope grants access solely to files the Service creates (the "Workout Log (ex-record)" spreadsheet); the Service cannot see any other files in your Drive.',
          "This access is used only to create, read and update your workout log spreadsheet.",
          "ex-record's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.",
        ],
      },
      {
        h: "4. Storage and retention",
        p: [
          "Workout data: in your Google Drive. It is not stored on our servers.",
          "Sign-in data: the Google access token and basic account information are kept in an encrypted cookie in your browser and are not stored in any server database.",
          "Browser storage: a copy of your workout data and pending changes are kept in localStorage for offline use and fast loading. They are removed when you sign out.",
          "The Service is hosted on Vercel, which may keep standard access logs while processing requests.",
        ],
      },
      {
        h: "5. Sharing",
        p: [
          "We do not sell or share your information with third parties. We use no advertising, analytics or tracking cookies.",
          "Data is processed through Google (authentication and Sheets/Drive APIs) and Vercel (hosting) solely to provide the Service.",
        ],
      },
      {
        h: "6. Your rights and deletion",
        p: [
          "You own the spreadsheet and can view, download or delete it in Google Drive at any time.",
          "You can revoke the Service's access at any time in your Google Account settings (myaccount.google.com/permissions).",
          "Signing out removes the local copy and the sign-in cookie from your browser.",
        ],
      },
      {
        h: "7. Changes",
        p: [
          "If this policy changes, we will post the update on this page and revise the effective date.",
        ],
      },
      {
        h: "8. Contact",
        p: [`Privacy questions: ${CONTACT_EMAIL}`],
      },
    ],
  },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm font-semibold text-accent">
        ex-record
      </Link>
      <nav className="mt-2 flex gap-3 text-sm text-ink-2">
        <a href="#ko" className="underline">
          한국어
        </a>
        <a href="#en" className="underline">
          English
        </a>
      </nav>
      {(["ko", "en"] as const).map((lang) => {
        const c = content[lang];
        return (
          <article
            key={lang}
            id={lang}
            lang={lang}
            className="mt-10 border-t border-line pt-8 first-of-type:border-t-0"
          >
            <h1 className="text-2xl font-bold">{c.title}</h1>
            <p className="mt-1 text-sm text-ink-3">{c.effective}</p>
            {c.sections.map((s) => (
              <section key={s.h} className="mt-6">
                <h2 className="font-semibold">{s.h}</h2>
                <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-ink-2">
                  {s.p.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </section>
            ))}
          </article>
        );
      })}
    </main>
  );
}
