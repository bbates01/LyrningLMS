
import React, { useState } from 'react';
import { UserRole, UserSession } from '../types';
import { COLORS } from '../constants';
import { Send } from './Icons';

interface LoginProps {
  onLogin: (session: UserSession) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'student' | 'teacher'>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          userType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const session: UserSession = {
          role: userType === 'teacher' ? UserRole.TEACHER : UserRole.STUDENT,
          userId: data.userId,
          userName: data.userName,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
        };

        if (userType === 'student') {
          session.studentData = {
            id: data.userId,
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            currentGPA: 0,
            assignments: [],
          };
        }

        onLogin(session);
      } else {
        setError(data.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Make sure the backend server is running on port 4000.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">Login as</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUserType('student')}
                className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
                  userType === 'student'
                    ? 'bg-red-100 text-gray-900 border-2 border-gray-900'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setUserType('teacher')}
                className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
                  userType === 'teacher'
                    ? 'bg-red-100 text-gray-900 border-2 border-gray-900'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                }`}
              >
                Teacher
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900 disabled:opacity-50"
              placeholder="Enter your username"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900 disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 text-black font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: COLORS.primary }}
          >
            {loading ? 'Logging in...' : 'Log In'}
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
