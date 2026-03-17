import React, { useMemo, useState } from 'react';

/**
 * Student login page (UI only). Reads class= and assignment= from query params for later use.
 * No auth logic yet.
 */
const StudentLogin: React.FC = () => {
  const [classId, assignmentId] = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return [params.get('class') ?? '', params.get('assignment') ?? ''];
  }, []);

  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Student sign in</h1>
          <p className="text-gray-600 mt-1">Enter your details to open the assignment</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ba3638]/30 focus:border-[#ba3638]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Student ID or email"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ba3638]/30 focus:border-[#ba3638]"
            />
          </div>
          <button
            type="button"
            className="w-full py-3 rounded-xl font-semibold text-white transition-colors"
            style={{ backgroundColor: '#ba3638' }}
          >
            Sign in
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
