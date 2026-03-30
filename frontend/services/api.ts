const envUrl = import.meta.env.VITE_API_URL;
/** In dev with no override, use same-origin `/api` (Vite proxies to the backend). */
export const API_BASE =
  (typeof envUrl === 'string' && envUrl.length > 0 ? envUrl : '') ||
  (import.meta.env.DEV ? '' : '');

export interface StudentLoginResponse {
  success: boolean;
  role: 'student';
  userId: number;
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  token: string;
  error?: string;
}

export async function studentLoginWithUsername(
  username: string,
  password: string
): Promise<StudentLoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/student/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = (await res.json()) as StudentLoginResponse;
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Login failed. Check your username and password.');
  }
  return data;
}

export async function fetchStudentClasses(studentId: number): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/classes/student/${studentId}`);
  if (!res.ok) throw new Error('Failed to fetch classes');
  return res.json();
}

export async function fetchTeacherClasses(teacherId: number): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/classes/teacher/${teacherId}`);
  if (!res.ok) throw new Error('Failed to fetch classes');
  return res.json();
}

export async function createTeacherClass(
  teacherId: number,
  payload: {
    className: string;
    subjectCode: string;
    semester?: string;
    period?: string;
    roomNumber?: string;
    classCode?: string;
  }
): Promise<{ success: boolean; class?: any; error?: string }> {
  const res = await fetch(`${API_BASE}/api/classes/teacher/${teacherId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data?.success) return { success: false, error: data?.error || 'Failed to create class' };
  return { success: true, class: data.class };
}

export async function fetchClassDetails(classId: number): Promise<any> {
  const res = await fetch(`${API_BASE}/api/classes/${classId}`);
  if (!res.ok) throw new Error('Failed to fetch class');
  return res.json();
}

export async function updateClass(
  classId: number,
  payload: {
    teacherId: number;
    className: string;
    subjectCode: string;
    semester?: string;
    period?: string;
    roomNumber?: string;
    classCode?: string;
  }
): Promise<{ success: boolean; class?: any; error?: string }> {
  const res = await fetch(`${API_BASE}/api/classes/${classId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data?.success) return { success: false, error: data?.error || 'Failed to update class' };
  return { success: true, class: data.class };
}

export async function deleteClass(
  classId: number,
  teacherId: number
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/classes/${classId}?teacherId=${encodeURIComponent(String(teacherId))}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok || !data?.success) return { success: false, error: data?.error || 'Failed to delete class' };
  return { success: true };
}

export interface AssignmentRow {
  assignment_id: number;
  assignment_name: string;
  description?: string | null;
  type?: string | null;
  max_points?: number;
  due_date?: string | null;
  assignment_link?: string | null;
  ai_params?: string | null;
  question_types?: string | null;
  allowed_submissions?: number;
  attempt_scoring_policy?: 'latest' | 'highest' | 'average' | string | null;
}

export async function fetchClassAssignments(classId: number): Promise<AssignmentRow[]> {
  const res = await fetch(`${API_BASE}/api/classes/${classId}/assignments`);
  if (!res.ok) throw new Error('Failed to fetch assignments');
  return res.json();
}

export async function enrollStudentByClassCode(studentId: number, classCode: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/classes/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, classCode: classCode.trim() }),
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error || 'Enrollment failed' };
  return { success: true };
}

/** Attach a PDF to an existing assignment. assignmentId is required (assignment must be created first). */
export async function uploadAssignmentPdf(
  classId: number,
  teacherId: number,
  file: File,
  assignmentName: string,
  assignmentId: number
): Promise<{ success: boolean; assignmentId?: number; error?: string }> {
  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('teacherId', String(teacherId));
  formData.append('assignmentName', assignmentName);
  formData.append('assignmentId', String(assignmentId));
  const res = await fetch(`${API_BASE}/api/classes/${classId}/assignments/pdf`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error || 'Upload failed' };
  return { success: true, assignmentId: data.assignmentId };
}

export async function createAssignment(
  classId: number,
  teacherId: number,
  assignmentName: string,
  dueDate: string,
  description?: string,
  aiParams?: string,
  questionTypes?: string[],
  maxPoints?: number,
  allowedSubmissions?: number,
  attemptScoringPolicy?: 'latest' | 'highest' | 'average',
  assignmentType?: string,
  pdfSummary?: string | null
): Promise<{ success: boolean; assignmentId?: number; error?: string }> {
  const res = await fetch(`${API_BASE}/api/classes/${classId}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teacherId,
      assignmentName,
      dueDate,
      description: description || '',
      aiParams: aiParams ?? null,
      questionTypes: questionTypes?.length ? questionTypes.join(',') : null,
      type: assignmentType ?? null,
      maxPoints: typeof maxPoints === 'number' ? maxPoints : 100,
      allowedSubmissions: typeof allowedSubmissions === 'number' ? allowedSubmissions : 1,
      attemptScoringPolicy: attemptScoringPolicy ?? 'latest',
      pdfSummary: pdfSummary ?? null,
    }),
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error || 'Failed to create assignment' };
  return { success: true, assignmentId: data.assignment?.assignment_id };
}

export async function updateAssignment(
  classId: number,
  assignmentId: number,
  payload: {
    teacherId: number;
    assignmentName: string;
    description?: string;
    dueDate?: string;
    aiParams?: string;
    maxPoints?: number;
    allowedSubmissions?: number;
    attemptScoringPolicy?: 'latest' | 'highest' | 'average';
  }
): Promise<{ success: boolean; assignment?: any; error?: string }> {
  const res = await fetch(`${API_BASE}/api/classes/${classId}/assignments/${assignmentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data?.success) return { success: false, error: data?.error || 'Failed to update assignment' };
  return { success: true, assignment: data.assignment };
}

export type SavedQuestionPayload = {
  questionText: string;
  questionType?: 'multiple_choice' | 'select_all_that_apply' | 'true_false' | 'short_answer' | string;
  maxPoints?: number;
  correctAnswer?: string;
  correctAnswers?: string[];
  falseAnswers: string[];
};

export async function saveAssignmentQuestions(
  classId: number,
  assignmentId: number,
  questions: SavedQuestionPayload[],
  options?: {
    assignmentMaxPoints?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(
    `${API_BASE}/api/classes/${classId}/assignments/${assignmentId}/questions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questions,
        assignmentMaxPoints: options?.assignmentMaxPoints,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error || 'Failed to save questions' };
  return { success: true };
}

export interface AssignmentQuestionPreview {
  questionId: number;
  sortOrder: number;
  questionText: string;
  questionType?: string;
  maxPoints?: number;
  options: { optionText: string; isCorrect: number }[];
}

export async function fetchAssignmentQuestions(
  classId: number,
  assignmentId: number
): Promise<AssignmentQuestionPreview[]> {
  const res = await fetch(
    `${API_BASE}/api/classes/${classId}/assignments/${assignmentId}/questions`
  );
  if (!res.ok) throw new Error('Failed to fetch questions');
  const data = await res.json();
  return data.questions ?? [];
}

export async function deleteAssignment(
  classId: number,
  assignmentId: number
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(
    `${API_BASE}/api/classes/${classId}/assignments/${assignmentId}`,
    { method: 'DELETE' }
  );
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error || 'Failed to delete' };
  return { success: true };
}

export interface AssignmentStudentGrade {
  studentId: number;
  firstName: string;
  lastName: string;
  submitted: boolean;
  pointsEarned: number | null;
  percentage: number | null;
  letterGrade: string | null;
  submissionDate: string | null;
  understandingScore?: number | null;
  aiDependencyScore?: number | null;
}

export interface AssignmentGradeSummary {
  assignmentId: number;
  assignmentName: string;
  description?: string | null;
  aiParams?: string | null;
  type: string | null;
  maxPoints: number;
  dueDate: string | null;
  allowedSubmissions?: number;
  attemptScoringPolicy?: 'latest' | 'highest' | 'average' | string | null;
  averages?: {
    accuracy: number | null;
    understanding: number | null;
    aiDependency: number | null;
  };
  students: AssignmentStudentGrade[];
}

export type AdminFetchOptions = { adminToken?: string };

export async function fetchClassGrades(
  classId: number,
  options?: AdminFetchOptions
): Promise<AssignmentGradeSummary[]> {
  const path = options?.adminToken
    ? `${API_BASE}/api/admin/classes/${classId}/grades`
    : `${API_BASE}/api/classes/${classId}/grades`;
  const headers: HeadersInit = {};
  if (options?.adminToken) headers.Authorization = `Bearer ${options.adminToken}`;
  const res = await fetch(path, { headers });
  if (!res.ok) throw new Error('Failed to fetch grades');
  const data = await res.json();
  return data.assignments ?? [];
}

export interface ClassMetricStudentSummary {
  studentId: number;
  firstName: string;
  lastName: string;
  username: string;
  currentWeek: {
    accuracy: number | null;
    aiDependency: number | null;
    understanding: number | null;
  };
}

export interface StudentMetricHistoryPoint {
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  accuracy: number | null;
  aiDependency: number | null;
  understanding: number | null;
}

export interface StudentMetricHistoryPayload {
  student: {
    studentId: number;
    firstName: string;
    lastName: string;
    username: string;
  };
  history: StudentMetricHistoryPoint[];
}

export async function fetchClassMetricStudents(
  classId: number,
  options?: AdminFetchOptions
): Promise<ClassMetricStudentSummary[]> {
  const path = options?.adminToken
    ? `${API_BASE}/api/admin/classes/${classId}/metrics/students`
    : `${API_BASE}/api/classes/${classId}/metrics/students`;
  const headers: HeadersInit = {};
  if (options?.adminToken) headers.Authorization = `Bearer ${options.adminToken}`;
  const res = await fetch(path, { headers });
  const data = await res.json();
  if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to fetch metrics');
  return data.students ?? [];
}

export async function fetchStudentMetricHistory(
  classId: number,
  studentId: number,
  options?: AdminFetchOptions
): Promise<StudentMetricHistoryPayload> {
  const path = options?.adminToken
    ? `${API_BASE}/api/admin/classes/${classId}/metrics/students/${studentId}`
    : `${API_BASE}/api/classes/${classId}/metrics/students/${studentId}`;
  const headers: HeadersInit = {};
  if (options?.adminToken) headers.Authorization = `Bearer ${options.adminToken}`;
  const res = await fetch(path, { headers });
  const data = await res.json();
  if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to fetch student metrics');
  return { student: data.student, history: data.history ?? [] };
}

export interface ClassMetricWeekAverage {
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  accuracy: number | null;
  aiDependency: number | null;
  understanding: number | null;
}

export interface ClassMetricAveragesPayload {
  weekly: ClassMetricWeekAverage[];
  currentAverages: {
    accuracy: number | null;
    aiDependency: number | null;
    understanding: number | null;
  } | null;
  currentWeek: {
    weekNumber: number;
    weekStartDate: string;
    weekEndDate: string;
  } | null;
}

export async function fetchClassMetricAverages(
  classId: number,
  options?: AdminFetchOptions
): Promise<ClassMetricAveragesPayload> {
  const path = options?.adminToken
    ? `${API_BASE}/api/admin/classes/${classId}/metrics/class-averages`
    : `${API_BASE}/api/classes/${classId}/metrics/class-averages`;
  const headers: HeadersInit = {};
  if (options?.adminToken) headers.Authorization = `Bearer ${options.adminToken}`;
  const res = await fetch(path, { headers });
  const data = await res.json();
  if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to fetch class metric averages');
  return {
    weekly: data.weekly ?? [],
    currentAverages: data.currentAverages ?? null,
    currentWeek: data.currentWeek ?? null,
  };
}

export interface AdminLoginResponse {
  success: boolean;
  role: 'admin';
  userId: number;
  userName: string;
  token: string;
  error?: string;
}

export async function adminLogin(username: string, password: string): Promise<AdminLoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  let data: AdminLoginResponse;
  try {
    data = (await res.json()) as AdminLoginResponse;
  } catch {
    throw new Error(
      `Could not reach the API (HTTP ${res.status}). Is the backend running on port 3001?`
    );
  }
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Admin login failed.');
  }
  return data;
}

export interface AdminClassRow {
  class_id: number;
  class_code: string;
  class_name: string;
  period: string | null;
  semester: string | null;
  room_number: string | null;
  subject_code: string;
  subject_description: string | null;
  teacher_id: number;
  teacher_first_name: string;
  teacher_last_name: string;
}

export async function fetchAdminAllClasses(token: string): Promise<AdminClassRow[]> {
  const res = await fetch(`${API_BASE}/api/admin/classes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to fetch classes');
  return data.classes ?? [];
}

export interface AdminCreateTeacherPayload {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  /** YYYY-MM-DD */
  dateOfBirth: string;
}

export interface AdminCreateTeacherResponse {
  success: boolean;
  teacherId: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  dateOfBirth: string;
  error?: string;
}

export async function createAdminTeacher(
  token: string,
  payload: AdminCreateTeacherPayload
): Promise<Omit<AdminCreateTeacherResponse, 'success' | 'error'>> {
  const res = await fetch(`${API_BASE}/api/admin/teachers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as AdminCreateTeacherResponse;
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to create teacher');
  }
  const { teacherId, firstName, lastName, email, username, dateOfBirth } = data;
  return { teacherId, firstName, lastName, email, username, dateOfBirth };
}

export interface AdminFilterOptions {
  subjectCodes: string[];
  semesters: string[];
  periods: string[];
  teachers: { teacherId: number; firstName: string; lastName: string }[];
}

export interface AdminGlobalMetricsFilters {
  subjectCodes: string[];
  semesters: string[];
  periods: string[];
  teacherIds: number[];
}

function appendMulti(params: URLSearchParams, key: string, values: readonly (string | number)[]): void {
  for (const v of values) params.append(key, String(v));
}

export async function fetchAdminFilterOptions(
  token: string,
  filters?: AdminGlobalMetricsFilters
): Promise<AdminFilterOptions> {
  const params = new URLSearchParams();
  if (filters) {
    appendMulti(params, 'subjectCodes', filters.subjectCodes);
    appendMulti(params, 'semesters', filters.semesters);
    appendMulti(params, 'periods', filters.periods);
    appendMulti(params, 'teacherIds', filters.teacherIds);
  }
  const q = params.toString();
  const res = await fetch(`${API_BASE}/api/admin/filter-options${q ? `?${q}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to fetch filter options');
  return {
    subjectCodes: data.subjectCodes ?? [],
    semesters: data.semesters ?? [],
    periods: data.periods ?? [],
    teachers: data.teachers ?? [],
  };
}

export async function fetchAdminGlobalMetrics(
  token: string,
  filters?: AdminGlobalMetricsFilters
): Promise<ClassMetricAveragesPayload> {
  const params = new URLSearchParams();
  if (filters) {
    appendMulti(params, 'subjectCodes', filters.subjectCodes);
    appendMulti(params, 'semesters', filters.semesters);
    appendMulti(params, 'periods', filters.periods);
    appendMulti(params, 'teacherIds', filters.teacherIds);
  }
  const q = params.toString();
  const res = await fetch(`${API_BASE}/api/admin/metrics/global${q ? `?${q}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to fetch global metrics');
  return {
    weekly: data.weekly ?? [],
    currentAverages: data.currentAverages ?? null,
    currentWeek: data.currentWeek ?? null,
  };
}

export interface StudentAssignmentQuestion {
  questionId: number;
  sortOrder: number;
  questionText: string;
  questionType: string;
  options: Array<{ optionId: number; optionText: string }>;
}

export interface StudentAssignmentPayload {
  success: boolean;
  assignment: {
    assignmentId: number;
    classId: number;
    assignmentName: string;
    description: string | null;
    type: string | null;
    maxPoints: number;
    dueDate: string | null;
    allowedSubmissions: number;
    attemptScoringPolicy?: 'latest' | 'highest' | 'average';
    attemptScoringPolicyLabel?: string;
    aiInstructions: string | null;
    pdfSummary: string | null;
  };
  questions: StudentAssignmentQuestion[];
  submission: {
    attemptsUsed: number;
    attemptsRemaining: number;
    canSubmit: boolean;
    attempts?: Array<{
      attemptNumber: number;
      pointsEarned: number | null;
      percentage: number | null;
      letterGrade: string | null;
      submissionDate: string | null;
      isKept: boolean;
    }>;
  };
  grade: {
    pointsEarned: number | null;
    percentage: number | null;
    letterGrade: string | null;
    submissionDate: string | null;
    gradedDate: string | null;
    understandingScore?: number | null;
    aiDependencyScore?: number | null;
    engagementScore?: number | null;
  } | null;
  error?: string;
}

export async function fetchStudentAssignment(
  classId: number,
  assignmentId: number,
  token: string
): Promise<StudentAssignmentPayload> {
  const res = await fetch(`${API_BASE}/api/student/assignments/${classId}/${assignmentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as StudentAssignmentPayload;
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to load assignment');
  }
  return data;
}

export async function submitStudentAssignment(
  classId: number,
  assignmentId: number,
  token: string,
  answers: Array<{ questionId: number; selectedOptionIds?: number[]; responseText?: string }>
): Promise<{
  success: boolean;
  submission: { attemptNumber: number; attemptsRemaining: number };
  grade: { pointsEarned: number | null; percentage: number | null; letterGrade: string | null; understandingScore?: number | null; aiDependencyScore?: number | null; engagementScore?: number | null };
  questionResults?: Array<{ questionId: number; isCorrect: number | null }>;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/api/student/assignments/${classId}/${assignmentId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ answers }),
  });
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to submit assignment');
  }
  return data;
}
