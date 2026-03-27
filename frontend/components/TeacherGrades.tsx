import React, { useState, useEffect, useMemo } from 'react';
import { fetchClassGrades, fetchAssignmentQuestions, updateAssignment, type AssignmentGradeSummary, type AssignmentQuestionPreview } from '../services/api';
import { ChevronDown } from './Icons';
import AssignmentQuestionsEditorModal from './AssignmentQuestionsEditorModal';

interface TeacherGradesProps {
  classId: number;
  teacherId: number;
}

const TeacherGrades: React.FC<TeacherGradesProps> = ({ classId, teacherId }) => {
  const ASSIGNMENTS_PER_PAGE = 6;
  const [assignments, setAssignments] = useState<AssignmentGradeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState('all');
  const [dueDateSort, setDueDateSort] = useState<'none' | 'latest' | 'oldest'>('none');
  const [animationTick, setAnimationTick] = useState(0);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<{
    assignmentName: string;
    maxPoints: number;
    student: AssignmentGradeSummary['students'][number];
  } | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentGradeSummary | null>(null);
  const [editAssignmentName, setEditAssignmentName] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNoDueDate, setEditNoDueDate] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editAiParams, setEditAiParams] = useState('');
  const [editAllowedSubmissions, setEditAllowedSubmissions] = useState('1');
  const [editScoringPolicy, setEditScoringPolicy] = useState<'latest' | 'highest' | 'average'>('latest');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editQuestionsPreview, setEditQuestionsPreview] = useState<AssignmentQuestionPreview[]>([]);
  const [editQuestionsLoading, setEditQuestionsLoading] = useState(false);
  const [editQuestionsModalOpen, setEditQuestionsModalOpen] = useState(false);

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

  const assignmentTypes = useMemo(() => {
    const set = new Set<string>();
    for (const a of assignments) {
      if (a.type && a.type.trim()) set.add(a.type.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    const search = assignmentSearch.trim().toLowerCase();
    const filtered = assignments.filter((a) => {
      const typeOk =
        assignmentTypeFilter === 'all' ||
        (a.type || 'Assignment').toLowerCase() === assignmentTypeFilter.toLowerCase();
      const searchOk =
        !search ||
        a.assignmentName.toLowerCase().includes(search) ||
        (a.type || 'assignment').toLowerCase().includes(search);
      return typeOk && searchOk;
    });
    if (dueDateSort === 'none') return filtered;
    return [...filtered].sort((a, b) => {
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : null;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : null;
      if (aDate == null && bDate == null) return 0;
      if (aDate == null) return 1;
      if (bDate == null) return -1;
      return dueDateSort === 'latest' ? bDate - aDate : aDate - bDate;
    });
  }, [assignments, assignmentSearch, assignmentTypeFilter, dueDateSort]);

  const totalAssignmentPages = Math.max(1, Math.ceil(filteredAssignments.length / ASSIGNMENTS_PER_PAGE));
  const paginatedAssignments = filteredAssignments.slice(
    (assignmentPage - 1) * ASSIGNMENTS_PER_PAGE,
    assignmentPage * ASSIGNMENTS_PER_PAGE
  );

  useEffect(() => {
    setAssignmentPage(1);
  }, [classId, assignmentSearch, assignmentTypeFilter, dueDateSort]);

  useEffect(() => {
    setAnimationTick((v) => v + 1);
  }, [assignmentSearch, assignmentTypeFilter, dueDateSort, assignmentPage]);

  useEffect(() => {
    if (assignmentPage > totalAssignmentPages) {
      setAssignmentPage(totalAssignmentPages);
    }
  }, [assignmentPage, totalAssignmentPages]);

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
  const fmtPercent = (value: number | null | undefined) => (value == null ? '--' : `${Math.round(value)}%`);
  const toDateTimeLocal = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const tzOffsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
  };

  const openEditAssignmentModal = (assignment: AssignmentGradeSummary) => {
    setEditingAssignment(assignment);
    setEditQuestionsPreview([]);
    setEditQuestionsModalOpen(false);
    setEditAssignmentName(assignment.assignmentName);
    setEditDueDate(toDateTimeLocal(assignment.dueDate));
    setEditNoDueDate(!assignment.dueDate);
    setEditDescription(assignment.description || '');
    setEditAiParams(assignment.aiParams || '');
    setEditAllowedSubmissions(String(assignment.allowedSubmissions ?? 1));
    const policy = assignment.attemptScoringPolicy;
    setEditScoringPolicy(
      policy === 'highest' || policy === 'average' ? policy : 'latest'
    );
    setEditError('');
  };

  const handleSaveAssignmentEdit = async () => {
    if (!editingAssignment) return;
    const allowed = Number(editAllowedSubmissions);
    if (!editAssignmentName.trim()) {
      setEditError('Assignment name is required.');
      return;
    }
    if (!editNoDueDate && !editDueDate.trim()) {
      setEditError('Due date is required unless No due date is checked.');
      return;
    }
    if (!Number.isInteger(allowed) || allowed < 1 || allowed > 10) {
      setEditError('Allowed submissions must be between 1 and 10.');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      const res = await updateAssignment(classId, editingAssignment.assignmentId, {
        teacherId,
        assignmentName: editAssignmentName.trim(),
        description: editDescription,
        dueDate: editNoDueDate ? '' : editDueDate,
        aiParams: editAiParams,
        maxPoints: Number(editingAssignment.maxPoints ?? 100),
        allowedSubmissions: allowed,
        attemptScoringPolicy: allowed > 1 ? editScoringPolicy : 'latest',
        allowPartialShortAnswer: Boolean(editingAssignment.allowPartialShortAnswer),
        allowPartialSelectAllThatApply: Boolean(editingAssignment.allowPartialSelectAllThatApply),
      });
      if (!res.success) {
        setEditError(res.error || 'Failed to update assignment.');
        return;
      }
      const refreshed = await fetchClassGrades(classId);
      setAssignments(refreshed);
      setEditingAssignment(null);
    } catch {
      setEditError('Failed to update assignment.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleOpenEditQuestions = async () => {
    if (!editingAssignment) return;
    setEditQuestionsLoading(true);
    setEditError('');
    try {
      const questions = await fetchAssignmentQuestions(classId, editingAssignment.assignmentId);
      setEditQuestionsPreview(questions);
      setEditQuestionsModalOpen(true);
    } catch {
      setEditError('Failed to load assignment questions.');
    } finally {
      setEditQuestionsLoading(false);
    }
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
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={assignmentSearch}
          onChange={(e) => setAssignmentSearch(e.target.value)}
          placeholder="Search for assignment..."
          className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700"
        />
        <select
          value={assignmentTypeFilter}
          onChange={(e) => setAssignmentTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700"
        >
          <option value="all">All types</option>
          {assignmentTypes.map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={dueDateSort}
          onChange={(e) => setDueDateSort(e.target.value as 'none' | 'latest' | 'oldest')}
          className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700"
        >
          <option value="none">Sort: Default</option>
          <option value="latest">Due Date: Latest to Oldest</option>
          <option value="oldest">Due Date: Oldest to Latest</option>
        </select>
      </div>

      {filteredAssignments.length === 0 ? (
        <p className="text-gray-400 italic">No assignments yet.</p>
      ) : (
        <div className="space-y-3">
          {paginatedAssignments.map((a) => {
            const isOpen = openIds.has(a.assignmentId);
            const submittedCount = a.students.filter((s) => s.submitted).length;
            const totalStudents = a.students.length;

            return (
              <div
                key={`${a.assignmentId}-${animationTick}`}
                className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-fadeIn transition-all duration-300"
              >
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
                      <>
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
                              <tr
                                key={s.studentId}
                                className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer"
                                onClick={() => setSelectedStudentDetail({ assignmentName: a.assignmentName, maxPoints: a.maxPoints, student: s })}
                              >
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
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                            Avg Accuracy: {fmtPercent(a.averages?.accuracy)}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700 font-medium">
                            Avg Understanding: {fmtPercent(a.averages?.understanding)}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-50 text-red-700 font-medium">
                            Avg AI Dependency: {fmtPercent(a.averages?.aiDependency)}
                          </span>
                          <button
                            type="button"
                            onClick={() => openEditAssignmentModal(a)}
                            className="ml-auto inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium hover:bg-gray-200"
                          >
                            Edit assignment
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {totalAssignmentPages > 1 && (
            <div className="pt-2 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Page {assignmentPage} of {totalAssignmentPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAssignmentPage((p) => Math.max(1, p - 1))}
                  disabled={assignmentPage === 1}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentPage((p) => Math.min(totalAssignmentPages, p + 1))}
                  disabled={assignmentPage === totalAssignmentPages}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedStudentDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedStudentDetail(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-black">
                  {selectedStudentDetail.student.firstName} {selectedStudentDetail.student.lastName}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{selectedStudentDetail.assignmentName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                x
              </button>
            </div>

            {!selectedStudentDetail.student.submitted ? (
              <p className="text-sm text-gray-600">This student has not submitted this assignment yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <p className="text-gray-500">Grade</p>
                  <p className="font-semibold text-black">{selectedStudentDetail.student.letterGrade ?? '--'}</p>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <p className="text-gray-500">Accuracy</p>
                  <p className="font-semibold text-black">
                    {selectedStudentDetail.student.pointsEarned != null
                      ? `${selectedStudentDetail.student.pointsEarned}/${selectedStudentDetail.maxPoints} (${fmtPercent(selectedStudentDetail.student.percentage)})`
                      : '--'}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <p className="text-gray-500">Understanding</p>
                  <p className="font-semibold text-black">{fmtPercent(selectedStudentDetail.student.understandingScore)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <p className="text-gray-500">AI Dependency</p>
                  <p className="font-semibold text-black">{fmtPercent(selectedStudentDetail.student.aiDependencyScore)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 sm:col-span-2">
                  <p className="text-gray-500">Submitted On</p>
                  <p className="font-semibold text-black">{formatDate(selectedStudentDetail.student.submissionDate)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {editingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !editSaving && setEditingAssignment(null)}>
          <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-black">Edit assignment</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignment name</label>
                <input value={editAssignmentName} onChange={(e) => setEditAssignmentName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-20" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Due date</label>
                <input type="datetime-local" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} disabled={editNoDueDate} className="px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" checked={editNoDueDate} onChange={(e) => setEditNoDueDate(e.target.checked)} />
                  No due date
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allowed submissions</label>
                <input type="number" min={1} max={10} value={editAllowedSubmissions} onChange={(e) => setEditAllowedSubmissions(e.target.value)} className="w-24 px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              {Number(editAllowedSubmissions) > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Score to save across attempts</label>
                  <select value={editScoringPolicy} onChange={(e) => setEditScoringPolicy(e.target.value as 'latest' | 'highest' | 'average')} className="px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="latest">Most Recent</option>
                    <option value="highest">Highest</option>
                    <option value="average">Average</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AI instructions</label>
                <textarea value={editAiParams} onChange={(e) => setEditAiParams(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-20" />
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div className="flex justify-between gap-2">
                <button
                  type="button"
                  onClick={handleOpenEditQuestions}
                  disabled={editSaving || editQuestionsLoading}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
                >
                  {editQuestionsLoading ? 'Loading...' : 'Edit questions'}
                </button>
                <div className="flex gap-2">
                <button type="button" onClick={() => setEditingAssignment(null)} disabled={editSaving} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700">Cancel</button>
                <button type="button" onClick={handleSaveAssignmentEdit} disabled={editSaving} className="px-4 py-2 rounded-lg bg-gray-900 text-white">{editSaving ? 'Saving...' : 'Save changes'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {editingAssignment && editQuestionsModalOpen && (
        <AssignmentQuestionsEditorModal
          classId={classId}
          assignmentId={editingAssignment.assignmentId}
          assignmentName={editingAssignment.assignmentName}
          assignmentMaxPoints={editingAssignment.maxPoints}
          allowPartialShortAnswer={Boolean(editingAssignment.allowPartialShortAnswer)}
          allowPartialSelectAllThatApply={Boolean(editingAssignment.allowPartialSelectAllThatApply)}
          directions={editingAssignment.description}
          questionsPreview={editQuestionsPreview}
          onClose={() => {
            setEditQuestionsPreview([]);
            setEditQuestionsModalOpen(false);
          }}
          onSaved={async () => {
            const refreshed = await fetchClassGrades(classId);
            setAssignments(refreshed);
            setEditQuestionsPreview([]);
            setEditQuestionsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default TeacherGrades;
