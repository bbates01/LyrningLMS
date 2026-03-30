import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../services/api';

type StudentRow = {
  student_id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
};

interface AddStudentToClassCardProps {
  classId: number;
  onStudentAdded?: () => void;
}

const AddStudentToClassCard: React.FC<AddStudentToClassCardProps> = ({ classId, onStudentAdded }) => {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedUsername, setSelectedUsername] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const loadStudents = async () => {
    const [allRes, enrolledRes] = await Promise.all([
      fetch(`${API_BASE}/api/auth/students`),
      fetch(`${API_BASE}/api/classes/${classId}/students`),
    ]);
    const allData = await allRes.json();
    const enrolledData = await enrolledRes.json();
    if (!allRes.ok || !allData?.success) throw new Error(allData?.error || 'Failed to load students');
    if (!enrolledRes.ok || !enrolledData?.success) throw new Error(enrolledData?.error || 'Failed to load class students');
    setAllStudents((allData.students ?? []).map((s: any) => ({ ...s, student_id: Number(s.student_id) })));
    setEnrolledStudents((enrolledData.students ?? []).map((s: any) => ({ ...s, student_id: Number(s.student_id) })));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    loadStudents()
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load students');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [classId]);

  const allStudentsSorted = useMemo(
    () => [...allStudents].sort((a, b) => a.username.localeCompare(b.username)),
    [allStudents]
  );
  const enrolledUsernames = useMemo(
    () => new Set(enrolledStudents.map((s) => s.username.toLowerCase())),
    [enrolledStudents]
  );

  const resetNewStudentForm = () => {
    setFirstName('');
    setLastName('');
    setUsername('');
    setPassword('');
    setEmail('');
    setDateOfBirth('');
  };

  const handleAddExisting = async () => {
    if (!selectedUsername) {
      setError('Choose an existing username first.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/classes/${classId}/students/add-existing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: selectedUsername }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setError(data?.error || 'Failed to add existing student');
        return;
      }
      setMessage(`Added @${data.student.username} to this class.`);
      setSelectedUsername('');
      await loadStudents();
      onStudentAdded?.();
    } catch {
      setError('Connection error while adding existing student.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!firstName.trim() || !lastName.trim() || !username.trim() || !password.trim()) {
      setError('First name, last name, username, and password are required.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/classes/${classId}/students/add-new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.trim(),
          password,
          email: email.trim() || undefined,
          dateOfBirth: dateOfBirth.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setError(data?.error || 'Failed to create student');
        return;
      }
      setMessage(`Created and added @${data.student.username} to this class.`);
      resetNewStudentForm();
      await loadStudents();
      onStudentAdded?.();
    } catch {
      setError('Connection error while creating student.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-bold text-black">Add student to class</h3>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode('existing')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode === 'existing' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Existing student
          </button>
          <button
            type="button"
            onClick={() => setMode('new')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode === 'new' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Add new student
          </button>
        </div>

        {mode === 'existing' ? (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">Choose existing username</label>
            <select
              value={selectedUsername}
              onChange={(e) => setSelectedUsername(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white"
            >
              <option value="">Select a student...</option>
              {allStudentsSorted.map((s) => (
                <option key={s.student_id} value={s.username}>
                  @{s.username} — {s.first_name} {s.last_name}{enrolledUsernames.has(s.username.toLowerCase()) ? ' (already in class)' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddExisting}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-white font-semibold disabled:opacity-50"
              style={{ backgroundColor: '#ba3638' }}
            >
              Add to class
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="px-3 py-2 border border-gray-200 rounded-xl" />
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="px-3 py-2 border border-gray-200 rounded-xl" />
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username (must be unique)" className="px-3 py-2 border border-gray-200 rounded-xl" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="px-3 py-2 border border-gray-200 rounded-xl" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="px-3 py-2 border border-gray-200 rounded-xl sm:col-span-2" />
            <input value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} placeholder="Date of birth YYYY-MM-DD (optional)" className="px-3 py-2 border border-gray-200 rounded-xl sm:col-span-2" />
            <button
              type="button"
              onClick={handleCreateAndAdd}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-white font-semibold disabled:opacity-50 sm:col-span-2"
              style={{ backgroundColor: '#ba3638' }}
            >
              Create student and add to class
            </button>
          </div>
        )}

        {message && <p className="text-sm font-medium text-green-700">{message}</p>}
        {error && <p className="text-sm font-medium text-red-700">{error}</p>}
      </div>
    </div>
  );
};

export default AddStudentToClassCard;
