const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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

export async function fetchClassAssignments(classId: number): Promise<any[]> {
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
