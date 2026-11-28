# UniHire — Technical Documentation

Reference for developers. It describes the code as it stands (verified by reading the source on 2026-11-28). For setup basics and a feature overview see `README.md`; for session history and open items see `HANDOFF.md`.

## Contents

1. [What UniHire is](#1-what-unihire-is)
2. [Architecture](#2-architecture)
3. [Repository map](#3-repository-map)
4. [Running it](#4-running-it)
5. [Configuration](#5-configuration)
6. [Backend](#6-backend)
7. [API reference](#7-api-reference)
8. [Domain rules](#8-domain-rules)
9. [Frontend](#9-frontend)
10. [Live exam monitoring](#10-live-exam-monitoring)
11. [Deployment notes](#11-deployment-notes)
12. [Known issues and gotchas](#12-known-issues-and-gotchas)

---

## 1. What UniHire is

An on-campus placement platform with three kinds of user:

| Role | Can do |
|---|---|
| **Student** | Sign up, verify email, join or create a cohort, invite recruiters to campus from a job post, sit scheduled proctored screening tests |
| **Recruiter** | Sign up, verify email, post jobs, accept or decline cohort invites, view an accepted cohort's roster, create and edit scheduled tests, watch students live, shortlist from results |
| **Admin** | One account seeded from `.env`. Adds universities and departments. Sees nothing else |

A **cohort** is a group of students from one university and department (plus a batch year). Students invite a recruiter (via a job post) on behalf of the cohort; the recruiter's accepted invite unlocks the roster and screening tests for that cohort.

## 2. Architecture

```
Browser ──► Next.js 16 (:3000) ──rewrite /api/v1/*──► FastAPI (:8000) ──► MongoDB 7
   │                                                      │
   │◄──── WebRTC media (peer to peer, student → recruiter)─┤ WebSocket signaling only
                                                          └─► Email: Mailjet / Brevo / Resend (HTTPS) or SMTP
```

- **Frontend:** Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui on Base UI. Bun is the package manager.
- **Backend:** FastAPI, Beanie ODM over PyMongo's async client. Database name is `placement_portal`.
- **Auth:** stateless JWT (HS256). Access token 60 min, email-verification link token 48 h. Passwords hashed with argon2 (`pwdlib`).
- **Same-origin proxy:** `client/next.config.ts` rewrites `/api/v1/*` to `API_INTERNAL_URL`. Off-localhost browsers call the API through the site's own origin, so there is no CORS, second port or mixed content.
- **Public pages** (home, `/hiring`, job detail) fetch on the server. **Authenticated pages** are client components that call the API with the bearer token from `AuthProvider`.

## 3. Repository map

```
.
├── docker-compose.yml        mongodb + server + client
├── README.md  HANDOFF.md  DOCUMENTATION.md
├── server/
│   ├── main.py               FastAPI app, CORS (*), /health, mounts /api/v1
│   ├── db/database.py        Mongo client, Beanie init (13 documents), seeds the admin
│   ├── core/
│   │   ├── security.py       argon2 hashing, JWT create/decode, token purposes
│   │   └── deps.py           get_current_user, require_admin, require_roles
│   ├── api/v1/api.py         router aggregation
│   ├── api/v1/endpoints/     one router per domain (see §7)
│   ├── models/               Beanie documents (collections)
│   ├── schemas/              Pydantic request/response models
│   ├── services/
│   │   ├── auth_service.py       authenticate() across students, recruiters, admins
│   │   ├── admin_service.py      seed_admin() at startup
│   │   ├── catalog_service.py    get_or_create university / department (case-insensitive)
│   │   ├── email_service.py      providers + HTML templates
│   │   └── live_hub.py           in-memory WebRTC signaling rooms
│   ├── enums/  utils/        enums; helpers (utcnow, as_aware_utc, time_ago, parse_salary_range), validators
│   └── Dockerfile            python:3.14-slim, uvicorn
└── client/
    ├── app/                  routes (§9.1)
    ├── components/
    │   ├── ui/               shadcn components + custom: container, section-header, creatable-select, date-time-picker
    │   ├── auth/             form-fields (PasswordInput etc.), verify-notice
    │   ├── home/  hiring/  recruiter/  exam/  layout/  providers/
    │   └── logo.tsx  status-badge.tsx
    ├── lib/api.ts            typed API client (every endpoint call lives here)
    ├── lib/live.ts           LiveBroadcaster / LiveViewer (WebRTC + signaling)
    ├── lib/data.ts           static nav and footer content
    ├── hooks/use-auth.ts
    └── Dockerfile            bun, three stages (deps, build, run)
```

## 4. Running it

### Docker (everything)

```bash
docker compose up -d --build
```

Starts `mongodb` (host port **27018**, volume `mongo_data`), `server` (:8000) and `client` (:3000). Stop local dev servers first (same ports). After editing `server/.env` use `docker compose up -d --force-recreate server` (env is read at container creation).

### Local dev

```bash
# MongoDB only
docker compose up -d mongodb

# Backend (Python 3.12+; the Docker image uses 3.14)
cd server && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000        # docs at /docs, health at /health

# Frontend
cd client && bun install && bun run dev      # http://localhost:3000
```

### Checks

`npx tsc --noEmit`, `npx eslint .`, `bun run build`. There is **no automated test suite**.

### First-time data

Signup needs at least one university and one department. Log in as the admin (`/login`, goes straight to `/admin`) and add them, or let students type new names at signup (they are created on the fly).

## 5. Configuration

### `server/.env`

| Variable | Notes |
|---|---|
| `MONGODB_URI` | Required. Compose overrides to `mongodb://mongodb:27017`. Local: `mongodb://localhost:27018` |
| `JWT_SECRET_KEY` | Required. Server fails to import `core.security` without it |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Seed the single admin at startup (see §8.1). Without them no admin exists |
| `FRONTEND_URL` | Base for links in emails. Default `http://localhost:3000`. Set to the deployed site |
| `EMAIL_FROM` | `Name <address>`, `Name address` or bare address. Provider must have the sender verified |
| `MAILJET_API_KEY` + `MAILJET_SECRET_KEY` | HTTPS email. Highest priority |
| `BREVO_API_KEY` / `RESEND_API_KEY` | HTTPS email, next in priority |
| `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_USERNAME`, `SMTP_PASSWORD` | Fallback. With no provider **and** no `SMTP_HOST`, emails are only logged (dev mode) |
| `MAILJET_API_URL`, `BREVO_API_URL`, `RESEND_API_URL` | Override provider endpoints (used for tests) |

Provider priority: Mailjet → Brevo → Resend → SMTP. Hosts like Render block outbound SMTP, so use an HTTPS provider there.

### `client/.env` and build args

| Variable | When | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Build time** | Browser-facing API URL, default `http://localhost:8000`. A loopback value is swapped for the page's own origin when the page is opened from another host |
| `API_INTERNAL_URL` | **Build time** (rewrite) and server-side fetch | Default `http://localhost:8000`; Docker sets `http://server:8000` |
| `NEXT_PUBLIC_ICE_SERVERS` | Build time | JSON array of `RTCIceServer`. Default: Google public STUN, no TURN |

## 6. Backend

### 6.1 Request lifecycle

`main.py` → `api_router` (`/api/v1`) → endpoint module. Auth is a dependency: `get_current_user` decodes the bearer JWT (purpose must be `access`), then looks the id up in `students`, then `recruiters`, then `admins`. Endpoints check `user.user_type` themselves (or use `require_admin`).

### 6.2 Data model (collections)

| Model (collection) | Key fields | Indexes / notes |
|---|---|---|
| `Student` (`students`) | name, email, reg_no, password_hash, `university_id`, `dept_id`, phone, is_verified, placement_status, `cohort_id` | unique email, unique reg_no |
| `Recruiter` (`recruiters`) | name, email, password_hash, phone, company_name (free text), designation, linkedin_url, is_verified | unique email |
| `Admin` (`admins`) | name, email, password_hash, is_verified=True | unique email. Always exactly the `.env` admin |
| `University`, `Department` (`universities`, `departments`) | name | Global lists; a department has no university |
| `Cohort` (`cohorts`) | name, university_id, dept_id, batch_year, description, created_by, member_count | indexed university_id, dept_id |
| `CohortInviteLink` (`cohort_invite_links`) | cohort_id, token (8-byte urlsafe), created_by, expires_at, is_active | unique token; **TTL index on `expires_at`** |
| `CampusInvite` (`campus_invites`) | cohort_id, recruiter_id, job_id, invited_by, message, status (`pending`/`accepted`/`rejected`), responded_at | indexed cohort_id, recruiter_id |
| `Job` (`jobs`) | title (5–50), company_name, job_type, experience, salary text, salary_min/max, category, work_place, vacancy, location, description, lists (responsibilities, requirements, skills, benefits), `created_by` (**recruiter email**) | |
| `ScreeningTest` (`screening_tests`) | campus_invite_id, cohort_id, recruiter_id, title, description, questions[{id, text, options 2–6, correct_index}], `start_time` (UTC), `duration_minutes` (1–300) | `ends_at` = start + duration |
| `TestAttempt` (`test_attempts`) | test_id, student_id, `question_order` (shuffled question ids), violations[{type, at}], terminated, started_at | unique (test_id, student_id) |
| `TestSubmission` (`test_submissions`) | test_id, student_id, answers[] (recruiter's question order, -1 = blank), score, total, shortlisted | unique (test_id, student_id) |
| `PasswordResetCode` (`password_reset_codes`) | email, 6-digit code, expires_at, used | indexed email |

Notes: MongoDB returns naive UTC datetimes, so code uses `as_aware_utc()` before comparing with `utcnow()`. Old databases may still hold an unused `companies` collection and departments with a stale `university_id` field.

### 6.3 Email

`services/email_service.py` builds three HTML emails (verification link, password-reset code, exam scheduled/updated) and sends through the first configured provider. Failures raise `EmailDeliveryError`. Callers decide: `send-verification` returns 503, `forgot-password` swallows it (generic reply, so account existence is never revealed), exam emails log and continue. Exam times in emails are shown in BST (UTC+6).

### 6.4 Startup

`init_db()` connects, registers the 13 document models with Beanie (creating indexes), then `seed_admin()`.

## 7. API reference

Base path `/api/v1`. "Auth" = `Authorization: Bearer <token>`. Interactive docs at `/docs`.

### Auth (`/auth`)

| Method | Path | Auth | Behavior |
|---|---|---|---|
| POST | `/login` | – | `{email, password}` → `{access_token, token_type, user_type}`. Students, recruiters, admins |
| POST | `/token` | – | OAuth2 form version for Swagger |
| GET | `/me` | ✓ | Profile; shape depends on role |
| POST | `/send-verification` | ✓ student/recruiter | Emails a 48 h link. 400 if already verified, 503 if delivery fails |
| POST | `/verify` | – | `{token}`. Idempotent: a repeat returns `already_verified: true` |
| POST | `/forgot-password` | – | Always 202 with a generic message. Students and recruiters only (admins change `.env`) |
| POST | `/reset-password` | – | `{email, code, new_password}`; code valid 10 min, single use |

### Users and catalogue

| Method | Path | Auth | Behavior |
|---|---|---|---|
| POST | `/students` | – | Signup. `uni_id` **or** `uni_name`, `dept_id` **or** `dept_name`; new names are created. Phone is 10 digits, stored with `+880`. Password ≥ 8 |
| GET | `/students/{id}` | – | **Unauthenticated** (see §12) |
| PATCH | `/students/{id}` | self | name, phone, placement_status |
| POST | `/recruiter` | – | Signup. Any company name. Password ≥ 6 |
| GET | `/recruiter/{id}` | ✓ any | Profile |
| PATCH | `/recruiter/{id}` | self or admin | name, phone, company_name, designation, linkedin_url; other fields → 422 |
| GET | `/universities`, `/universities/{id}` | – | Public lists (signup uses them) |
| POST | `/universities?university_name=` | admin | Case-insensitive duplicate check |
| GET | `/departments` | – | `[{department_id, department_name}]` |
| POST | `/departments?department_name=` | admin | Same |
| GET | `/stats` | – | `{universities, cohorts, students, recruiters(verified)}` |

### Jobs (`/job`)

| Method | Path | Auth | Behavior |
|---|---|---|---|
| GET | `/all-jobs` | – | Filters: `search`, `company_name`, `job_type`, `work_place`, `created_by`, `location`, `category`, `posted_within` (days), `salary_min`, `salary_max`; `sort` = `newest`/`oldest`/`salary_high`/`salary_low`; `page`, `limit` (≤100, default 10). Returns `{total_jobs, total_pages, current_page, jobs}` |
| GET | `/suggestion?search_key=` | – | 10 latest title/company matches |
| GET | `/{id}` | – | Raw document (`_id`, not `id`; the client maps it) |
| POST | `` | verified recruiter | Company name comes from the recruiter profile; salary range parsed from text unless sent |
| PATCH | `/{id}` | owner | Partial update; recomputes the salary range when the salary text changes |
| DELETE | `/{id}` | owner | |

### Cohorts and invite links

All cohort mutations need a **verified student**.

| Method | Path | Behavior |
|---|---|---|
| POST | `/cohorts` | Create; uses the student's university and department; 409 if already in a cohort |
| GET | `/cohorts/suggested` | Cohorts matching the student's university + department |
| GET | `/cohorts` | Public search: `search`, `university_id`, `dept_id`, `page`, `limit` |
| GET | `/cohorts/{id}` | Detail. Roster visible to members and to recruiters with an accepted invite |
| PATCH | `/cohorts/{id}` | Rename; any member |
| POST | `/cohorts/{id}/join` | Join directly (409 if already in one) |
| POST/GET | `/cohorts/{id}/invite-links` | Create (`expires_in_hours` optional) / list; members only |
| GET | `/invite-links/{token}` | Public preview with `is_joinable` |
| POST | `/invite-links/{token}/join` | 410 if inactive or expired |
| PATCH | `/invite-links/{token}/revoke` | **Deletes** the link |

### Campus invites (`/campus-invites`)

| Method | Path | Behavior |
|---|---|---|
| POST | `` | Verified student with a cohort invites a recruiter via `job_id`. Recruiter must be verified; 409 if the cohort already has a non-rejected invite to that recruiter |
| GET | `/mine` | Recruiter: invites sent to them. Student: their cohort's invites |
| PATCH | `/{id}/respond` | Recruiter only, once: `accepted` or `rejected` |

### Screening tests (`/screening-tests`)

| Method | Path | Who | Behavior |
|---|---|---|---|
| POST | `` | recruiter | For an **accepted** invite. Start can't be > 1 min in the past. Emails the cohort in the background |
| GET | `` | any | Recruiter: own tests; student: cohort's tests; filters `cohort_id`, `campus_invite_id` |
| GET | `/{id}` | owner or cohort member | Schedule, `phase` (`upcoming`/`live`/`ended`), `server_time`. Questions only for the owner |
| PATCH | `/{id}` | owner | See §8.4 |
| POST | `/{id}/start` | student | Opens or resumes the attempt; returns questions in the student's private shuffled order |
| POST | `/{id}/violations` | student | `tab_switch`, `multi_monitor`, `camera_lost`, `mic_lost`; terminates at 3 |
| POST | `/{id}/submit` | student | `{answers: {question_id: option_index}}` → `{score, total}` |
| GET | `/{id}/submissions` | owner | Rows sorted by score, with violation counts |
| PATCH | `/{id}/submissions/{student_id}/shortlist` | owner | `{shortlisted}` |
| WS | `/{id}/live` | owner or sitting student | Signaling, see §10 |

## 8. Domain rules

### 8.1 Admin
`seed_admin()` runs at every startup: creates the admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`, re-hashes if the password changed, and **deletes every other admin document**. Admins can't use forgot-password.

### 8.2 Verification
New students and recruiters start unverified. Unverified students can't use cohorts or invites (403); unverified recruiters can't post jobs (403) and can't receive invites. The UI shows a full-page "Check your inbox" card (`components/auth/verify-notice.tsx`) with Resend and "I've verified".

### 8.3 Cohorts and invites
A student belongs to at most one cohort. There is **no leave-cohort endpoint** although error messages mention leaving. Invite links are multi-use; expired ones are deleted by a Mongo TTL index and also purged on every list, preview and join.

### 8.4 Screening tests
- Window = `start_time` to `start_time + duration`; it closes for everyone at the same instant.
- `/start` is refused before the start (403), after the end (403), if already submitted (409) or if terminated (403).
- Answers are keyed by question id, so each student's shuffle can't mis-score. Submission is accepted up to 20 s after the end (auto-submit grace).
- Violations: 3 → `terminated`; the client then auto-submits.
- **Editing** (owner): ended → 400; questions locked once any attempt exists (409); a live test's start can't move (400) but title and duration can; new start can't be in the past; the change can't leave the exam ending in the past. A schedule or question change re-emails the cohort.

### 8.5 Jobs
Category is a free string; the UI offers `engineering`, `data-ai`, `design`, `product`, `marketing`, `finance`, `other`. Salary filtering uses `salary_min`/`salary_max` parsed by `parse_salary_range` (`50k`, `40,000-60,000`); jobs with no parsed range drop out when a salary filter is active.

## 9. Frontend

### 9.1 Routes

| Route | Who | Purpose |
|---|---|---|
| `/` | all | Hero with icon wallpaper and search suggestions, stats, hiring feed, how-it-works, FAQ, CTA |
| `/hiring`, `/hiring/[jobId]` | all | Server-rendered list; filters in the URL (sidebar ≥ lg, drawer below), sort, pagination; detail page with invite-to-campus |
| `/login`, `/signup`, `/forgot-password`, `/verify` | guests | Auth. Signup has student and recruiter tabs |
| `/onboarding/cohort` | student | Suggested cohorts, search, create; verify notice for unverified |
| `/join/[token]` | student | Invite-link landing |
| `/cohort`, `/cohort/companies`, `/cohort/tests` | student | Roster + rename + invite links; company invites; tests |
| `/tests/[id]` | student | Lobby, pre-flight checks, proctored exam, results |
| `/recruiter/cohorts` | recruiter | Invites (accept/decline) and accepted cohorts |
| `/recruiter/cohorts/[cohortId]` | recruiter | Roster; create/edit tests |
| `/recruiter/tests/[testId]` | recruiter | Live monitor, results, shortlist, edit (`?edit=`) |
| `/recruiter/posts` | recruiter | Job posts: create, edit, delete |
| `/recruiter/dashboard` | recruiter | Redirects to `/recruiter/cohorts` |
| `/admin` | admin | Add and list universities and departments. Others get 404; guests go to `/login` |

Admins are redirected to `/admin` from all student and recruiter pages. There is no route-level middleware: guards are in each client page.

### 9.2 Auth on the client
`AuthProvider` keeps `user`, `accessToken`, `status` in React state and `access_token`, `user_type`, `user` in `localStorage`. On load it shows the cached profile, revalidates with `/auth/me`, and clears the session on 401/403. Use `useAuth()`. The header's `linksFor()` builds role-based navigation.

### 9.3 API client
`lib/api.ts` exports `request()` (JSON, bearer, error mapped to `Error` with `.status` and the API's `detail`) and one typed function per endpoint. Server-side it uses `API_INTERNAL_URL`; in the browser `browserApiUrl()` (see §5).

### 9.4 UI conventions
- shadcn **base-nova** style on Base UI. Triggers use `render={...}` (`DropdownMenuTrigger render={<Button/>}`); `Select` needs `items` on the root; menu labels go inside a `DropdownMenuGroup`.
- Sizes were tuned (`h-10` controls, `rounded-2xl` cards); `shadcn add -o` overwrites them. `DialogContent` is `flex flex-col` so long forms scroll.
- Theme tokens live in `app/globals.css` (`:root` and `.dark`); `next-themes` toggles the class (default light). Use tokens, not raw colours.
- Pages using `useParams`/`usePathname`/`useSearchParams` must sit in `<Suspense>`.
- Toasts: `sonner`. Font: Outfit.
- `client/AGENTS.md` warns this Next.js has breaking changes; check `node_modules/next/dist/docs/`.

## 10. Live exam monitoring

WebRTC, peer to peer: a student's camera and microphone go straight to the recruiter's browser; the server only relays handshakes and never sees media. Nothing is recorded.

1. A WebSocket connects to `/api/v1/screening-tests/{id}/live`. The first message must be `{"type":"auth","token":...}` within 10 s (keeps the token out of URLs and logs). Close codes: **4401** bad or missing auth, **4403** not allowed, 4000 replaced by a newer connection.
2. Allowed: the owning recruiter, or a cohort student with a live attempt (not terminated, not submitted, exam running). One connection per student.
3. `LiveHub` (in memory, per test room) sends `hello` with the opposite role's peers, `peer` / `peer_left` updates and relays only `offer`, `answer`, `ice`. Students never see each other. Recruiters also get `violation` and `submitted` events.
4. The student offers, the recruiter answers. Both clients (`lib/live.ts`) auto-reconnect and process messages in order. The recruiter grid is `components/exam/live-monitor.tsx`; audio is muted by default.

Limits: single server process (use Redis pub/sub to scale), no TURN server by default (strict NATs may fail), camera/mic need HTTPS off localhost.

Student-side proctoring (`app/tests/[id]/page.tsx`): camera and microphone permission, `screen.isExtended` check (Chromium only), tab blur/visibility detection, a monitor poll, track-ended detection, a server-clock timer and auto-submit. It is client-side and can be bypassed by a determined user.

## 11. Deployment notes

- Frontend on Vercel, API on Render has been used. Set `NEXT_PUBLIC_API_URL` to the API at build time, or rely on the same-origin rewrite with `API_INTERNAL_URL` pointing at the API.
- On Render set an HTTPS email provider (Mailjet) with `EMAIL_FROM` in `Name <verified@address>` form and `FRONTEND_URL` to the site URL. SMTP from Render fails with `Errno 101 Network is unreachable`.
- Tighten CORS in `server/main.py` (currently `*` with credentials).
- The WebSocket goes through the same proxy; verify your host supports WebSocket upgrades.

## 12. Known issues and gotchas

Found while reading the code; none are fixed unless noted in `HANDOFF.md`.

1. `GET /students/{id}` needs no authentication and returns email, phone and registration number. It should require a login (and probably self or admin).
2. `student_router.update_student`: `current_user.user_type in (UserType.ADMIN)` is a substring test on a string enum, not a tuple check. It works today by accident; write `== UserType.ADMIN`.
3. `update_student` lets a student set their own `placement_status`. Probably meant to be recruiter-driven; confirm the intent.
4. The student email-domain restriction (`ALLOWED_STUDENT_EMAIL_DOMAINS`) is **not enforced**: `_check_email` returns the value either way (the raise is commented out). The README claims it is.
5. Joining a cohort (`/cohorts/{id}/join`, invite-link join) updates `student.cohort_id` and `cohort.member_count` in two writes with no transaction; `member_count` can drift. There is no way to leave a cohort.
6. `/cohorts/{id}/join` lets any verified student join any cohort by id without an invite link; the suggested/search flow depends on this.
7. `GET /job/{id}` returns the raw Beanie document (with `_id`); the list endpoint returns `id`.
8. `Job.title` is limited to 5–50 characters in the model but not in `JobCreateRequest`, so a longer title gives a 500 instead of a 422.
9. Live-monitor state is per-process memory; a second API worker breaks monitoring.
10. Exam emails are sent from `asyncio.create_task` with no retry; if the process stops mid-send, remaining students are not emailed.
11. `forgot-password` and `reset-password` ignore admins by design.
12. `README.md` was stale in several places (company endpoints, `?university_id=` on departments, "single-use" verification links, docker-compose scope); it has been corrected alongside this file.
13. No automated tests. `__pycache__` files are tracked in git.
