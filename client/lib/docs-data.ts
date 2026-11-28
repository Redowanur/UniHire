/** Content for the /docs developer page. Keep in step with DOCUMENTATION.md at the repo root. */

export type Endpoint = { method: string; path: string; auth: string; note: string };
export type EndpointGroup = { id: string; title: string; description?: string; endpoints: Endpoint[] };

export const endpointGroups: EndpointGroup[] = [
  {
    id: "auth",
    title: "Auth",
    description: "Prefix /auth. Tokens are JWTs: access 60 min, email-verification 48 h.",
    endpoints: [
      { method: "POST", path: "/auth/login", auth: "none", note: "{email, password} returns {access_token, user_type}. Students, recruiters and the admin." },
      { method: "POST", path: "/auth/token", auth: "none", note: "OAuth2 form login for Swagger." },
      { method: "GET", path: "/auth/me", auth: "any", note: "Current profile; shape depends on role." },
      { method: "POST", path: "/auth/send-verification", auth: "student, recruiter", note: "Emails a 48 h link. 400 if already verified, 503 if delivery fails." },
      { method: "POST", path: "/auth/verify", auth: "none", note: "{token}. Idempotent: a repeat returns already_verified." },
      { method: "POST", path: "/auth/forgot-password", auth: "none", note: "Always 202 with a generic message; never reveals whether the account exists." },
      { method: "POST", path: "/auth/reset-password", auth: "none", note: "{email, code, new_password}. Code lasts 10 min, single use." },
    ],
  },
  {
    id: "users",
    title: "Users and catalogue",
    endpoints: [
      { method: "POST", path: "/students", auth: "none", note: "Signup. uni_id or uni_name, dept_id or dept_name; new names are created. Phone is 10 digits (+880 added)." },
      { method: "GET", path: "/students/{id}", auth: "none", note: "Currently unauthenticated and returns contact details (known issue)." },
      { method: "PATCH", path: "/students/{id}", auth: "self", note: "name, phone, placement_status." },
      { method: "POST", path: "/recruiter", auth: "none", note: "Signup. Any company name is accepted." },
      { method: "GET", path: "/recruiter/{id}", auth: "any", note: "Recruiter profile." },
      { method: "PATCH", path: "/recruiter/{id}", auth: "self, admin", note: "name, phone, company_name, designation, linkedin_url. Other fields give 422." },
      { method: "GET", path: "/universities", auth: "none", note: "Public list, used by signup." },
      { method: "POST", path: "/universities?university_name=", auth: "admin", note: "Case-insensitive duplicate check." },
      { method: "GET", path: "/departments", auth: "none", note: "Global list (not per university)." },
      { method: "POST", path: "/departments?department_name=", auth: "admin", note: "Case-insensitive duplicate check." },
      { method: "GET", path: "/stats", auth: "none", note: "{universities, cohorts, students, recruiters}." },
    ],
  },
  {
    id: "jobs",
    title: "Jobs",
    description:
      "GET /job/all-jobs filters: search, company_name, job_type, work_place, created_by, location, category, posted_within, salary_min, salary_max; sort = newest | oldest | salary_high | salary_low; page, limit (max 100).",
    endpoints: [
      { method: "GET", path: "/job/all-jobs", auth: "none", note: "Returns {total_jobs, total_pages, current_page, jobs}." },
      { method: "GET", path: "/job/suggestion?search_key=", auth: "none", note: "10 latest title or company matches." },
      { method: "GET", path: "/job/{id}", auth: "none", note: "Raw document with _id (the client maps it to id)." },
      { method: "POST", path: "/job", auth: "verified recruiter", note: "Company comes from the profile; salary range parsed from the text." },
      { method: "PATCH", path: "/job/{id}", auth: "owner", note: "Partial update; salary range recomputed when the text changes." },
      { method: "DELETE", path: "/job/{id}", auth: "owner", note: "" },
    ],
  },
  {
    id: "cohorts",
    title: "Cohorts and invite links",
    description: "Mutations need a verified student. A student belongs to at most one cohort.",
    endpoints: [
      { method: "POST", path: "/cohorts", auth: "student", note: "Uses the student's university and department. 409 if already in a cohort." },
      { method: "GET", path: "/cohorts/suggested", auth: "student", note: "Same university and department." },
      { method: "GET", path: "/cohorts", auth: "none", note: "Search: search, university_id, dept_id, page, limit." },
      { method: "GET", path: "/cohorts/{id}", auth: "any", note: "Roster only for members and recruiters with an accepted invite." },
      { method: "PATCH", path: "/cohorts/{id}", auth: "member", note: "Rename." },
      { method: "POST", path: "/cohorts/{id}/join", auth: "student", note: "Join by id." },
      { method: "POST", path: "/cohorts/{id}/invite-links", auth: "member", note: "Optional expires_in_hours." },
      { method: "GET", path: "/cohorts/{id}/invite-links", auth: "member", note: "Expired links are purged first." },
      { method: "GET", path: "/invite-links/{token}", auth: "none", note: "Preview with is_joinable." },
      { method: "POST", path: "/invite-links/{token}/join", auth: "student", note: "410 if inactive or expired." },
      { method: "PATCH", path: "/invite-links/{token}/revoke", auth: "member", note: "Deletes the link." },
    ],
  },
  {
    id: "invites",
    title: "Campus invites",
    endpoints: [
      { method: "POST", path: "/campus-invites", auth: "student", note: "Invite the recruiter behind a job_id. Recruiter must be verified; 409 on a duplicate." },
      { method: "GET", path: "/campus-invites/mine", auth: "student, recruiter", note: "Recruiter: invites received. Student: the cohort's invites." },
      { method: "PATCH", path: "/campus-invites/{id}/respond", auth: "recruiter", note: "accepted or rejected, once." },
    ],
  },
  {
    id: "tests",
    title: "Screening tests",
    description: "A test belongs to an accepted invite. The window is start_time to start_time + duration_minutes.",
    endpoints: [
      { method: "POST", path: "/screening-tests", auth: "recruiter", note: "Start can't be more than 1 minute in the past. Emails the cohort." },
      { method: "GET", path: "/screening-tests", auth: "any", note: "Own tests (recruiter) or the cohort's (student)." },
      { method: "GET", path: "/screening-tests/{id}", auth: "owner, member", note: "Schedule, phase, server_time. Questions only for the owner." },
      { method: "PATCH", path: "/screening-tests/{id}", auth: "owner", note: "Locked once ended; questions locked once an attempt exists." },
      { method: "POST", path: "/screening-tests/{id}/start", auth: "student", note: "Questions in a private shuffled order." },
      { method: "POST", path: "/screening-tests/{id}/violations", auth: "student", note: "tab_switch, multi_monitor, camera_lost, mic_lost. 3 ends the exam." },
      { method: "POST", path: "/screening-tests/{id}/submit", auth: "student", note: "{answers: {question_id: option_index}}. 20 s grace after the end." },
      { method: "GET", path: "/screening-tests/{id}/submissions", auth: "owner", note: "Sorted by score, with violation counts." },
      { method: "PATCH", path: "/screening-tests/{id}/submissions/{student_id}/shortlist", auth: "owner", note: "{shortlisted}." },
      { method: "WS", path: "/screening-tests/{id}/live", auth: "owner, sitting student", note: "WebRTC signaling. First message {type: auth, token}." },
    ],
  },
];

export const envServer: [string, string][] = [
  ["MONGODB_URI", "Required. Compose sets mongodb://mongodb:27017; local is mongodb://localhost:27018."],
  ["JWT_SECRET_KEY", "Required."],
  ["ADMIN_EMAIL, ADMIN_PASSWORD", "Seed the single admin at startup; every other admin document is deleted."],
  ["FRONTEND_URL", "Base for links in emails. Default http://localhost:3000."],
  ["EMAIL_FROM", "Name <address>; the sender must be verified with the provider."],
  ["MAILJET_API_KEY, MAILJET_SECRET_KEY", "HTTPS email, highest priority (then BREVO_API_KEY, RESEND_API_KEY, then SMTP_*)."],
  ["SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD", "Fallback. With nothing configured, emails are only logged."],
];

export const envClient: [string, string][] = [
  ["NEXT_PUBLIC_API_URL", "Build time. Browser-facing API URL, default http://localhost:8000."],
  ["API_INTERNAL_URL", "Build time and server-side. Target of the /api/v1 rewrite; Docker uses http://server:8000."],
  ["NEXT_PUBLIC_ICE_SERVERS", "Build time. JSON RTCIceServer[]; default is Google STUN with no TURN."],
];

export const collections: [string, string][] = [
  ["students", "email and reg_no unique; university_id, dept_id, cohort_id"],
  ["recruiters", "email unique; free-text company_name"],
  ["admins", "always exactly the .env admin"],
  ["universities, departments", "global name lists"],
  ["cohorts", "university_id, dept_id, batch_year, member_count"],
  ["cohort_invite_links", "unique token; TTL index on expires_at"],
  ["campus_invites", "pending, accepted or rejected"],
  ["jobs", "created_by is the recruiter's email; salary_min and salary_max parsed from text"],
  ["screening_tests", "questions with ids, start_time (UTC), duration_minutes"],
  ["test_attempts", "unique per test and student; shuffled order and violations"],
  ["test_submissions", "unique per test and student; score, shortlisted"],
  ["password_reset_codes", "6-digit code, 10 minute expiry"],
];

export const gotchas: string[] = [
  "GET /students/{id} needs no login and returns email, phone and registration number.",
  "The student email-domain allow-list is not enforced (the raise in _check_email is commented out).",
  "There is no leave-cohort endpoint, and member_count is updated without a transaction.",
  "Live monitoring keeps rooms in process memory, so run one API process. There is no TURN server by default.",
  "Camera and microphone need HTTPS off localhost, and the exam needs screen.isExtended (Chromium only).",
  "Proctoring is client-side and can be bypassed by a determined user; the server is the log and the terminate rule.",
  "There is no automated test suite. Checks are tsc, eslint and next build.",
];
