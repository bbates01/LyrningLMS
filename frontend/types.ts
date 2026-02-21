
export enum UserRole {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}

export type ViewState = 
  | 'LOGIN'
  | 'HOME' 
  | 'GRADES_LIST' 
  | 'STUDENT_GRADES' 
  | 'ASSIGNMENT_LIST' 
  | 'ASSIGNMENT_EDIT' 
  | 'ASSIGNMENT_VIEW' 
  | 'METRICS_LIST' 
  | 'STUDENT_METRICS';

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
  studentData?: Student;
}

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  type: 'Homework' | 'Quiz' | 'Project' | 'Lab';
  dueDate: string;
  score?: string;
  content?: string;
  aiInstructions?: string;
  materials?: string[];
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
