import React from 'react';
import {
  ArrowRight,
} from './Icons';
import { Assignment } from '../types';
import { type AssignmentQuestionPreview } from '../services/api';

interface AssignmentViewProps {
  assignment: Assignment;
  classId: number;
  onViewAsStudent: () => void;
  questionsPreview?: AssignmentQuestionPreview[];
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

const AssignmentView: React.FC<AssignmentViewProps> = ({ assignment, classId, onViewAsStudent, questionsPreview = [] }) => {
  return (
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
  );
};

export default AssignmentView;
