const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

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

export async function fetchClassGrades(classId: number): Promise<AssignmentGradeSummary[]> {
  const res = await fetch(`${API_BASE}/api/classes/${classId}/grades`);
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

export async function fetchClassMetricStudents(classId: number): Promise<ClassMetricStudentSummary[]> {
  const res = await fetch(`${API_BASE}/api/classes/${classId}/metrics/students`);
  const data = await res.json();
  if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to fetch metrics');
  return data.students ?? [];
}

export async function fetchStudentMetricHistory(
  classId: number,
  studentId: number
): Promise<StudentMetricHistoryPayload> {
  const res = await fetch(`${API_BASE}/api/classes/${classId}/metrics/students/${studentId}`);
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

export async function fetchClassMetricAverages(classId: number): Promise<ClassMetricAveragesPayload> {
  const res = await fetch(`${API_BASE}/api/classes/${classId}/metrics/class-averages`);
  const data = await res.json();
  if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to fetch class metric averages');
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
