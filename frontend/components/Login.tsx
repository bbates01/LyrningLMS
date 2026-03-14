
import React, { useState } from 'react';
import { UserRole, UserSession } from '../types';
import { COLORS } from '../constants';

interface LoginProps {
  onLogin: (session: UserSession) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          userType: 'teacher',
        }),
      });

      const data = await response.json();

      if (data.success) {
        const session: UserSession = {
          role: UserRole.TEACHER,
          userId: data.userId,
          userName: data.userName,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
        };
        try {
          window.localStorage.setItem('lyrning_session', JSON.stringify(session));
        } catch {
          // ignore storage errors
        }
        onLogin(session);
      } else {
        setError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Connection error. Make sure the backend server is running on port 3001.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc] p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 border border-gray-100">
        <div className="flex flex-col items-center mb-10">
          <img src="/img/tall-logo.png" alt="Lyrning" className="h-24 w-auto object-contain mb-4" />
          <p className="text-gray-500 mt-0">Teacher Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-[#ba3638]/30 transition-all text-gray-900 disabled:opacity-50"
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
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-[#ba3638]/30 transition-all text-gray-900 disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-center font-medium" style={{ color: '#ba3638' }}>{error}</p>}

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
