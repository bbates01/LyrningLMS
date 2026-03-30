import React, { useState } from 'react';
import TeacherMetrics from './TeacherMetrics';
import TeacherGrades from './TeacherGrades';

interface AdminClassDetailProps {
  classId: number;
  adminToken: string;
}

const AdminClassDetail: React.FC<AdminClassDetailProps> = ({ classId, adminToken }) => {
  const [tab, setTab] = useState<'metrics' | 'grades'>('metrics');

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setTab('metrics')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'metrics' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Metrics
        </button>
        <button
          type="button"
          onClick={() => setTab('grades')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'grades' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Grades
        </button>
      </div>
      <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        Read-only view. Assignment and student management is disabled for administrators.
      </p>

      {tab === 'metrics' && <TeacherMetrics classId={classId} adminToken={adminToken} />}
      {tab === 'grades' && <TeacherGrades classId={classId} teacherId={0} adminToken={adminToken} />}
    </div>
  );
};

export default AdminClassDetail;
