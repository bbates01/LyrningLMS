import React, { useEffect, useMemo, useState } from 'react';

type ExistingStudent = {
  student_id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
};

interface StudentPasswordsCardProps {
  teacherUsername?: string;
}

const PASSWORDS_STORAGE_KEY = 'lyrning_student_passwords_by_id';
const LEGACY_STORAGE_KEY = 'lyrning_student_passwords';

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

function toPasswordMapFromLegacyRows(rawRows: unknown): Record<number, string> {
  if (!Array.isArray(rawRows)) return {};
  const out: Record<number, string> = {};
  for (const row of rawRows) {
    const maybeId = Number((row as { studentId?: unknown })?.studentId);
    const maybePassword = (row as { password?: unknown })?.password;
    if (Number.isFinite(maybeId) && maybeId > 0 && typeof maybePassword === 'string') {
      out[maybeId] = maybePassword;
    }
  }
  return out;
}

function findStudentByLookupToken(students: ExistingStudent[], lookupToken: string): ExistingStudent | null {
  const token = lookupToken.trim();
  if (!token) return null;

  const tokenNumber = Number(token);
  if (Number.isFinite(tokenNumber) && tokenNumber > 0) {
    const byId = students.find((s) => s.student_id === tokenNumber);
    if (byId) return byId;
  }

  const lowerToken = token.toLowerCase();
  return students.find((s) => s.username.toLowerCase() === lowerToken) ?? null;
}

const StudentPasswordsCard: React.FC<StudentPasswordsCardProps> = ({ teacherUsername }) => {
  const [studentLookup, setStudentLookup] = useState('');
  const [error, setError] = useState<string>('');
  const [existingStudents, setExistingStudents] = useState<ExistingStudent[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existingError, setExistingError] = useState<string>('');

  const [passwordsByStudentId, setPasswordsByStudentId] = useState<Record<number, string>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<ExistingStudent | null>(null);
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherAuthError, setTeacherAuthError] = useState('');
  const [teacherAuthLoading, setTeacherAuthLoading] = useState(false);
  const [authConfirmed, setAuthConfirmed] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [editedPassword, setEditedPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const selectedStudentName = useMemo(() => {
    if (!selectedStudent) return '';
    return `${selectedStudent.first_name} ${selectedStudent.last_name}`.trim();
  }, [selectedStudent]);

  const selectedStudentKnownPassword = useMemo(() => {
    if (!selectedStudent) return '';
    return passwordsByStudentId[selectedStudent.student_id] ?? '';
  }, [selectedStudent, passwordsByStudentId]);

  const resolvedLookupStudent = useMemo(
    () => findStudentByLookupToken(existingStudents, studentLookup),
    [existingStudents, studentLookup]
  );

  // Load previously-saved plaintext passwords from localStorage on first render.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PASSWORDS_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as Record<string, unknown>;
        const next: Record<number, string> = {};
        for (const [k, v] of Object.entries(data)) {
          const numericKey = Number(k);
          if (Number.isFinite(numericKey) && numericKey > 0 && typeof v === 'string') {
            next[numericKey] = v;
          }
        }
        setPasswordsByStudentId(next);
        return;
      }

      // Fallback for previously-used storage shape.
      const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!legacyRaw) return;
      const legacyData = JSON.parse(legacyRaw) as { rows?: unknown };
      setPasswordsByStudentId(toPasswordMapFromLegacyRows(legacyData.rows));
    } catch {
      // ignore bad data
    }
  }, []);

  // Persist local plaintext view so the teacher can re-open and edit current values.
  useEffect(() => {
    try {
      window.localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(passwordsByStudentId));
    } catch {
      // ignore storage errors
    }
  }, [passwordsByStudentId]);

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

  const resetModalState = () => {
    setTeacherPassword('');
    setTeacherAuthError('');
    setTeacherAuthLoading(false);
    setAuthConfirmed(false);
    setCurrentPassword('');
    setEditedPassword('');
    setShowCurrentPassword(false);
    setSavingPassword(false);
    setSaveMessage('');
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedStudent(null);
    resetModalState();
  };

  const openModalForStudent = (student: ExistingStudent) => {
    setError('');
    setSelectedStudent(student);
    setModalOpen(true);
    resetModalState();
  };

  const handleViewCredentials = () => {
    setError('');
    if (!studentLookup.trim()) {
      setError('Enter a student username or student ID first.');
      return;
    }
    if (!resolvedLookupStudent) {
      setError('No student matched that username or student ID.');
      return;
    }
    openModalForStudent(resolvedLookupStudent);
  };

  const handleConfirmTeacher = async () => {
    if (!selectedStudent) return;
    if (!teacherUsername) {
      setTeacherAuthError('Your teacher session is missing a username. Please log out and log in again.');
      return;
    }
    if (!teacherPassword) {
      setTeacherAuthError('Enter your current teacher password to continue.');
      return;
    }

    setTeacherAuthError('');
    setTeacherAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: teacherUsername,
          password: teacherPassword,
          userType: 'teacher',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setTeacherAuthError(data?.error || 'Unable to verify your password.');
        return;
      }

      const knownPassword = passwordsByStudentId[selectedStudent.student_id] ?? '';
      setCurrentPassword(knownPassword);
      setEditedPassword(knownPassword);
      setAuthConfirmed(true);
      setSaveMessage('');
    } catch {
      setTeacherAuthError('Connection error. Make sure the backend server is running.');
    } finally {
      setTeacherAuthLoading(false);
    }
  };

  const handleSavePassword = async () => {
    if (!selectedStudent) return;
    const trimmed = editedPassword.trim();
    if (!trimmed) {
      setSaveMessage('Password cannot be empty.');
      return;
    }

    setSaveMessage('');
    setSavingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/students/passwords/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{ studentId: selectedStudent.student_id, password: trimmed }],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setSaveMessage(data?.error || 'Failed to save password.');
        return;
      }

      setPasswordsByStudentId((prev) => ({
        ...prev,
        [selectedStudent.student_id]: trimmed,
      }));
      setCurrentPassword(trimmed);
      setEditedPassword(trimmed);
      setSaveMessage('Password updated successfully.');
    } catch {
      setSaveMessage('Connection error. Make sure the backend server is running.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden relative">
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-black">Existing students</h3>
          <p className="text-xs text-gray-600">
            Enter a student username (or student ID) and use View credentials to inspect or edit that student password.
          </p>

          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-auto sm:min-w-[220px] sm:max-w-[280px]">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Student ID / Username</label>
              <input
                type="text"
                value={studentLookup}
                onChange={(e) => setStudentLookup(e.target.value)}
                placeholder="e.g. jdoe12 or 42"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ba3638]/30 focus:border-[#ba3638] bg-gray-50"
                disabled={loadingExisting}
              />
            </div>
            <button
              type="button"
              onClick={handleViewCredentials}
              disabled={loadingExisting || !teacherUsername}
              className="px-4 py-2 rounded-xl text-white font-semibold disabled:opacity-50"
              style={{ backgroundColor: '#ba3638' }}
            >
              View credentials
            </button>
          </div>

          {!teacherUsername && (
            <p className="text-xs font-medium" style={{ color: '#ba3638' }}>
              Teacher username is missing from your session. Log out and back in to use credential verification.
            </p>
          )}

          <div className="border border-gray-100 rounded-2xl bg-gray-50 max-h-64 overflow-auto">
            <div className="grid grid-cols-6 px-4 py-2 text-[11px] font-semibold text-gray-600 bg-gray-100 border-b border-gray-200">
              <div className="col-span-2">Name</div>
              <div>Username</div>
              <div className="col-span-2">Email</div>
              <div className="text-right">Action</div>
            </div>
            {loadingExisting ? (
              <div className="px-4 py-3 text-xs text-gray-500">Loading students...</div>
            ) : existingStudents.length === 0 ? (
              <div className="px-4 py-3 text-xs text-gray-500">No students found in the database.</div>
            ) : (
              <div className="divide-y divide-gray-100 text-xs">
                {existingStudents.map((s) => (
                  <div key={s.student_id} className="grid grid-cols-6 px-4 py-2 items-center gap-2">
                    <div className="col-span-2 text-gray-900">
                      {s.first_name} {s.last_name}
                    </div>
                    <div className="text-gray-700">{s.username}</div>
                    <div className="col-span-2 text-gray-600 truncate">{s.email}</div>
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => openModalForStudent(s)}
                        disabled={!teacherUsername}
                        className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-800 hover:bg-gray-100 disabled:opacity-50"
                      >
                        View credentials
                      </button>
                    </div>
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
        </div>

        {error && (
          <div className="text-sm font-medium" style={{ color: '#ba3638' }}>
            {error}
          </div>
        )}

        <p className="text-xs text-gray-500">
          Note: passwords are stored as <span className="font-medium">bcrypt hashes</span>. This view can only show plaintext passwords previously generated or saved from this browser session.
        </p>
      </div>

      {modalOpen && selectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-bold text-black">Student credentials</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedStudentName} ({selectedStudent.username})
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                x
              </button>
            </div>

            {!authConfirmed ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  Confirm it is you by entering your current teacher session password.
                </p>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Your password</label>
                  <input
                    type="password"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ba3638]/30 focus:border-[#ba3638]"
                    disabled={teacherAuthLoading}
                  />
                </div>
                {teacherAuthError && (
                  <p className="text-sm font-medium" style={{ color: '#ba3638' }}>
                    {teacherAuthError}
                  </p>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleConfirmTeacher}
                    disabled={teacherAuthLoading}
                    className="px-4 py-2 rounded-xl text-white font-semibold disabled:opacity-50"
                    style={{ backgroundColor: '#ba3638' }}
                  >
                    {teacherAuthLoading ? 'Verifying...' : 'Confirm'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Current password</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={currentPassword || 'No local plaintext password available'}
                      className={`flex-1 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 ${
                        !showCurrentPassword && currentPassword ? 'blur-sm select-none' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      disabled={!currentPassword}
                      className="px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    >
                      {showCurrentPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Edit password</label>
                  <input
                    type="text"
                    value={editedPassword}
                    onChange={(e) => setEditedPassword(e.target.value)}
                    placeholder={selectedStudentKnownPassword ? '' : 'Enter a new password'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ba3638]/30 focus:border-[#ba3638]"
                    disabled={savingPassword}
                  />
                </div>

                {saveMessage && (
                  <p
                    className="text-sm font-medium"
                    style={{ color: saveMessage.includes('successfully') ? '#1f7a1f' : '#ba3638' }}
                  >
                    {saveMessage}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSavePassword}
                    disabled={savingPassword}
                    className="px-4 py-2 rounded-xl text-white font-semibold disabled:opacity-50"
                    style={{ backgroundColor: '#ba3638' }}
                  >
                    {savingPassword ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPasswordsCard;

