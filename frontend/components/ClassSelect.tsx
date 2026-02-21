import React, { useState, useEffect, useCallback } from 'react';
import { UserRole, ClassSummary } from '../types';
import { fetchStudentClasses, fetchTeacherClasses, enrollStudentByClassCode } from '../services/api';
import { COLORS } from '../constants';
import { BookOpen } from './Icons';

interface ClassSelectProps {
  role: UserRole;
  userId: number;
  onSelectClass: (cls: ClassSummary) => void;
}

const ClassSelect: React.FC<ClassSelectProps> = ({ role, userId, onSelectClass }) => {
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addClassOpen, setAddClassOpen] = useState(false);
  const [addClassCode, setAddClassCode] = useState('');
  const [addClassError, setAddClassError] = useState('');
  const [addClassSubmitting, setAddClassSubmitting] = useState(false);

  const loadClasses = useCallback(async () => {
    try {
      const list = role === UserRole.STUDENT
        ? await fetchStudentClasses(userId)
        : await fetchTeacherClasses(userId);
      setClasses(list);
    } catch (e) {
      setError('Could not load classes. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [role, userId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const load = async () => {
      try {
        const list = role === UserRole.STUDENT
          ? await fetchStudentClasses(userId)
          : await fetchTeacherClasses(userId);
        if (!cancelled) setClasses(list);
      } catch (e) {
        if (!cancelled) setError('Could not load classes. Make sure the backend is running.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [role, userId]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddClassError('');
    if (!addClassCode.trim()) {
      setAddClassError('Enter a class code.');
      return;
    }
    setAddClassSubmitting(true);
    const result = await enrollStudentByClassCode(userId, addClassCode);
    setAddClassSubmitting(false);
    if (result.success) {
      setAddClassOpen(false);
      setAddClassCode('');
      loadClasses();
    } else {
      setAddClassError(result.error || 'Could not add class.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <p className="text-gray-500 font-medium">Loading your classes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-center">
        <p className="text-red-700 font-medium">{error}</p>
      </div>
    );
  }

  const title = role === UserRole.STUDENT ? 'My Classes' : 'Classes I Teach';
  const subtitle = role === UserRole.STUDENT
    ? 'Select a class to view assignments and roadmap'
    : 'Select a class to manage assignments and view students';

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-4xl font-bold text-black">{title}</h2>
          <p className="text-xl text-gray-600">{subtitle}</p>
        </div>
        {role === UserRole.STUDENT && (
          <button
            type="button"
            onClick={() => { setAddClassOpen(true); setAddClassError(''); setAddClassCode(''); }}
            className="px-5 py-2.5 rounded-xl font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            Add class
          </button>
        )}
      </div>

      {addClassOpen && role === UserRole.STUDENT && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setAddClassOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-black">Add class with code</h3>
            <form onSubmit={handleAddClass} className="space-y-4">
              <input
                type="text"
                value={addClassCode}
                onChange={(e) => setAddClassCode(e.target.value.toUpperCase())}
                placeholder="e.g. JX5H921E"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200 text-black font-mono uppercase"
                maxLength={20}
                autoFocus
              />
              {addClassError && <p className="text-red-600 text-sm font-medium">{addClassError}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setAddClassOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={addClassSubmitting} className="px-4 py-2 rounded-xl font-medium text-white disabled:opacity-50" style={{ backgroundColor: COLORS.primary }}>
                  {addClassSubmitting ? 'Adding…' : 'Add class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {classes.length === 0 ? (
        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-10 text-center">
          <p className="text-gray-600 font-medium">No classes found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <button
              key={cls.class_id}
              type="button"
              onClick={() => onSelectClass(cls)}
              className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all text-left group flex flex-col h-full"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-red-400 group-hover:bg-red-50 transition-all mb-4" style={{ backgroundColor: COLORS.secondary }}>
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-black group-hover:text-red-500 transition-colors mb-1">
                {cls.class_name}
              </h3>
              <p className="text-gray-600 text-sm font-medium">{cls.subject_code}</p>
              {cls.period && <p className="text-gray-500 text-sm mt-1">{cls.period}</p>}
              {cls.semester && <p className="text-gray-500 text-sm">{cls.semester}</p>}
              {role === UserRole.STUDENT && cls.teacher_first_name != null && (
                <p className="text-gray-500 text-sm mt-2">
                  {cls.teacher_first_name} {cls.teacher_last_name}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassSelect;
