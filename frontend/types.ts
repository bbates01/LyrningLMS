
export enum UserRole {
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
}

export type ViewState =
  | 'LOGIN'
  | 'CLASS_SELECT'
  | 'CLASS_INFO'
  | 'ASSIGNMENT_LIST'
  | 'ASSIGNMENT_EDIT'
  | 'ASSIGNMENT_VIEW'
  | 'VIEW_AS_STUDENT'
  | 'ASSIGNMENT_CREATE_SUCCESS'
  | 'GRADES'
  | 'METRICS'
  | 'ADMIN_CLASS_SELECT'
  | 'ADMIN_CLASS_DETAIL'
  | 'ADMIN_GLOBAL_METRICS'
  | 'ADMIN_ADD_TEACHER';

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
  /** Bearer token for /api/admin/* (role ADMIN only) */
  adminToken?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  type: 'Homework' | 'Quiz' | 'Exam' | 'Project' | 'Lab' | string;
  dueDate: string;
  dueDateRaw?: string | null;
  score?: string;
  content?: string;
  aiInstructions?: string;
  maxPoints?: number;
  allowedSubmissions?: number;
  attemptScoringPolicy?: 'latest' | 'highest' | 'average';
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
