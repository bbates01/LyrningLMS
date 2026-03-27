import React, { useState, useEffect } from 'react';
import { ClassSummary } from '../types';
import { fetchTeacherClasses, createTeacherClass } from '../services/api';
import { COLORS } from '../constants';
import { BookOpen } from './Icons';

interface ClassSelectProps {
  userId: number;
  onSelectClass: (cls: ClassSummary) => void;
  onClassCreated?: (cls: ClassSummary) => void;
}

const ClassSelect: React.FC<ClassSelectProps> = ({ userId, onSelectClass, onClassCreated }) => {
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [classNameInput, setClassNameInput] = useState('');
  const [subjectCodeInput, setSubjectCodeInput] = useState('');
  const [semesterInput, setSemesterInput] = useState('');
  const [periodInput, setPeriodInput] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [classCodeInput, setClassCodeInput] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const load = async () => {
      try {
        const list = await fetchTeacherClasses(userId);
        if (!cancelled) setClasses(list);
      } catch (e) {
        if (!cancelled) setError('Could not load classes. Make sure the backend is running.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const resetCreateForm = () => {
    setClassNameInput('');
    setSubjectCodeInput('');
    setSemesterInput('');
    setPeriodInput('');
    setRoomInput('');
    setClassCodeInput('');
    setCreateError('');
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    const className = classNameInput.trim();
    const subjectCode = subjectCodeInput.trim().toUpperCase();
    if (!className || !subjectCode) {
      setCreateError('Class name and subject code are required.');
      return;
    }
    setIsCreating(true);
    try {
      const result = await createTeacherClass(userId, {
        className,
        subjectCode,
        semester: semesterInput.trim() || undefined,
        period: periodInput.trim() || undefined,
        roomNumber: roomInput.trim() || undefined,
        classCode: classCodeInput.trim().toUpperCase() || undefined,
      });
      if (!result.success || !result.class) {
        setCreateError(result.error || 'Failed to create class.');
        return;
      }
      const createdClass = result.class as ClassSummary;
      setClasses((prev) => [createdClass, ...prev]);
      setShowCreateModal(false);
      resetCreateForm();
      if (onClassCreated) onClassCreated(createdClass);
      else onSelectClass(createdClass);
    } catch {
      setCreateError('Failed to create class.');
    } finally {
      setIsCreating(false);
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
      <div className="rounded-2xl bg-[#ba3638]/10 border border-[#ba3638]/20 p-6 text-center">
        <p className="font-medium" style={{ color: '#ba3638' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-4xl font-bold text-black">Your Classes</h2>
          <button
            type="button"
            onClick={() => {
              setShowCreateModal(true);
              setCreateError('');
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            + Add class
          </button>
        </div>
        <p className="text-xl text-gray-600">Select a class to manage assignments</p>
      </div>

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
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all mb-4 group-hover:bg-[#ba3638]/10" style={{ backgroundColor: COLORS.secondary, color: COLORS.primary }}>
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-black transition-colors mb-1 group-hover:text-[#ba3638]">
                {cls.class_name}
              </h3>
              <p className="text-gray-600 text-sm font-medium">{cls.subject_code}</p>
              {cls.period && <p className="text-gray-500 text-sm mt-1">{cls.period}</p>}
              {cls.semester && <p className="text-gray-500 text-sm">{cls.semester}</p>}
            </button>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (!isCreating) {
              setShowCreateModal(false);
              resetCreateForm();
            }
          }}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="text-xl font-bold text-black">Add class</h3>
              <button
                type="button"
                onClick={() => {
                  if (!isCreating) {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                x
              </button>
            </div>
            <form onSubmit={handleCreateClass} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class name *</label>
                <input
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  placeholder="Biology 101 - Period 2"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject code *</label>
                  <input
                    value={subjectCodeInput}
                    onChange={(e) => setSubjectCodeInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="BIO101"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class code (optional)</label>
                  <input
                    value={classCodeInput}
                    onChange={(e) => setClassCodeInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="Auto-generated if blank"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                  <input
                    value={semesterInput}
                    onChange={(e) => setSemesterInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="Fall 2026"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                  <input
                    value={periodInput}
                    onChange={(e) => setPeriodInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="2nd"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                  <input
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="B-204"
                  />
                </div>
              </div>
              {createError && (
                <p className="text-sm text-red-600">{createError}</p>
              )}
              <div className="pt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  disabled={isCreating}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#ba3638] hover:opacity-90 disabled:opacity-60"
                >
                  {isCreating ? 'Creating...' : 'Create class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassSelect;
