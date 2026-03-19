import React, { useState } from 'react';
import { chatWithTutor } from '../services/aiService';
import { Assignment } from '../types';
import { type AssignmentQuestionPreview } from '../services/api';

interface TeacherStudentPreviewProps {
  assignment: Assignment;
  questionsPreview: AssignmentQuestionPreview[];
  onBack: () => void;
}

type AnswerState = {
  selectedOptionIds: number[];
  responseText: string;
};

const TeacherStudentPreview: React.FC<TeacherStudentPreviewProps> = ({ assignment, questionsPreview, onBack }) => {
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [submitMessage, setSubmitMessage] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'tutor'; content: string }>>([]);

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

  const handleFakeSubmit = () => {
    setSubmitMessage('This is a preview — nothing was submitted.');
  };

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
      <div className="max-w-6xl mx-auto">
        {/* Preview banner */}
        <div className="mb-6 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
          <p className="text-sm font-medium text-amber-800">
            Student Preview — This is how students see this assignment. Nothing is saved.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-colors"
            style={{ backgroundColor: '#ba3638' }}
          >
            Back to Teacher View
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          <div className="space-y-6">
            {/* Assignment info */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
              {assignment.description && <p className="text-gray-700 mt-2">{assignment.description}</p>}
            </div>

            {/* Questions */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
              {questionsPreview.length === 0 ? (
                <p className="text-gray-600">No questions are available for this assignment yet.</p>
              ) : (
                questionsPreview.map((q) => (
                  <div key={q.questionId} className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0">
                    <p className="font-semibold text-gray-900 mb-3">
                      {q.sortOrder}. {q.questionText}
                      {q.questionType === 'select_all_that_apply' && (
                        <span className="ml-2 text-sm font-normal text-gray-500 italic">(Select all that apply)</span>
                      )}
                    </p>

                    {q.questionType === 'short_answer' ? (
                      <textarea
                        value={answers[q.questionId]?.responseText ?? ''}
                        onChange={(e) => setShortAnswer(q.questionId, e.target.value)}
                        className="w-full min-h-24 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ba3638]/30"
                        placeholder="Type your response"
                      />
                    ) : q.questionType === 'select_all_that_apply' ? (
                      <div className="space-y-2">
                        {q.options.map((option, oidx) => {
                          const optId = option.optionId ?? oidx;
                          const checked = (answers[q.questionId]?.selectedOptionIds ?? []).includes(optId);
                          return (
                            <label key={oidx} className="flex items-center gap-2 text-gray-800">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleMultiSelect(q.questionId, optId)}
                              />
                              <span>{option.optionText}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {q.options.map((option, oidx) => {
                          const optId = option.optionId ?? oidx;
                          const checked = (answers[q.questionId]?.selectedOptionIds ?? []).includes(optId);
                          return (
                            <label key={oidx} className="flex items-center gap-2 text-gray-800">
                              <input
                                type="radio"
                                name={`q-${q.questionId}`}
                                checked={checked}
                                onChange={() => setSingleSelect(q.questionId, optId)}
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
                onClick={handleFakeSubmit}
                disabled={questionsPreview.length === 0}
                className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: '#ba3638' }}
              >
                Submit assignment
              </button>

              {submitMessage && (
                <p className="text-sm text-center font-medium text-amber-700">
                  {submitMessage}
                </p>
              )}
            </div>
          </div>

          {/* AI Tutor Sidebar */}
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
    </div>
  );
};

export default TeacherStudentPreview;
