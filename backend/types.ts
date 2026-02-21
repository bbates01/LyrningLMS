export interface Student {
  student_id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password_hash: string;
  date_of_birth: string;
  created_at: string;
}

export interface Teacher {
  teacher_id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password_hash: string;
  date_of_birth: string;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  userType: 'student' | 'teacher';
}

export interface LoginResponse {
  success: boolean;
  role: 'student' | 'teacher';
  userId: number;
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  error?: string;
}
