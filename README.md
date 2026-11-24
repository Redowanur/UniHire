# UniHire

**An on-campus placement platform that connects final-year students with recruiters.**

Students form cohorts by university and department, then invite companies to their campus. Recruiters browse the cohorts that contacted them, inspect students, and run an online screening test to shortlist candidates before the campus visit.

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui (Base UI primitives)
- **Backend:** FastAPI, Beanie ODM, MongoDB 7
- **Auth:** JWT bearer tokens, email verification, and password reset by emailed code

---

## Table of contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Repository layout](#repository-layout)
4. [Getting started](#getting-started)
5. [Configuration](#configuration)
6. [User flows](#user-flows)
7. [API reference](#api-reference)
8. [Frontend notes](#frontend-notes)
9. [Development](#development)
10. [Known limitations](#known-limitations)

---

## Features

### Students
- Sign up with a university email (restricted to allowed domains) and a fixed `+880` phone prefix.
- Must verify their email through an emailed link before they can do anything else. The link is single-use and expires after 48 hours.
- Get cohort suggestions based on their university and department. They can also search for a cohort or create one.
- Join a cohort through an **invite link**. A link is multi-use, can have an optional expiry, and can be revoked.
- See cohort details: members' placement status and the companies the cohort has contacted, with the status of each invite.
- Invite recruiters to campus from any job post, with an optional note.
- Take screening tests published for their cohort and see their score.

### Recruiters
- Sign up with any organization name (no company registry check), then verify their email.
- Post, view and delete job posts (title, type, workplace, category, salary, experience, location and more).
- Accept or decline campus invitations from cohorts.
- Open an accepted cohort to see its roster and placement status.
- Create multiple-choice screening tests for a cohort, review submissions, and shortlist students.

### Public site
- Home page with a hero search that gives live suggestions, platform stats, a hiring feed, a how-it-works section and an FAQ.
- **Hiring page** with a filter box (side panel on desktop, slide-in drawer on mobile). Filters are location, category, job type, workplace, date posted and a salary range slider. Results can be sorted and are paginated.
- Job detail page.

### UX
- Fully responsive layout from phone to desktop.
- Page-load animations (which respect `prefers-reduced-motion`).
- Toast notifications for errors and successes.
- Show/hide toggle on password fields.

---

## Architecture

```
┌──────────────────────┐   HTTP/JSON   ┌────────────────────────┐   ┌───────────────┐
│ Next.js 16 (client)  │ ────────────▶ │ FastAPI (server)       │ ─▶│ MongoDB 7     │
│ :3000                │ ◀──────────── │ :8000  /api/v1/*       │   │ (Beanie ODM)  │
└──────────────────────┘   Bearer JWT  └─────────┬──────────────┘   └───────────────┘
                                                 │ SMTP
                                                 ▼
                                      verification & reset emails
```

- Public pages (home, hiring list, job detail) are server-rendered and fetch directly from the API.
- Authenticated pages are client components that read the JWT from the auth provider (`client/components/providers/auth-provider.tsx`) and call the API with `Authorization: Bearer <token>`.
- Access tokens last 60 minutes. Verification links last 48 hours. Password-reset codes last 10 minutes.

---

## Repository layout

```
.
├── client/                         # Next.js application
│   ├── app/                        # Routes (App Router)
│   │   ├── page.tsx                # Home
│   │   ├── hiring/                 # Job list (filters, sort, pagination) + [jobId] detail
│   │   ├── login/  signup/  forgot-password/  verify/
│   │   ├── onboarding/cohort/      # Join / find / create a cohort
│   │   ├── cohort/                 # Student cohort dashboard
│   │   ├── join/[token]/           # Invite-link landing page
│   │   ├── tests/[id]/             # Student takes a screening test
│   │   └── recruiter/              # dashboard, cohorts/[cohortId], tests/[testId]
│   ├── components/
│   │   ├── ui/                     # shadcn components (+ container, section-header)
│   │   ├── home/                   # hero, hero-pattern, search-bar, job-card, faq ...
│   │   ├── hiring/                 # filters (sidebar, drawer, sort), invite button
│   │   ├── auth/                   # form fields, PasswordInput, phone field
│   │   ├── layout/                 # header, footer, page transition
│   │   └── providers/              # auth provider
│   ├── lib/                        # api.ts (typed API client), data.ts, utils.ts
│   └── hooks/use-auth.ts
├── server/                         # FastAPI application
│   ├── main.py                     # App entrypoint, CORS, /health
│   ├── api/v1/api.py               # Router aggregation (mounted at /api/v1)
│   ├── api/v1/endpoints/           # One router per domain
│   ├── models/                     # Beanie documents (MongoDB collections)
│   ├── schemas/                    # Pydantic request/response models
│   ├── services/                   # auth_service, email_service
│   ├── core/                       # security (JWT, hashing), deps (current user)
│   ├── db/database.py              # Mongo client + Beanie init
│   ├── enums/  utils/
│   └── requirements.txt
├── docker-compose.yml              # MongoDB for local development
└── README.md
```

---

## Getting started

### Prerequisites
- Node.js 20+ and [Bun](https://bun.sh) (the repo uses `bun.lock`)
- Python 3.12+ (the checked-in bytecode is 3.14)
- Docker (for MongoDB), or any reachable MongoDB instance
- An SMTP account if you want emails to actually send

### 1. Start MongoDB

```bash
docker compose up -d
```

This exposes MongoDB on **`localhost:27018`**. The compose file maps host port 27018 to the container's 27017.

### 2. Run the backend

```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# create server/.env (see Configuration below)

uvicorn main:app --reload --port 8000
```

- API: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### 3. Run the frontend

```bash
cd client
bun install
bun run dev
```

Open http://localhost:3000.

### 4. Seed reference data

Signup needs universities and departments to exist. Create them through the API (see `/docs`):

- `POST /api/v1/universities`
- `POST /api/v1/departments`

Student signup is limited to the email domains in `server/enums/student_enums.py` (`ALLOWED_STUDENT_EMAIL_DOMAINS`). Add your university's domain there to allow it.

---

## Configuration

### Backend: `server/.env`

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | yes | e.g. `mongodb://localhost:27018` |
| `JWT_SECRET_KEY` | yes | Long random string used to sign tokens |
| `SMTP_HOST` | for email | SMTP server host |
| `SMTP_PORT` | no | Defaults to `587` |
| `SMTP_USERNAME` / `SMTP_PASSWORD` | for email | SMTP credentials |
| `EMAIL_FROM` | no | Sender, defaults to `Job Portal <no-reply@jobportal.local>` |
| `FRONTEND_URL` | no | Used to build links in emails. Defaults to `http://localhost:3000` |

The database name is `placement_portal`.

### Frontend: `client/.env`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL. Defaults to `http://localhost:8000` in `client/lib/api.ts`. |

> The existing `client/.env` defines `NEXT_PUBLIC_BASE_URL`, but the code reads `NEXT_PUBLIC_API_URL`. Rename it, or rely on the default, so the setting takes effect.

Never commit `.env` files (both are git-ignored).

---

## User flows

### Student
1. Land on the site and browse hiring posts, then click **Invite to campus**.
2. Sign up with the university email and verify it from the emailed link.
3. Join or create a cohort: use a suggestion, search, paste an invite link, or create a new one.
4. From a job post, invite the recruiter to campus (optionally with a note).
5. Track cohort members' placement status and company invites on the cohort dashboard.
6. Take screening tests published for the cohort.

### Recruiter
1. Sign up with any organization name and verify the email.
2. Post jobs from the dashboard.
3. Accept or decline cohort invitations.
4. Open an accepted cohort, then create a screening test, review scores, and shortlist students.

### Invite links
- Created by any cohort member. They are **multi-use** and can have an optional expiry (1 hour, 24 hours, 7 days, or a chosen date).
- A link can be revoked at any time. Sharing format: `/join/<token>`.

---

## API reference

All routes are under `/api/v1`. "Auth" means `Authorization: Bearer <token>`.

### Authentication
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/login` | – | Log in with email and password, returns a token |
| POST | `/auth/token` | – | OAuth2 form login (for the docs UI) |
| GET | `/auth/me` | ✓ | Current user |
| POST | `/auth/send-verification` | ✓ | Email a verification link |
| POST | `/auth/verify` | – | Redeem a verification token (single-use) |
| POST | `/auth/forgot-password` | – | Email a 6-digit reset code (10 min) |
| POST | `/auth/reset-password` | – | Set a new password with the code |

### Users and reference data
| Method | Path | Purpose |
|---|---|---|
| POST / GET / PATCH | `/students` | Student signup, list, update |
| POST / GET | `/recruiter` | Recruiter signup (any company name), list |
| POST / GET | `/universities` | Create / list universities |
| POST / GET | `/departments` | Create / list departments (`?university_id=`) |
| POST / GET | `/company` | Company records (not required for recruiter signup) |
| GET | `/stats` | Public counts for the hero (universities, cohorts, recruiters) |

### Jobs
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/job/all-jobs` | – | List with filters, sort and pagination |
| GET | `/job/suggestion?search_key=` | – | Up to 10 latest matches for the hero search |
| GET | `/job/{id}` | – | Job detail |
| POST | `/job` | recruiter | Create a job |
| PATCH / DELETE | `/job/{id}` | owner | Update / delete |

`GET /job/all-jobs` query parameters:

| Param | Meaning |
|---|---|
| `search` | Matches title or company (case-insensitive) |
| `company_name`, `created_by` | Partial company match / recruiter email |
| `job_type` | `full_time`, `part_time`, `internship`, `contract` |
| `work_place` | `remote`, `onsite`, `hybrid` |
| `location` | Partial, case-insensitive |
| `category` | `engineering`, `data-ai`, `design`, `product`, `marketing`, `finance`, `other` |
| `posted_within` | Only jobs posted in the last N days |
| `salary_min`, `salary_max` | Matches jobs whose numeric salary range overlaps |
| `sort` | `newest` (default), `oldest`, `salary_high`, `salary_low` |
| `page`, `limit` | Pagination (`limit` ≤ 100) |

Salary ranges are stored as `salary_min`/`salary_max` numbers, parsed from the salary text when a job is created (e.g. `৳30,000 - ৳45,000`).

### Cohorts and invite links
| Method | Path | Purpose |
|---|---|---|
| POST | `/cohorts` | Create a cohort |
| GET | `/cohorts`, `/cohorts/suggested` | Search / suggestions for the student's university and department |
| GET | `/cohorts/{id}` | Cohort detail (members visible to members and accepted recruiters) |
| POST | `/cohorts/{id}/join` | Join a cohort |
| POST / GET | `/cohorts/{id}/invite-links` | Create (optional `expires_in_hours`) / list links |
| GET | `/invite-links/{token}` | Public preview of a link |
| POST | `/invite-links/{token}/join` | Join through a link |
| PATCH | `/invite-links/{token}/revoke` | Revoke a link |

### Campus invites
| Method | Path | Purpose |
|---|---|---|
| POST | `/campus-invites` | Student invites a recruiter for a job |
| GET | `/campus-invites/mine` | Invites for the current user |
| PATCH | `/campus-invites/{id}/respond` | Recruiter accepts or rejects |

### Screening tests
| Method | Path | Purpose |
|---|---|---|
| POST | `/screening-tests` | Recruiter creates a test for an accepted invite |
| GET | `/screening-tests` | List (filter by `cohort_id`, `campus_invite_id`) |
| GET | `/screening-tests/{id}` | Test detail (correct answers hidden from students) |
| POST | `/screening-tests/{id}/submit` | Student submits answers, returns score |
| GET | `/screening-tests/{id}/submissions` | Recruiter views submissions |
| PATCH | `/screening-tests/{id}/submissions/{student_id}/shortlist` | Shortlist or unshortlist |

### Data model (MongoDB collections)
`students`, `recruiters`, `universities`, `departments`, `companies`, `jobs`, `cohorts`, cohort invite links, campus invites, screening tests, test submissions, and password reset codes. Models live in `server/models/`.

Placement status values: `not_placed`, `in_process`, `interview`, `placed`. Campus invite status: `pending`, `accepted`, `rejected`.

---

## Frontend notes

- **UI kit:** shadcn/ui (`base-nova` style, Base UI primitives) in `client/components/ui`. Components used include Button, Card, Dialog, Sheet, Select, Slider, Tabs, Table, Accordion, Breadcrumb, Calendar, Popover, Tooltip, Pagination, Questionnaire, Skeleton, Spinner and Sonner (toasts). Add more with `bunx --bun shadcn@latest add <name>`.
- **Theming:** semantic tokens in `client/app/globals.css` (`--primary`, `--card`, `--muted`, and so on) with an indigo palette. Use tokens, not raw colours.
- **Font:** Outfit, loaded in `app/layout.tsx`.
- **Hero wallpaper:** `components/home/hero-pattern.tsx` tiles lucide icons in an SVG pattern.
- **Hiring filters:** state lives in the URL. The page is a server component that reads `searchParams`, and `components/hiring/filters.tsx` (client) pushes updates.
- **Base UI tips:**
  - Triggers take a `render` prop, e.g. `DropdownMenuTrigger render={<Button />}`.
  - `Select` needs an `items` prop on the root to show labels.
  - Menu labels must sit inside a menu group.
- **Next.js version:** this is Next 16. Read `node_modules/next/dist/docs/` before using unfamiliar APIs. Client components that use `useParams`, `usePathname` or `useSearchParams` must be wrapped in `<Suspense>` to build.

---

## Development

```bash
# Frontend
cd client
bun run dev        # dev server
bun run build      # production build
bun run lint       # eslint
npx tsc --noEmit   # type-check

# Backend
cd server
uvicorn main:app --reload --port 8000
```

There is no automated test suite yet. Current verification is type-check, lint, production build, and manual API and UI checks. See `HANDOFF.md` for the latest status and next steps.

---

## Known limitations

- CORS currently allows every origin; restrict `allow_origins` in `server/main.py` before deploying.
- Jobs created before salary parsing was added have no numeric salary, so they are excluded when a salary filter is active.
- Recruiter organization names are not validated, so anyone can register under any company name.
- There are no automated tests, and `__pycache__` files are tracked in git.
- Email sending requires valid SMTP settings; without them verification and reset emails will not be delivered.
