const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type JobSuggestion = {
  id: string;
  title: string;
  company_name: string;
  posted: string;
};

export type UserType = "student" | "recruiter" | "admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  user_type: UserType;
  is_verified: boolean;
  // Student only
  reg_no?: number;
  dept_id?: string;
  placement_status?: string;
  cohort_id?: string | null;
  // Recruiter only
  company_name?: string;
  designation?: string;
};

export type ApiError = Error & { status?: number };

export async function request<T>(
  path: string,
  init?: RequestInit & { authToken?: string },
): Promise<T> {
  const { authToken, headers, ...rest } = init ?? {};
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (typeof data.detail === "string") detail = data.detail;
    } catch {
      // ignore body parse errors, keep fallback message
    }
    const error: ApiError = new Error(detail);
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

/* ---------------------------------- */
/* Authentication                     */
/* ---------------------------------- */

export async function login(
  email: string,
  password: string,
): Promise<{ access_token: string; user_type: UserType }> {
  const data = await request<{
    access_token: string;
    token_type: string;
    user_type: UserType;
  }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return { access_token: data.access_token, user_type: data.user_type };
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  return request<AuthUser>("/api/v1/auth/me", { authToken: token });
}

/** POSTs the click-token from the emailed link and flips `is_verified`. */
export async function verifyEmail(
  token: string,
): Promise<{ message: string; already_verified: boolean }> {
  return request("/api/v1/auth/verify", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

/** Best-effort: asks the backend to email the verification link after signup. */
export async function sendVerificationEmail(token: string): Promise<void> {
  await request("/api/v1/auth/send-verification", { method: "POST", authToken: token });
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return request("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<{ message: string }> {
  return request("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, code, new_password: newPassword }),
  });
}

export type StudentSignUpPayload = {
  name: string;
  email: string;
  reg_no: number;
  password: string;
  dept_id: string;
  uni_id: string;
  phone: string;
};

export async function signUpStudent(payload: StudentSignUpPayload): Promise<AuthUser> {
  return request<AuthUser>("/api/v1/students", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type RecruiterSignUpPayload = {
  name: string;
  email: string;
  password: string;
  phone: string;
  company_name: string;
  designation: string;
};

export async function signUpRecruiter(
  payload: RecruiterSignUpPayload,
): Promise<AuthUser> {
  return request<AuthUser>("/api/v1/recruiter", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ---------------------------------- */
/* Universities & departments         */
/* ---------------------------------- */

export type University = { id: string; name: string };

type UniversityDoc = { _id: string; id?: string; name: string };

export async function fetchUniversities(): Promise<University[]> {
  const docs = await request<UniversityDoc[]>("/api/v1/universities");
  return docs.map((doc) => ({ id: String(doc._id ?? doc.id), name: doc.name }));
}

export async function fetchDepartments(uniId: string): Promise<University[]> {
  const docs = await request<
    { department_id: string; department_name: string }[]
  >(`/api/v1/departments?university_id=${uniId}`);
  return docs.map((doc) => ({ id: doc.department_id, name: doc.department_name }));
}

/* ---------------------------------- */
/* Jobs                               */
/* ---------------------------------- */

export async function fetchJobSuggestions(
  q: string,
  signal?: AbortSignal,
): Promise<JobSuggestion[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/job/suggestion?search_key=${encodeURIComponent(q)}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(`Suggestion request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.suggestions;
}

export type JobListing = {
  id: string;
  title: string;
  company_name: string;
  job_type: "full_time" | "part_time" | "internship" | "contract";
  experience: string;
  salary: string;
  office_hours: string;
  work_place: "remote" | "onsite" | "hybrid";
  vacancy: number;
  location: string;
};

export async function fetchJobs(params?: {
  search?: string;
  company_name?: string;
  job_type?: string;
  work_place?: string;
  created_by?: string;
  page?: number;
  limit?: number;
}): Promise<{ total_jobs: number; total_pages: number; current_page: number; jobs: JobListing[] }> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.company_name) query.set("company_name", params.company_name);
  if (params?.job_type) query.set("job_type", params.job_type);
  if (params?.work_place) query.set("work_place", params.work_place);
  if (params?.created_by) query.set("created_by", params.created_by);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return request(`/api/v1/job/all-jobs${qs ? `?${qs}` : ""}`);
}

export type JobDetail = JobListing & {
  description: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  benefits: string[];
  created_by: string;
  created_at: string;
};

export async function fetchJob(jobId: string): Promise<JobDetail> {
  return request<JobDetail>(`/api/v1/job/${jobId}`);
}

export type JobCreatePayload = {
  title: string;
  job_type: JobListing["job_type"];
  experience: string;
  salary: string;
  office_hours: string;
  work_place: JobListing["work_place"];
  vacancy: number;
  location: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  benefits: string[];
};

export async function createJob(
  payload: JobCreatePayload,
  token: string,
): Promise<{ message: string; job_id: string }> {
  return request("/api/v1/job", {
    method: "POST",
    authToken: token,
    body: JSON.stringify(payload),
  });
}

export async function fetchMyJobs(email: string): Promise<JobListing[]> {
  const data = await fetchJobs({ created_by: email, limit: 100 });
  return data.jobs;
}

export async function deleteJob(jobId: string, token: string): Promise<{ message: string }> {
  return request(`/api/v1/job/${jobId}`, { method: "DELETE", authToken: token });
}

/* ---------------------------------- */
/* Platform stats                     */
/* ---------------------------------- */

export async function fetchStats(): Promise<{
  universities: number;
  cohorts: number;
  recruiters: number;
}> {
  return request("/api/v1/stats");
}

/* ---------------------------------- */
/* Cohorts                            */
/* ---------------------------------- */

export type CohortSummary = {
  id: string;
  name: string;
  university_id: string;
  university_name: string;
  dept_id: string;
  dept_name: string;
  batch_year: number;
  description: string | null;
  member_count: number;
  created_at: string;
};

export type CohortMember = {
  id: string;
  name: string;
  reg_no: number;
  placement_status: string;
};

export type CohortDetail = CohortSummary & {
  created_by: string;
  is_member: boolean;
  is_owner: boolean;
  members: CohortMember[] | null;
};

export async function createCohort(
  payload: { name: string; batch_year: number; description?: string },
  token: string,
): Promise<CohortDetail> {
  return request("/api/v1/cohorts", {
    method: "POST",
    authToken: token,
    body: JSON.stringify(payload),
  });
}

export async function fetchSuggestedCohorts(token: string): Promise<CohortSummary[]> {
  return request("/api/v1/cohorts/suggested", { authToken: token });
}

export async function searchCohorts(search?: string): Promise<CohortSummary[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return request(`/api/v1/cohorts${qs}`);
}

export async function fetchCohort(cohortId: string, token: string): Promise<CohortDetail> {
  return request(`/api/v1/cohorts/${cohortId}`, { authToken: token });
}

export async function joinCohort(cohortId: string, token: string): Promise<CohortDetail> {
  return request(`/api/v1/cohorts/${cohortId}/join`, { method: "POST", authToken: token });
}

/* ---------------------------------- */
/* Cohort invite links                */
/* ---------------------------------- */

export type InviteLink = {
  token: string;
  join_path: string;
  expires_at: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
};

export type InviteLinkPreview = {
  cohort_id: string;
  cohort_name: string;
  university_name: string;
  dept_name: string;
  batch_year: number;
  member_count: number;
  is_joinable: boolean;
};

export async function createInviteLink(
  cohortId: string,
  expiresInHours: number | null,
  token: string,
): Promise<InviteLink> {
  return request(`/api/v1/cohorts/${cohortId}/invite-links`, {
    method: "POST",
    authToken: token,
    body: JSON.stringify({ expires_in_hours: expiresInHours }),
  });
}

export async function fetchInviteLinks(cohortId: string, token: string): Promise<InviteLink[]> {
  return request(`/api/v1/cohorts/${cohortId}/invite-links`, { authToken: token });
}

export async function previewInviteLink(linkToken: string): Promise<InviteLinkPreview> {
  return request(`/api/v1/invite-links/${linkToken}`);
}

export async function joinViaInviteLink(
  linkToken: string,
  token: string,
): Promise<{ message: string; cohort_id: string }> {
  return request(`/api/v1/invite-links/${linkToken}/join`, { method: "POST", authToken: token });
}

export async function revokeInviteLink(linkToken: string, token: string): Promise<{ message: string }> {
  return request(`/api/v1/invite-links/${linkToken}/revoke`, { method: "PATCH", authToken: token });
}

/* ---------------------------------- */
/* Campus invites                     */
/* ---------------------------------- */

export type CampusInviteStatus = "pending" | "accepted" | "rejected";

export type CampusInvite = {
  id: string;
  cohort_id: string;
  cohort_name: string;
  recruiter_id: string;
  recruiter_name: string;
  company_name: string;
  job_id: string | null;
  job_title: string | null;
  invited_by: string;
  message: string | null;
  status: CampusInviteStatus;
  created_at: string;
  responded_at: string | null;
};

export async function createCampusInvite(
  payload: { job_id: string; message?: string },
  token: string,
): Promise<CampusInvite> {
  return request("/api/v1/campus-invites", {
    method: "POST",
    authToken: token,
    body: JSON.stringify(payload),
  });
}

export async function fetchMyCampusInvites(token: string): Promise<CampusInvite[]> {
  return request("/api/v1/campus-invites/mine", { authToken: token });
}

export async function respondToCampusInvite(
  inviteId: string,
  responseStatus: "accepted" | "rejected",
  token: string,
): Promise<CampusInvite> {
  return request(`/api/v1/campus-invites/${inviteId}/respond`, {
    method: "PATCH",
    authToken: token,
    body: JSON.stringify({ status: responseStatus }),
  });
}

/* ---------------------------------- */
/* Screening tests                    */
/* ---------------------------------- */

export type QuestionDraft = { text: string; options: string[]; correct_index: number };
export type QuestionPublic = { id: string; text: string; options: string[] };
export type QuestionFull = QuestionPublic & { correct_index: number };

export type ScreeningTestSummary = {
  id: string;
  campus_invite_id: string;
  cohort_id: string;
  recruiter_id: string;
  company_name: string;
  title: string;
  description: string | null;
  question_count: number;
  created_at: string;
};

export type ScreeningTestDetail = {
  id: string;
  campus_invite_id: string;
  cohort_id: string;
  recruiter_id: string;
  title: string;
  description: string | null;
  questions: QuestionPublic[] | QuestionFull[];
  created_at: string;
  is_owner: boolean;
  already_submitted: boolean;
  my_score: number | null;
  my_total: number | null;
};

export async function createScreeningTest(
  payload: {
    campus_invite_id: string;
    title: string;
    description?: string;
    questions: QuestionDraft[];
  },
  token: string,
): Promise<ScreeningTestDetail> {
  return request("/api/v1/screening-tests", {
    method: "POST",
    authToken: token,
    body: JSON.stringify(payload),
  });
}

export async function fetchScreeningTests(
  token: string,
  params?: { cohort_id?: string; campus_invite_id?: string },
): Promise<ScreeningTestSummary[]> {
  const query = new URLSearchParams();
  if (params?.cohort_id) query.set("cohort_id", params.cohort_id);
  if (params?.campus_invite_id) query.set("campus_invite_id", params.campus_invite_id);
  const qs = query.toString();
  return request(`/api/v1/screening-tests${qs ? `?${qs}` : ""}`, { authToken: token });
}

export async function fetchScreeningTest(testId: string, token: string): Promise<ScreeningTestDetail> {
  return request(`/api/v1/screening-tests/${testId}`, { authToken: token });
}

export async function submitScreeningTest(
  testId: string,
  answers: number[],
  token: string,
): Promise<{ score: number; total: number }> {
  return request(`/api/v1/screening-tests/${testId}/submit`, {
    method: "POST",
    authToken: token,
    body: JSON.stringify({ answers }),
  });
}

export type SubmissionRow = {
  student_id: string;
  student_name: string;
  reg_no: number;
  score: number;
  total: number;
  shortlisted: boolean;
  submitted_at: string;
};

export async function fetchSubmissions(testId: string, token: string): Promise<SubmissionRow[]> {
  return request(`/api/v1/screening-tests/${testId}/submissions`, { authToken: token });
}

export async function toggleShortlist(
  testId: string,
  studentId: string,
  shortlisted: boolean,
  token: string,
): Promise<SubmissionRow> {
  return request(`/api/v1/screening-tests/${testId}/submissions/${studentId}/shortlist`, {
    method: "PATCH",
    authToken: token,
    body: JSON.stringify({ shortlisted }),
  });
}
