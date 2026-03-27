import React from 'react';
import {
  ArrowRight,
} from './Icons';
import { Assignment } from '../types';
import { type AssignmentQuestionPreview } from '../services/api';
import AssignmentQuestionsEditorModal from './AssignmentQuestionsEditorModal';

interface AssignmentViewProps {
  assignment: Assignment;
  classId: number;
  onViewAsStudent: () => void;
  onSaveAssignment: (updates: {
    assignmentName: string;
    description: string;
    dueDate: string;
    noDueDate: boolean;
    aiParams: string;
    maxPoints: number;
    allowedSubmissions: number;
    attemptScoringPolicy: 'latest' | 'highest' | 'average';
    allowPartialShortAnswer: boolean;
    allowPartialSelectAllThatApply: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  questionsPreview?: AssignmentQuestionPreview[];
  onQuestionsUpdated?: () => Promise<void> | void;
}

function studentLoginUrl(classId: number, assignmentId: string | number): string {
  return `${typeof window !== 'undefined' ? window.location.origin : ''}/student/login?class=${classId}&assignment=${assignmentId}`;
}

function CopyStudentLinkButton({ classId, assignmentId }: { classId: number; assignmentId: string }) {
  const [copied, setCopied] = React.useState(false);
  const fullUrl = studentLoginUrl(classId, assignmentId);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = fullUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`p-2 rounded-lg shrink-0 ${copied ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:bg-gray-100'}`}
      title={copied ? 'Copied!' : 'Copy student link'}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    </button>
  );
}

const AssignmentView: React.FC<AssignmentViewProps> = ({
  assignment,
  classId,
  onViewAsStudent,
  onSaveAssignment,
  questionsPreview = [],
  onQuestionsUpdated,
}) => {
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showEditQuestionsModal, setShowEditQuestionsModal] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');
  const [editName, setEditName] = React.useState(assignment.title);
  const [editDescription, setEditDescription] = React.useState(assignment.description || '');
  const [editDueDate, setEditDueDate] = React.useState(
    assignment.dueDateRaw ? new Date(assignment.dueDateRaw).toISOString().slice(0, 16) : ''
  );
  const [noDueDate, setNoDueDate] = React.useState(!assignment.dueDateRaw);
  const [editAiParams, setEditAiParams] = React.useState(assignment.aiInstructions || '');
  const [editAllowedSubmissions, setEditAllowedSubmissions] = React.useState(String(assignment.allowedSubmissions ?? 1));
  const [editPolicy, setEditPolicy] = React.useState<'latest' | 'highest' | 'average'>(
    assignment.attemptScoringPolicy || 'latest'
  );
  const [allowPartialShortAnswer, setAllowPartialShortAnswer] = React.useState(Boolean(assignment.allowPartialShortAnswer));
  const [allowPartialSelectAllThatApply, setAllowPartialSelectAllThatApply] = React.useState(Boolean(assignment.allowPartialSelectAllThatApply));

  React.useEffect(() => {
    setEditName(assignment.title);
    setEditDescription(assignment.description || '');
    setEditDueDate(assignment.dueDateRaw ? new Date(assignment.dueDateRaw).toISOString().slice(0, 16) : '');
    setNoDueDate(!assignment.dueDateRaw);
    setEditAiParams(assignment.aiInstructions || '');
    setEditAllowedSubmissions(String(assignment.allowedSubmissions ?? 1));
    setEditPolicy(assignment.attemptScoringPolicy || 'latest');
    setAllowPartialShortAnswer(Boolean(assignment.allowPartialShortAnswer));
    setAllowPartialSelectAllThatApply(Boolean(assignment.allowPartialSelectAllThatApply));
  }, [assignment]);

  const handleSave = async () => {
    setSaveError('');
    const allowed = Number(editAllowedSubmissions);
    if (!editName.trim()) {
      setSaveError('Assignment name is required.');
      return;
    }
    if (!noDueDate && !editDueDate.trim()) {
      setSaveError('Due date is required unless No due date is checked.');
      return;
    }
    if (!Number.isInteger(allowed) || allowed < 1 || allowed > 10) {
      setSaveError('Allowed submissions must be between 1 and 10.');
      return;
    }
    setSaving(true);
    const res = await onSaveAssignment({
      assignmentName: editName.trim(),
      description: editDescription,
      dueDate: editDueDate,
      noDueDate,
      aiParams: editAiParams,
      maxPoints: Number(assignment.maxPoints ?? 100),
      allowedSubmissions: allowed,
      attemptScoringPolicy: allowed > 1 ? editPolicy : 'latest',
      allowPartialShortAnswer,
      allowPartialSelectAllThatApply,
    });
    setSaving(false);
    if (!res.success) {
      setSaveError(res.error || 'Failed to save assignment.');
      return;
    }
    setShowEditModal(false);
  };
  return (
    <>
    <div className="flex flex-col gap-4 lg:gap-6 h-[calc(100dvh-160px)] lg:h-[calc(100dvh-220px)] overflow-hidden">
      {/* Header with title and actions */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-black break-words">{assignment.title}</h2>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Share with students:</span>
            <CopyStudentLinkButton classId={classId} assignmentId={assignment.id} />
          </div>
          <button
            onClick={onViewAsStudent}
            className="px-5 py-2.5 rounded-2xl font-bold text-sm text-white hover:opacity-90 transition-colors"
            style={{ backgroundColor: '#ba3638' }}
          >
            View as Student
          </button>
          <button
            type="button"
            onClick={() => {
              setSaveError('');
              setShowEditModal(true);
            }}
            className="px-4 py-2.5 rounded-2xl font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Assignment Content */}
      <div className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-8 lg:p-10 shadow-sm relative flex flex-col min-h-[45dvh] lg:min-h-0 overflow-hidden flex-1">
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {questionsPreview.length > 0 ? (
            <div className="space-y-8">
              {questionsPreview.map((q, idx) => (
                <div key={q.questionId || idx} className="space-y-3">
                  <p className="font-semibold text-black">
                    {q.sortOrder}. {q.questionText}
                    {q.questionType === 'select_all_that_apply' && (
                      <span className="ml-2 text-sm font-normal text-gray-500 italic">(Select all that apply)</span>
                    )}
                  </p>
                  <ul className="list-none space-y-2 pl-0">
                    {q.options.map((opt, oidx) => (
                      <li key={oidx} className="text-gray-700">
                        <span className={opt.isCorrect ? 'font-medium text-green-700' : ''}>
                          {String.fromCharCode(65 + oidx)}. {opt.optionText}
                          {opt.isCorrect ? ' (Correct)' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="prose max-w-none text-black leading-relaxed whitespace-pre-wrap font-medium">
              {assignment.content || 'No questions for this assignment yet.'}
            </div>
          )}
        </div>

        <div className="mt-6 sm:mt-8 flex items-center gap-4 pt-6 border-t border-gray-100">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Submit Answers Here"
              className="w-full bg-gray-50 border border-gray-300 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-[#ba3638]/30 transition-all text-black font-semibold"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition-colors">
              <ArrowRight className="w-5 h-5 text-black" />
            </button>
          </div>
        </div>
      </div>
    </div>
    {showEditModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setShowEditModal(false)}>
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-200 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-bold text-black">Edit assignment</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignment name</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-20" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Due date</label>
              <input type="datetime-local" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} disabled={noDueDate} className="px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100" />
              <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={noDueDate} onChange={(e) => setNoDueDate(e.target.checked)} />
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
                <select
                  value={editPolicy}
                  onChange={(e) => setEditPolicy(e.target.value as 'latest' | 'highest' | 'average')}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
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
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            <div className="flex justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowEditQuestionsModal(true)}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Edit questions
              </button>
              <div className="flex gap-2">
              <button type="button" onClick={() => setShowEditModal(false)} disabled={saving} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700">Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-gray-900 text-white">{saving ? 'Saving...' : 'Save changes'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    {showEditQuestionsModal && (
      <AssignmentQuestionsEditorModal
        classId={classId}
        assignmentId={Number(assignment.id)}
        assignmentName={assignment.title}
        assignmentMaxPoints={Number(assignment.maxPoints ?? 100)}
        allowPartialShortAnswer={Boolean(assignment.allowPartialShortAnswer)}
        allowPartialSelectAllThatApply={Boolean(assignment.allowPartialSelectAllThatApply)}
        directions={assignment.description}
        questionsPreview={questionsPreview}
        onClose={() => setShowEditQuestionsModal(false)}
        onSaved={async () => {
          await onQuestionsUpdated?.();
        }}
      />
    )}
  </>
  );
};

export default AssignmentView;
