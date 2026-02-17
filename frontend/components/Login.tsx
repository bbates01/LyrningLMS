
import React, { useState } from 'react';
import { UserRole, UserSession } from '../types';
import { COLORS, MOCK_STUDENTS } from '../constants';
import { Send } from './Icons';

interface LoginProps {
  onLogin: (session: UserSession) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'teacher' && password === 'teacher123') {
      onLogin({ role: UserRole.TEACHER });
    } else if (username === 'student' && password === 'student123') {
      onLogin({ 
        role: UserRole.STUDENT, 
        studentData: MOCK_STUDENTS[0] // Default to first mock student
      });
    } else {
      setError('Invalid credentials. Hint: teacher/teacher123 or student/student123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc] p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 border border-gray-100">
        <div className="flex flex-col items-center mb-10">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" 
            style={{ backgroundColor: COLORS.primary }}
          >
            <svg viewBox="0 0 24 24" fill="black" className="w-10 h-10">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Lyrning</h1>
          <p className="text-gray-500 mt-2">Welcome back to your classroom</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900"
              placeholder="e.g. teacher or student"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

          <button 
            type="submit"
            className="w-full py-4 text-black font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all transform hover:scale-[1.01]"
            style={{ backgroundColor: COLORS.primary }}
          >
            Log In
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-50 text-center">
          <p className="text-xs text-gray-400">
            Forgot your password? Please contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
