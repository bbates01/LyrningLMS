import React, { useMemo, useState } from 'react';
import { studentLoginWithUsername } from '../services/api';

const STUDENT_SESSION_KEY = 'lyrning_student_session';

/**
 * Student login page (student-only).
 * Authenticates using student_id + password, then shows a temporary success screen.
 */
const StudentLogin: React.FC = () => {
  const [classId, assignmentId] = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return [params.get('class') ?? '', params.get('assignment') ?? ''];
  }, []);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await studentLoginWithUsername(username, password);
      window.localStorage.setItem(
        STUDENT_SESSION_KEY,
        JSON.stringify({
          token: data.token,
          userId: data.userId,
          firstName: data.firstName,
          lastName: data.lastName,
        })
      );

      if (!classId || !assignmentId) {
        setError('Assignment link is incomplete. Ask your teacher for a valid link.');
        return;
      }

      window.location.href = `/student/assignment/${classId}/${assignmentId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection error. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Student sign in</h1>
          <p className="text-gray-600 mt-1">Enter your details to open the assignment</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. student_123"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ba3638]/30 focus:border-[#ba3638]"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ba3638]/30 focus:border-[#ba3638]"
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-sm text-center font-medium" style={{ color: '#ba3638' }}>
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white transition-colors"
            style={{ backgroundColor: '#ba3638' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>

        {(classId || assignmentId) && (
          <p className="text-xs text-gray-500 mt-4 text-center">
            Assignment link: class={classId || '—'}, assignment={assignmentId || '—'}
          </p>
        )}
      </div>
    </div>
  );
};

export default StudentLogin;
