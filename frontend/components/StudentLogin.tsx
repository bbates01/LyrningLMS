import React, { useMemo, useState } from 'react';

/**
 * Student login page (student-only).
 * Authenticates using student_id + password, then shows a temporary success screen.
 */
const StudentLogin: React.FC = () => {
  const [classId, assignmentId] = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return [params.get('class') ?? '', params.get('assignment') ?? ''];
  }, []);

  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const API_BASE =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:3001' : '');

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/student/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, password }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setError(data?.error || 'Login failed. Check your Student ID and password.');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Connection error. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Signed in</h1>
            <p className="text-gray-600">
              Success. Next step (opening the assignment) will be wired up later.
            </p>
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
              Assignment link params: class={classId || '—'}, assignment={assignmentId || '—'}
            </div>
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className="w-full py-3 rounded-xl font-semibold text-white transition-colors"
              style={{ backgroundColor: '#ba3638' }}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Student sign in</h1>
          <p className="text-gray-600 mt-1">Enter your details to open the assignment</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Student ID (number)"
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
