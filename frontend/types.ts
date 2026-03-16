
export enum UserRole {
  TEACHER = 'TEACHER',
}

export type ViewState =
  | 'LOGIN'
  | 'CLASS_SELECT'
  | 'CLASS_INFO'
  | 'ASSIGNMENT_LIST'
  | 'ASSIGNMENT_EDIT'
  | 'ASSIGNMENT_VIEW'
  | 'ASSIGNMENT_CREATE_SUCCESS';

/** Class/course from API (teacher's taught classes) */
export interface ClassSummary {
  class_id: number;
  class_code?: string;
  class_name: string;
  period: string | null;
  semester: string | null;
  room_number: string | null;
  subject_code: string;
  subject_description?: string | null;
  teacher_first_name?: string;
  teacher_last_name?: string;
}

export interface Student {
  id: string | number;
  name: string;
  course?: string;
  period?: string;
  avatar?: string;
  email?: string;
  currentGPA?: number;
  assignments?: any[];
}

export interface UserSession {
  role: UserRole;
  userId?: number;
  userName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  type: 'Homework' | 'Quiz' | 'Exam' | 'Project' | 'Lab' | string;
  dueDate: string;
  score?: string;
  content?: string;
  aiInstructions?: string;
  materials?: string[];
  assignmentLink?: string;
}

export interface MetricData {
  week: number;
  value: number;
}

export interface StudentStats {
  understanding: number;
  dependency: number;
  engagement: number;
  history: {
    understanding: MetricData[];
    dependency: MetricData[];
    engagement: MetricData[];
  }
}
