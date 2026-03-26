import React, { useState, useEffect } from 'react';
import { fetchClassGrades, type AssignmentGradeSummary } from '../services/api';
import { ChevronDown } from './Icons';

interface TeacherGradesProps {
  classId: number;
}

const TeacherGrades: React.FC<TeacherGradesProps> = ({ classId }) => {
  const [assignments, setAssignments] = useState<AssignmentGradeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchClassGrades(classId)
      .then((data) => {
        if (!cancelled) setAssignments(data);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load grades.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [classId]);

  const toggle = (id: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#ba3638] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-center py-10">{error}</p>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-4xl font-bold text-black">Grades</h2>

      {assignments.length === 0 ? (
        <p className="text-gray-400 italic">No assignments yet.</p>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const isOpen = openIds.has(a.assignmentId);
            const submittedCount = a.students.filter((s) => s.submitted).length;
            const totalStudents = a.students.length;

            return (
              <div key={a.assignmentId} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Accordion header */}
                <button
                  type="button"
                  onClick={() => toggle(a.assignmentId)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-black truncate">{a.assignmentName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {a.type || 'Assignment'} &middot; {a.maxPoints} pts
                      {a.dueDate && <> &middot; Due: {formatDate(a.dueDate)}</>}
                      {' '}&middot; {submittedCount}/{totalStudents} submitted
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-3 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Accordion body */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-5 pb-4">
                    {a.students.length === 0 ? (
                      <p className="text-gray-400 text-sm italic py-3">No students enrolled.</p>
                    ) : (
                      <table className="w-full text-sm mt-2">
                        <thead>
                          <tr className="text-left text-gray-500 border-b border-gray-100">
                            <th className="py-2 pr-4 font-medium">Student</th>
                            <th className="py-2 pr-4 font-medium">Submitted</th>
                            <th className="py-2 pr-4 font-medium">Grade</th>
                            <th className="py-2 pr-4 font-medium">Score</th>
                            <th className="py-2 font-medium">Submitted On</th>
                          </tr>
                        </thead>
                        <tbody>
                          {a.students.map((s) => (
                            <tr key={s.studentId} className="border-b border-gray-50 last:border-0">
                              <td className="py-2.5 pr-4 text-gray-900">
                                {s.lastName}, {s.firstName}
                              </td>
                              <td className="py-2.5 pr-4">
                                {s.submitted ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                    No
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 pr-4 text-gray-900 font-medium">
                                {s.letterGrade ?? '--'}
                              </td>
                              <td className="py-2.5 pr-4 text-gray-700">
                                {s.pointsEarned != null
                                  ? `${s.pointsEarned}/${a.maxPoints} (${Math.round(s.percentage ?? 0)}%)`
                                  : '--'}
                              </td>
                              <td className="py-2.5 text-gray-500">
                                {formatDate(s.submissionDate)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeacherGrades;
