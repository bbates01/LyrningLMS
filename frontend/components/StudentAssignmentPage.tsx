import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchStudentAssignment,
  submitStudentAssignment,
  type StudentAssignmentPayload,
} from '../services/api';
import { chatWithTutor } from '../services/aiService';

const STUDENT_SESSION_KEY = 'lyrning_student_session';

type StudentSession = {
  token: string;
  userId: number;
  firstName?: string;
  lastName?: string;
};

type AnswerState = {
  selectedOptionIds: number[];
  responseText: string;
};

interface StudentAssignmentPageProps {
  classId: number;
  assignmentId: number;
}

const StudentAssignmentPage: React.FC<StudentAssignmentPageProps> = ({ classId, assignmentId }) => {
  const [payload, setPayload] = useState<StudentAssignmentPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'tutor'; content: string }>>([]);

  const session = useMemo(() => {
    try {
      const raw = window.localStorage.getItem(STUDENT_SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as StudentSession;
    } catch {
      return null;
    }
  }, []);

  const loadAssignment = useCallback(async () => {
    if (!session?.token) {
      window.location.href = `/student/login?class=${classId}&assignment=${assignmentId}`;
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await fetchStudentAssignment(classId, assignmentId, session.token);
      setPayload(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, classId, session?.token]);

  useEffect(() => {
    loadAssignment();
  }, [loadAssignment]);

  const setSingleSelect = (questionId: number, optionId: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedOptionIds: [optionId],
        responseText: prev[questionId]?.responseText ?? '',
      },
    }));
  };

  const toggleMultiSelect = (questionId: number, optionId: number) => {
    setAnswers((prev) => {
      const current = prev[questionId]?.selectedOptionIds ?? [];
      const has = current.includes(optionId);
      return {
        ...prev,
        [questionId]: {
          selectedOptionIds: has ? current.filter((id) => id !== optionId) : [...current, optionId],
          responseText: prev[questionId]?.responseText ?? '',
        },
      };
    });
  };

  const setShortAnswer = (questionId: number, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedOptionIds: prev[questionId]?.selectedOptionIds ?? [],
        responseText: text,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!payload || !session?.token) return;
    setSubmitMessage('');
    setSubmitting(true);
    try {
      const answerPayload = payload.questions.map((q) => {
        const a = answers[q.questionId] ?? { selectedOptionIds: [], responseText: '' };
        return {
          questionId: q.questionId,
          selectedOptionIds: a.selectedOptionIds,
          responseText: a.responseText,
        };
      });

      const result = await submitStudentAssignment(classId, assignmentId, session.token, answerPayload);
      const percent = result.grade.percentage != null ? `${result.grade.percentage}%` : 'Pending';
      const points = result.grade.pointsEarned != null ? `${result.grade.pointsEarned}` : 'Pending';
      const letter = result.grade.letterGrade ?? 'Pending';
      setSubmitMessage(`Submitted. Score: ${points} pts (${percent}, ${letter}).`);
      await loadAssignment();
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <p className="text-gray-600">Loading assignment...</p>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-lg w-full bg-white border border-gray-200 rounded-2xl p-6 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Unable to open assignment</h1>
          <p className="text-gray-600">{error || 'No assignment data returned.'}</p>
        </div>
      </div>
    );
  }

  const assignment = payload.assignment;

  const handleSendTutorMessage = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;

    const nextMessages = [...chatMessages, { role: 'user' as const, content: msg }];
    setChatMessages(nextMessages);
    setChatInput('');
    setChatLoading(true);
    try {
      const reply = await chatWithTutor(
        msg,
        chatMessages.map((m) => ({ role: m.role === 'tutor' ? 'assistant' : 'user', content: m.content })),
        assignment.aiInstructions || ''
      );
      setChatMessages((prev) => [...prev, { role: 'tutor', content: reply }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-gray-900">{assignment.assignmentName}</h1>
          {assignment.description && <p className="text-gray-700 mt-2">{assignment.description}</p>}
          <div className="mt-4 text-sm text-gray-600 space-y-1">
            <p>Max points: {assignment.maxPoints}</p>
            <p>Allowed submissions: {assignment.allowedSubmissions}</p>
            <p>Attempts used: {payload.submission.attemptsUsed}</p>
            <p>Attempts remaining: {payload.submission.attemptsRemaining}</p>
          </div>
          {payload.grade && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-gray-100 text-sm text-gray-800">
              Current score: {payload.grade.pointsEarned ?? 'Pending'} pts ({payload.grade.percentage ?? 'Pending'}%, {payload.grade.letterGrade ?? 'Pending'})
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
          {payload.questions.length === 0 ? (
            <p className="text-gray-600">No questions are available for this assignment yet.</p>
          ) : (
            payload.questions.map((q) => (
              <div key={q.questionId} className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0">
                <p className="font-semibold text-gray-900 mb-3">
                  {q.sortOrder}. {q.questionText}
                </p>

                {q.questionType === 'short_answer' ? (
                  <textarea
                    value={answers[q.questionId]?.responseText ?? ''}
                    onChange={(e) => setShortAnswer(q.questionId, e.target.value)}
                    className="w-full min-h-24 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ba3638]/30"
                    placeholder="Type your response"
                    disabled={!payload.submission.canSubmit || submitting}
                  />
                ) : q.questionType === 'select_all_that_apply' ? (
                  <div className="space-y-2">
                    {q.options.map((option) => {
                      const checked = (answers[q.questionId]?.selectedOptionIds ?? []).includes(option.optionId);
                      return (
                        <label key={option.optionId} className="flex items-center gap-2 text-gray-800">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMultiSelect(q.questionId, option.optionId)}
                            disabled={!payload.submission.canSubmit || submitting}
                          />
                          <span>{option.optionText}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {q.options.map((option) => {
                      const checked = (answers[q.questionId]?.selectedOptionIds ?? []).includes(option.optionId);
                      return (
                        <label key={option.optionId} className="flex items-center gap-2 text-gray-800">
                          <input
                            type="radio"
                            name={`q-${q.questionId}`}
                            checked={checked}
                            onChange={() => setSingleSelect(q.questionId, option.optionId)}
                            disabled={!payload.submission.canSubmit || submitting}
                          />
                          <span>{option.optionText}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!payload.submission.canSubmit || submitting || payload.questions.length === 0}
            className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: '#ba3638' }}
          >
            {submitting ? 'Submitting...' : 'Submit assignment'}
          </button>

          {submitMessage && (
            <p className="text-sm text-center font-medium" style={{ color: submitMessage.toLowerCase().includes('failed') ? '#ba3638' : '#1f2937' }}>
              {submitMessage}
            </p>
          )}
        </div>
        </div>

        <aside className="bg-white border border-gray-200 rounded-2xl p-4 lg:p-5 h-fit lg:sticky lg:top-4">
          <h2 className="text-lg font-bold text-gray-900">AI Tutor</h2>
          <p className="text-xs text-gray-600 mt-1">
            The tutor follows your teacher's assignment guidelines.
          </p>

          <div className="mt-4 h-80 overflow-y-auto border border-gray-100 rounded-xl p-3 bg-gray-50 space-y-3">
            {chatMessages.length === 0 && (
              <p className="text-sm text-gray-500">Ask for hints, steps, or concept help while you work.</p>
            )}
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={`text-sm rounded-xl px-3 py-2 ${m.role === 'user' ? 'bg-[#ba3638]/10 text-gray-900 ml-6' : 'bg-white border border-gray-200 text-gray-800 mr-6'}`}
              >
                {m.content}
              </div>
            ))}
            {chatLoading && <p className="text-xs text-gray-500">Tutor is thinking...</p>}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendTutorMessage();
                }
              }}
              placeholder="Ask for help..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ba3638]/30"
              disabled={chatLoading}
            />
            <button
              type="button"
              onClick={handleSendTutorMessage}
              disabled={chatLoading || !chatInput.trim()}
              className="px-4 py-2 rounded-xl text-white disabled:opacity-50"
              style={{ backgroundColor: '#ba3638' }}
            >
              Send
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default StudentAssignmentPage;
