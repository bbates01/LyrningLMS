import React, { useEffect, useMemo, useState } from 'react';

type GeneratedRow = { studentId: number; password: string };
type ExistingStudent = {
  student_id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
};

const STORAGE_KEY = 'lyrning_student_passwords';

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

function parseStudentIdsPreview(input: string): number[] {
  const ids = input
    .split(/[\s,;\n\r\t]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
  return Array.from(new Set(ids));
}

const StudentPasswordsCard: React.FC = () => {
  const [studentIdsText, setStudentIdsText] = useState('');
  const [rows, setRows] = useState<GeneratedRow[]>([]);
  const [missingIds, setMissingIds] = useState<number[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingStudents, setExistingStudents] = useState<ExistingStudent[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existingError, setExistingError] = useState<string>('');
  const [savedStudentIds, setSavedStudentIds] = useState<number[]>([]);

  const parsedIds = useMemo(() => parseStudentIdsPreview(studentIdsText), [studentIdsText]);

  // Load previously-saved plaintext passwords from localStorage on first render.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        studentIdsText?: string;
        rows?: GeneratedRow[];
        missingIds?: number[];
        savedStudentIds?: number[];
      };
      if (typeof data.studentIdsText === 'string') setStudentIdsText(data.studentIdsText);
      if (Array.isArray(data.rows)) setRows(data.rows);
      if (Array.isArray(data.missingIds)) setMissingIds(data.missingIds);
      if (Array.isArray(data.savedStudentIds)) setSavedStudentIds(data.savedStudentIds);
    } catch {
      // ignore bad data
    }
  }, []);

  // Persist current state to localStorage whenever it changes so it's still
  // available after refresh on this device.
  useEffect(() => {
    try {
      const payload = JSON.stringify({ studentIdsText, rows, missingIds, savedStudentIds });
      window.localStorage.setItem(STORAGE_KEY, payload);
    } catch {
      // ignore storage errors
    }
  }, [studentIdsText, rows, missingIds, savedStudentIds]);

  // Load existing students once so the teacher can see what already exists.
  useEffect(() => {
    setExistingError('');
    setLoadingExisting(true);
    fetch(`${API_BASE}/api/auth/students`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data?.success) {
          setExistingError(data?.error || 'Failed to load students');
          return;
        }
        setExistingStudents((data.students as ExistingStudent[]) ?? []);
      })
      .catch(() => {
        setExistingError('Connection error. Make sure the backend server is running.');
      })
      .finally(() => {
        setLoadingExisting(false);
      });
  }, []);

  const handleGenerate = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/students/passwords/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIdsText, passwordLength: 10 }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setError(data?.error || 'Failed to generate passwords');
        return;
      }
      setRows((data.generated as GeneratedRow[]) ?? []);
      setMissingIds((data.missingIds as number[]) ?? []);
    } catch {
      setError('Connection error. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/students/passwords/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: rows }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setError(data?.error || 'Failed to save passwords');
        return;
      }
      setMissingIds((data.missingIds as number[]) ?? []);
      // Track which students have had passwords saved (for this browser).
      const justSavedIds = rows.map((r) => r.studentId);
      setSavedStudentIds((prev) => Array.from(new Set([...prev, ...justSavedIds])));
    } catch {
      setError('Connection error. Make sure the backend server is running.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-black">Existing students</h3>
          <p className="text-xs text-gray-600">
            Use this table to check <span className="font-medium">student_id</span>, name, and username before creating new passwords so you don&apos;t duplicate a student.
          </p>
          <div className="border border-gray-100 rounded-2xl bg-gray-50 max-h-64 overflow-auto">
            <div className="grid grid-cols-6 px-4 py-2 text-[11px] font-semibold text-gray-600 bg-gray-100 border-b border-gray-200">
              <div>ID</div>
              <div className="col-span-2">Name</div>
              <div>Username</div>
              <div className="col-span-2">Email</div>
            </div>
            {loadingExisting ? (
              <div className="px-4 py-3 text-xs text-gray-500">Loading students…</div>
            ) : existingStudents.length === 0 ? (
              <div className="px-4 py-3 text-xs text-gray-500">No students found in the database.</div>
            ) : (
              <div className="divide-y divide-gray-100 text-xs">
                {existingStudents.map((s) => (
                  <div key={s.student_id} className="grid grid-cols-6 px-4 py-2">
                    <div className="font-semibold text-gray-900">{s.student_id}</div>
                    <div className="col-span-2 text-gray-900">
                      {s.first_name} {s.last_name}
                    </div>
                    <div className="text-gray-700">{s.username}</div>
                    <div className="col-span-2 text-gray-600 truncate">{s.email}</div>
                  </div>
                ))}
              </div>
            )}
            {existingError && (
              <div className="px-4 py-2 text-xs font-medium" style={{ color: '#ba3638' }}>
                {existingError}
              </div>
            )}
          </div>

          {savedStudentIds.length > 0 && (
            <p className="text-xs text-gray-600">
              <span className="font-semibold">Passwords already generated & saved for IDs:</span>{' '}
              {savedStudentIds.sort((a, b) => a - b).join(', ')}
            </p>
          )}
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-black">Student passwords</h3>
            <p className="text-sm text-gray-600 mt-1">
              Paste a list of <span className="font-medium">student_id</span> values to generate passwords. You can edit them before saving.
            </p>
          </div>
          <div className="shrink-0 text-xs text-gray-500">
            Parsed IDs: <span className="font-semibold text-gray-800">{parsedIds.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Student IDs</label>
            <textarea
              value={studentIdsText}
              onChange={(e) => setStudentIdsText(e.target.value)}
              rows={8}
              placeholder={'Example:\n1\n2\n3'}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ba3638]/30 focus:border-[#ba3638] bg-gray-50"
              disabled={loading || saving}
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || saving}
              className="px-4 py-2 rounded-xl text-white font-semibold disabled:opacity-50"
              style={{ backgroundColor: '#ba3638' }}
            >
              {loading ? 'Generating…' : 'Generate passwords'}
            </button>
          </div>

          <div className="lg:col-span-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-700">Generated / editable passwords</label>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading || rows.length === 0}
                className="px-4 py-2 rounded-xl border border-gray-200 font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            {rows.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-xl p-6 text-sm text-gray-500 bg-gray-50">
                Generate passwords to see them here.
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-5 bg-gray-50 text-xs font-semibold text-gray-600 px-4 py-2">
                  <div className="col-span-2">Student ID</div>
                  <div className="col-span-3">Password (edit before saving)</div>
                </div>
                <div className="divide-y divide-gray-100 max-h-[320px] overflow-auto">
                  {rows.map((r, idx) => (
                    <div key={r.studentId} className="grid grid-cols-5 items-center px-4 py-3">
                      <div className="col-span-2 font-semibold text-gray-900">{r.studentId}</div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={r.password}
                          onChange={(e) => {
                            const next = e.target.value;
                            setRows((prev) => prev.map((p, i) => (i === idx ? { ...p, password: next } : p)));
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ba3638]/30 focus:border-[#ba3638]"
                          disabled={saving || loading}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {missingIds.length > 0 && (
              <div className="text-xs text-gray-600">
                <span className="font-semibold">Missing student IDs (not found in DB):</span> {missingIds.join(', ')}
              </div>
            )}

            {error && (
              <div className="text-sm font-medium" style={{ color: '#ba3638' }}>
                {error}
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Note: passwords are stored as <span className="font-medium">bcrypt hashes</span>. You can only view plaintext passwords right after generating/editing here.
        </p>
      </div>
    </div>
  );
};

export default StudentPasswordsCard;

