import React, { useRef, useState } from 'react';
import { Pencil, Upload, CheckCircle2 } from './Icons';
import { generateAssignmentQuestions, type GenerateQuestionsResponse } from '../services/aiService';
import { uploadAssignmentPdf, createAssignment, saveAssignmentQuestions } from '../services/api';

function formatQuestionsForDisplay(data: GenerateQuestionsResponse): string {
  const lines: string[] = [];
  lines.push('Directions: ' + (data.directions || ''));
  lines.push('');
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const q of data.questions) {
    lines.push(`${q.questionNumber}. ${q.question}`);
    const correctList = (q.correctAnswers && q.correctAnswers.length > 0)
      ? q.correctAnswers
      : (q.correctAnswer ? [q.correctAnswer] : []);
    const falseList = q.falseAnswers || [];
    let letterIdx = 0;
    for (const c of correctList) {
      if (c != null && String(c).trim() !== '') {
        lines.push(`${letters[letterIdx]}. ${String(c).trim()} (Correct)`);
        letterIdx++;
      }
    }
    for (const fa of falseList) {
      if (fa != null && String(fa).trim() !== '') {
        lines.push(`${letters[letterIdx]}. ${String(fa).trim()}`);
        letterIdx++;
      }
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

function parseQuestionsFromDisplayText(text: string): GenerateQuestionsResponse | null {
  let directions = '';
  const dirMatch = text.match(/^Directions:\s*(.*?)(?=\n\n|\n\d+\.\s)/s);
  if (dirMatch) directions = dirMatch[1].trim();

  const rest = text.replace(/^Directions:\s*(.*?)(?=\n\n|\n\d+\.\s)/s, '').trim();
  const blocks = rest.split(/\n(?=\d+\.\s)/).filter((b) => /^\d+\.\s/.test(b.trim()));

  const questions: GenerateQuestionsResponse['questions'] = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    const firstLine = lines[0];
    const numMatch = firstLine.match(/^(\d+)\.\s*(.*)$/);
    if (!numMatch) continue;
    const questionNumber = parseInt(numMatch[1], 10);
    const questionText = numMatch[2].trim();
    const correctAnswers: string[] = [];
    const falseAnswers: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const m = lines[i].match(/^([A-Z])\.\s*(.*)$/);
      if (!m) continue;
      const optText = m[2].replace(/\s*\(Correct\)\s*$/i, '').trim();
      if (lines[i].toLowerCase().includes('(correct)')) correctAnswers.push(optText);
      else falseAnswers.push(optText);
    }
    if (correctAnswers.length > 1) {
      questions.push({ questionNumber, question: questionText, correctAnswers, falseAnswers, questionType: 'select_all_that_apply' });
    } else {
      questions.push({ questionNumber, question: questionText, correctAnswer: correctAnswers[0] ?? '', falseAnswers });
    }
  }

  if (questions.length === 0) return null;
  return { directions, questions };
}

interface Props {
  classId: number;
  teacherId: number;
  onAssignmentCreated?: () => void;
}

interface PendingFile {
  name: string;
  file: File;
}

const AssignmentEditor: React.FC<Props> = ({ classId, teacherId, onAssignmentCreated }) => {
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [result, setResult] = useState('');
  const [questionsData, setQuestionsData] = useState<GenerateQuestionsResponse | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(7);
  const [includeSelectAllThatApply, setIncludeSelectAllThatApply] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!title.trim()) {
      setUploadError('Please enter an assignment title before generating questions.');
      return;
    }

    try {
      setIsGenerating(true);
      setUploadError('');
      const fileNames = pendingFiles.map((f) => f.name);
      const data = await generateAssignmentQuestions(
        title || 'Assignment',
        fileNames,
        instructions,
        questionCount,
        includeSelectAllThatApply,
      );
      setQuestionsData(data);
      setResult(formatQuestionsForDisplay(data));
      setShowReview(true);
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Error generating questions.');
      setQuestionsData(null);
      setShowReview(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    const parsed = parseQuestionsFromDisplayText(result);
    if (!parsed) {
      setUploadError('Could not parse questions. Keep the format: "1. Question\nA. Correct (Correct)\nB. ..."');
      return;
    }
    setQuestionsData(parsed);
    setResult(formatQuestionsForDisplay(parsed));
    setUploadError('');
  };

  const handleConfirmYes = async () => {
    if (!questionsData || questionsData.questions.length === 0) {
      setConfirmError('No questions to save.');
      return;
    }
    setConfirmError('');
    setIsSaving(true);
    try {
      const createRes = await createAssignment(classId, teacherId, title.trim(), questionsData.directions);
      if (!createRes.success || createRes.assignmentId == null) {
        setConfirmError(createRes.error || 'Failed to create assignment.');
        return;
      }
      const newAssignmentId = createRes.assignmentId;
      for (const { file } of pendingFiles) {
        const up = await uploadAssignmentPdf(classId, teacherId, file, title.trim(), newAssignmentId);
        if (!up.success) {
          setConfirmError(up.error || 'Failed to attach PDF.');
          return;
        }
      }
      const payload = questionsData.questions.map((q) => {
        if (q.questionType === 'select_all_that_apply' && q.correctAnswers && q.correctAnswers.length > 0) {
          return { questionText: q.question, questionType: 'select_all_that_apply' as const, correctAnswers: q.correctAnswers, falseAnswers: q.falseAnswers || [] };
        }
        return { questionText: q.question, correctAnswer: q.correctAnswer ?? '', falseAnswers: q.falseAnswers || [] };
      });
      const saveRes = await saveAssignmentQuestions(classId, newAssignmentId, payload);
      if (!saveRes.success) {
        setConfirmError(saveRes.error || 'Failed to save questions.');
        return;
      }
      setShowConfirmModal(false);
      setShowReview(false);
      setResult('');
      setQuestionsData(null);
      setPendingFiles([]);
      onAssignmentCreated?.();
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    if (!title.trim()) {
      setUploadError('Please enter an assignment title first.');
      return;
    }

    setUploadError('');
    setPendingFiles((prev) => [...prev, { name: file.name, file }]);
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-2 border-b-2 border-gray-900 pb-2 max-w-md">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ADD ASSIGNMENT TITLE"
          className="text-2xl font-bold bg-transparent focus:outline-none flex-1 placeholder:text-gray-300"
        />
        <Pencil className="w-6 h-6 text-gray-500" />
      </div>

      {!showReview && (
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Attached Materials
            </h2>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-100 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Add PDF
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          {pendingFiles.length === 0 && (
            <p className="text-gray-400 italic text-sm">No files added yet. They will be attached when you confirm.</p>
          )}

          {pendingFiles.length > 0 && (
            <div className="space-y-2">
              {pendingFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 text-gray-600 text-sm">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="w-5 h-5 shrink-0"
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                    <path d="M14 2v6h6" />
                  </svg>
                  <span className="truncate">{file.name}</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                </div>
              ))}
            </div>
          )}

          {uploadError && <p className="text-sm" style={{ color: '#ba3638' }}>{uploadError}</p>}
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              AI Instructions
            </h2>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600">
                  Questions to generate
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={questionCount}
                  onChange={(e) => {
                    const n = parseInt(e.target.value || '1', 10);
                    setQuestionCount(Number.isNaN(n) ? 1 : Math.max(1, Math.min(n, 30)));
                  }}
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded-md text-center focus:outline-none focus:ring-1 focus:ring-gray-500"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSelectAllThatApply}
                  onChange={(e) => setIncludeSelectAllThatApply(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Include &quot;select all that apply&quot; questions
              </label>
            </div>
          </div>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Describe what kind of questions or assignment you want generated based on the uploaded material."
            className="w-full bg-gray-50 resize-none h-40 focus:outline-none text-gray-700 text-sm rounded-2xl p-4 border border-gray-200"
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="mt-2 px-6 py-2.5 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isGenerating ? 'Generating…' : 'Generate with AI'}
          </button>
        </div>

      </div>
      )}

      {showReview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Review Generated Questions
              </h2>
              <p className="text-sm text-gray-500">
                Edit the suggested directions and questions before confirming.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowReview(false)}
              className="px-3 py-1.5 text-xs rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
            >
              Back to setup
            </button>
          </div>

          <textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className="w-full min-h-[320px] rounded-2xl border border-gray-200 p-4 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
          />

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-full border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="px-6 py-2.5 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
            >
              Confirm Questions
            </button>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !isSaving && setShowConfirmModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-gray-900 font-medium mb-2">Confirm Questions?</p>
            <p className="text-sm text-gray-600 mb-4">Any unsaved changes will not be applied.</p>
            {confirmError && <p className="text-sm mb-3" style={{ color: '#ba3638' }}>{confirmError}</p>}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSaving}
                className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleConfirmYes}
                disabled={isSaving}
                className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-8 right-8">
        <button className="flex items-center gap-2 bg-white px-6 py-3 rounded-full border border-gray-200 shadow-lg hover:shadow-xl transition-all">
          <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center text-[10px]">
            ★
          </div>
          <span className="text-sm font-medium text-gray-700">View Student View</span>
        </button>
      </div>
    </div>
  );
};

export default AssignmentEditor;
