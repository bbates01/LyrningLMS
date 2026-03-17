const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

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

export async function fetchClassDetails(classId: number): Promise<any> {
  const res = await fetch(`${API_BASE}/api/classes/${classId}`);
  if (!res.ok) throw new Error('Failed to fetch class');
  return res.json();
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
  description?: string,
  aiParams?: string,
  questionTypes?: string[]
): Promise<{ success: boolean; assignmentId?: number; error?: string }> {
  const res = await fetch(`${API_BASE}/api/classes/${classId}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teacherId,
      assignmentName,
      description: description || '',
      aiParams: aiParams ?? null,
      questionTypes: questionTypes?.length ? questionTypes.join(',') : null,
    }),
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error || 'Failed to create assignment' };
  return { success: true, assignmentId: data.assignment?.assignment_id };
}

export type SavedQuestionPayload = {
  questionText: string;
  questionType?: 'multiple_choice' | 'select_all_that_apply' | 'true_false' | 'short_answer' | string;
  correctAnswer?: string;
  correctAnswers?: string[];
  falseAnswers: string[];
};

export async function saveAssignmentQuestions(
  classId: number,
  assignmentId: number,
  questions: SavedQuestionPayload[]
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(
    `${API_BASE}/api/classes/${classId}/assignments/${assignmentId}/questions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions }),
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
