import React, { useState } from 'react';
import { UserRole, UserSession } from '../types';
import { adminLogin } from '../services/api';
import { COLORS } from '../constants';

interface AdminLoginProps {
  onLogin: (session: UserSession) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await adminLogin(username.trim(), password);
      const session: UserSession = {
        role: UserRole.ADMIN,
        userId: data.userId,
        userName: data.userName,
        adminToken: data.token,
      };
      try {
        window.localStorage.setItem('lyrning_session', JSON.stringify(session));
      } catch {
        // ignore
      }
      window.history.replaceState({}, '', '/');
      onLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <img src="/img/tall-logo.png" alt="Lyrning" className="h-24 w-auto object-contain mb-4" />
          <p className="text-gray-600 font-semibold">Administrator</p>
          <p className="text-xs text-gray-500 mt-1 text-center">Read-only analytics across all classes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-[#ba3638]/30 text-gray-900 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-[#ba3638]/30 text-gray-900 disabled:opacity-50"
            />
          </div>
          {error && <p className="text-sm text-center font-medium" style={{ color: '#ba3638' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
            style={{ backgroundColor: COLORS.primary }}
          >
            {loading ? 'Signing in…' : 'Sign in as admin'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-gray-400">
          <a href="/" className="text-gray-500 hover:text-gray-700 underline">
            Teacher login
          </a>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
