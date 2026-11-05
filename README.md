# ex-record

운동 기록 웹앱. DB 없이 **각 사용자의 Google Drive 스프레드시트**에 데이터를 저장합니다.

- Next.js 16 (App Router, Cache Components) · React 19 · Tailwind CSS v4 · Recharts · Zustand
- 인증: Auth.js v5 + Google OAuth (`drive.file` 권한, 앱이 만든 파일에만 접근)
- 모바일 우선 반응형 · PWA · 오프라인 기록 (localStorage 큐 → 온라인 시 동기화)
- UI 언어 한국어/English/日本語, 단위 kg/lb

## 데이터 저장 방식

첫 로그인 시 사용자 Drive에 `Workout Log (ex-record)` 스프레드시트를 만들고, `appProperties`로 표시해 다음부터 찾습니다.

| 탭 | 컬럼 |
|---|---|
| exercises | id, name, type, bodyPart, defaultRestSec, incrementKg, archived |
| routine | id, day(0=일), order, exerciseId, targetSets, targetReps, targetWeightKg, targetDurationSec, targetDistanceKm, restSec, supersetGroup |
| sessions | id, date, startedAt, endedAt, note |
| sets | id, sessionId, date, exerciseId, setNo, weightKg, reps, durationSec, distanceKm, rpe, isWarmup |
| bodyweights | date, weightKg |
| settings | key, value |

- 무게는 항상 kg로 저장하고, 표시할 때 설정 단위로 바꿉니다.
- 모든 쓰기는 `Op`(`src/lib/data/ops.ts`) 단위입니다. 클라이언트는 낙관적으로 먼저 반영한 뒤 큐에 쌓고, 서버는 시트를 읽고 → 적용하고 → 바뀐 탭만 다시 씁니다. Op는 멱등이라 다시 보내도 안전합니다.
- 기본 운동 이름은 `@bench_press` 같은 번역 키로 저장되어 UI 언어에 따라 표시됩니다.

## Google Cloud 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. **APIs & Services → Library**에서 **Google Sheets API**, **Google Drive API** 사용 설정
3. **OAuth consent screen**: External, scope에 `openid`, `email`, `profile`, `.../auth/drive.file` 추가
   - 테스트 단계에서는 Test users에 본인 계정 추가
   - `drive.file`은 민감 권한이 아니어서 공개 시 심사 부담이 적습니다
4. **Credentials → Create OAuth client ID → Web application**
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://<your-domain>/api/auth/callback/google`

## 로컬 실행

```bash
cp .env.example .env.local   # AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET 입력
npm install
npm run dev
```

Google 없이 UI만 확인하려면 `.env.local`에 `DATA_BACKEND=memory`를 넣습니다. 로그인을 건너뛰고 메모리 저장소를 쓰며, Vercel production 환경에서는 무시되고, production 빌드(`next start`)에서는 `ALLOW_MEMORY_BACKEND_IN_PRODUCTION=1`도 함께 줘야 켜집니다.

## 테스트 (TDD)

```bash
npm test            # Vitest: 도메인 로직, 시트 직렬화/저장소, 동기화 큐, API, 컴포넌트
npm run test:e2e    # Playwright: 메모리 백엔드로 빌드 후 모바일/데스크톱 흐름 테스트
```

| 위치 | 내용 |
|---|---|
| `src/lib/domain/*` | 순수 로직: 1RM, 볼륨, 주/월/년 집계, PR 감지, 점진적 과부하, 루틴 복사, 원판, 타이머, 운동 진행 |
| `src/lib/data/*` | Op 적용, 시트 코덱, Sheets REST 저장소 (fetch 주입으로 테스트) |
| `src/lib/store/*` | 오프라인 큐/동기화 스토어 |
| `src/components/*` | UI (RTL 테스트: SetRow, RestTimer, MonthCalendar, RoutineEditor) |

## Vercel 배포

1. 저장소를 Vercel에 import
2. Environment Variables: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
3. Google OAuth 클라이언트에 배포 도메인의 redirect URI 추가

## 알려진 제약

- 여러 기기에서 **동시에** 같은 탭을 수정하면 마지막에 쓴 쪽이 이깁니다 (개인용 규모 기준 설계).
- 진동(Vibration API)은 Android Chrome 등에서만 동작합니다. iOS Safari는 지원하지 않아 소리와 화면 깜빡임으로 대신 알립니다.
- 휴식 타이머는 종료 시각을 기준으로 계산해서 탭이 백그라운드에 있어도 시간은 정확합니다. 다만 브라우저가 백그라운드 탭을 멈추면 알림은 앱으로 돌아왔을 때 울립니다.
