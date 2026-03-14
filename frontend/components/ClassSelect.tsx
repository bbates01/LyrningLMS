import React, { useState, useEffect } from 'react';
import { ClassSummary } from '../types';
import { fetchTeacherClasses } from '../services/api';
import { COLORS } from '../constants';
import { BookOpen } from './Icons';

interface ClassSelectProps {
  userId: number;
  onSelectClass: (cls: ClassSummary) => void;
}

const ClassSelect: React.FC<ClassSelectProps> = ({ userId, onSelectClass }) => {
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        <h2 className="text-4xl font-bold text-black">Classes I Teach</h2>
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
    </div>
  );
};

export default ClassSelect;
