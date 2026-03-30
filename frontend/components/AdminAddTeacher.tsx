import React, { useMemo, useState } from 'react';
import { COLORS } from '../constants';
import { createAdminTeacher } from '../services/api';

interface AdminAddTeacherProps {
  adminToken: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

const AdminAddTeacher: React.FC<AdminAddTeacherProps> = ({ adminToken }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(''); // YYYY-MM-DD

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!firstName.trim() || !lastName.trim()) return false;
    if (!isValidEmail(email)) return false;
    if (username.trim().length < 3) return false;
    if (password.length < 6) return false;
    if (!dateOfBirth) return false;
    return true;
  }, [firstName, lastName, email, username, password, dateOfBirth]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await createAdminTeacher(adminToken, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        username: username.trim(),
        password,
        dateOfBirth,
      });
      setSuccess(`Teacher created: ${res.username} (${res.firstName} ${res.lastName})`);
      setFirstName('');
      setLastName('');
      setEmail('');
      setUsername('');
      setPassword('');
      setDateOfBirth('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create teacher.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Add teacher login</h2>
        <p className="text-sm text-slate-600 mt-1">
          Creates a new teacher account in the database. Username and email must be unique.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">First name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Last name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Must be unique.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date of birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              required
            />
          </div>

          {error && <p className="text-sm font-medium" style={{ color: COLORS.primary }}>{error}</p>}
          {success && <p className="text-sm font-medium text-green-700">{success}</p>}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: COLORS.primary }}
          >
            {loading ? 'Creating…' : 'Create teacher'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminAddTeacher;

