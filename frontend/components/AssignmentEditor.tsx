import React, { useRef, useState, useCallback } from 'react';
import { Pencil, Upload, CheckCircle2 } from './Icons';
import { generateAssignmentQuestions, batchUpdateQuestions, extractPdfText, type GenerateQuestionsResponse } from '../services/aiService';
import { uploadAssignmentPdf, createAssignment, saveAssignmentQuestions } from '../services/api';

const QUESTION_TYPE_OPTIONS = [
  { id: 'multiple_choice', label: 'Multiple Choice' },
  { id: 'true_false', label: 'True/False' },
  { id: 'short_answer', label: 'Short Answer' },
  { id: 'select_all_that_apply', label: 'Select All That Apply' },
] as const;

function formatQuestionsForDisplay(data: GenerateQuestionsResponse): string {
  const lines: string[] = [];
  lines.push('Directions: ' + (data.directions || ''));
  lines.push('');
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const q of data.questions) {
    const qType = q.questionType || 'multiple_choice';
    // Include the question type tag so it can be round-tripped through parse
    lines.push(`${q.questionNumber}. [${qType}] ${q.question}`);
    if (qType === 'short_answer') {
      // Short-answer questions: show expected answer instead of lettered options
      const answer = q.correctAnswer || (q.correctAnswers && q.correctAnswers[0]) || '';
      lines.push(`Expected answer: ${answer}`);
    } else {
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
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

const VALID_QUESTION_TYPES = ['multiple_choice', 'true_false', 'short_answer', 'select_all_that_apply'] as const;

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
    // Support optional [questionType] tag: "1. [short_answer] Question text"
    const numMatch = firstLine.match(/^(\d+)\.\s*(?:\[([^\]]+)\]\s*)?(.*)$/);
    if (!numMatch) continue;
    const questionNumber = parseInt(numMatch[1], 10);
    const taggedType = VALID_QUESTION_TYPES.includes(numMatch[2] as typeof VALID_QUESTION_TYPES[number])
      ? (numMatch[2] as typeof VALID_QUESTION_TYPES[number])
      : null;
    const questionText = numMatch[3].trim();

    if (taggedType === 'short_answer') {
      // Short-answer questions store their expected answer in an "Expected answer:" line
      let expectedAnswer = '';
      for (let i = 1; i < lines.length; i++) {
        const m = lines[i].match(/^Expected answer:\s*(.*)$/i);
        if (m) { expectedAnswer = m[1].trim(); break; }
      }
      questions.push({ questionNumber, question: questionText, questionType: 'short_answer', correctAnswer: expectedAnswer, falseAnswers: [] });
    } else {
      const correctAnswers: string[] = [];
      const falseAnswers: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const m = lines[i].match(/^([A-Z])\.\s*(.*)$/);
        if (!m) continue;
        const optText = m[2].replace(/\s*\(Correct\)\s*$/i, '').trim();
        if (lines[i].toLowerCase().includes('(correct)')) correctAnswers.push(optText);
        else falseAnswers.push(optText);
      }
      // Use explicit type tag if present; otherwise infer from answer count
      if (taggedType === 'select_all_that_apply' || (!taggedType && correctAnswers.length > 1)) {
        questions.push({ questionNumber, question: questionText, correctAnswers, falseAnswers, questionType: 'select_all_that_apply' });
      } else {
        const inferredType = taggedType || 'multiple_choice';
        questions.push({ questionNumber, question: questionText, questionType: inferredType, correctAnswer: correctAnswers[0] ?? '', falseAnswers });
      }
    }
  }

  if (questions.length === 0) return null;
  return { directions, questions };
}

interface PendingFile {
  name: string;
  file: File;
}

interface Props {
  classId: number;
  teacherId: number;
  onAssignmentCreated?: (classId: number, assignmentId: number) => void;
  // Stored into `assignments.type` so the created assignment shows under the correct section.
  assignmentType?: string;
}

const AssignmentEditor: React.FC<Props> = ({ classId, teacherId, onAssignmentCreated, assignmentType = 'homework' }) => {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [noDueDate, setNoDueDate] = useState(false);
  const [aiParams, setAiParams] = useState('');
  const [questionTypes, setQuestionTypes] = useState<string[]>(['multiple_choice']);
  const [generationCommands, setGenerationCommands] = useState('');
  const [questionCountInput, setQuestionCountInput] = useState('7');
  const [assignmentMaxPointsInput, setAssignmentMaxPointsInput] = useState('100');
  const [allowedSubmissionsInput, setAllowedSubmissionsInput] = useState('1');
  const [attemptScoringPolicy, setAttemptScoringPolicy] = useState<'latest' | 'highest' | 'average'>('latest');
  const [questionPointValues, setQuestionPointValues] = useState<string[]>([]);
  const [result, setResult] = useState('');
  const [questionsData, setQuestionsData] = useState<GenerateQuestionsResponse | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [pdfSummary, setPdfSummary] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirmInProgressRef = useRef(false);

  // AI Batch Update
  const [batchCommand, setBatchCommand] = useState('');
  const [batchMessage, setBatchMessage] = useState('');
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  const toggleQuestionType = (id: string) => {
    setQuestionTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const parseIntInRange = (raw: string, min: number, max: number): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (!Number.isInteger(n)) return null;
    if (n < min || n > max) return null;
    return n;
  };

  const parsePositiveNumber = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Number(n);
  };

  const normalizeNumberInput = (raw: string): string => {
    if (raw === '') return '';
    return raw.replace(/^0+(?=\d)/, '');
  };

  const distributeEvenly = (totalPoints: number, questionCount: number): number[] => {
    const count = Math.max(1, questionCount);
    const base = Number((totalPoints / count).toFixed(2));
    const points = new Array(count).fill(base);
    const sum = Number(points.reduce((s, n) => s + n, 0).toFixed(2));
    points[count - 1] = Number((points[count - 1] + (totalPoints - sum)).toFixed(2));
    return points;
  };

  const toPointInputStrings = (values: number[]) =>
    values.map((n) => Number(n.toFixed(2)).toString());

  const toPointNumbers = (values: string[], questionCount: number): number[] => {
    const out: number[] = [];
    for (let i = 0; i < questionCount; i++) {
      const raw = (values[i] ?? '').trim();
      if (!raw) {
        out.push(0);
        continue;
      }
      const n = Number(raw);
      out.push(Number.isFinite(n) ? n : 0);
    }
    return out;
  };

  const distributeByWeights = (totalPoints: number, weights: number[]): number[] => {
    const safeWeights = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
    const weightSum = safeWeights.reduce((s, w) => s + w, 0);
    if (weightSum <= 0) return distributeEvenly(totalPoints, Math.max(1, weights.length));
    const raw = safeWeights.map((w) => (totalPoints * w) / weightSum);
    const rounded = raw.map((v) => Number(v.toFixed(2)));
    const roundedSum = Number(rounded.reduce((s, n) => s + n, 0).toFixed(2));
    rounded[rounded.length - 1] = Number((rounded[rounded.length - 1] + (totalPoints - roundedSum)).toFixed(2));
    return rounded;
  };

  const pointsFromBatchCommand = (
    command: string,
    questions: GenerateQuestionsResponse['questions'],
    totalPoints: number,
  ): number[] => {
    const lower = command.toLowerCase();
    const typeKeywords: Array<{ key: string; patterns: string[] }> = [
      { key: 'short_answer', patterns: ['short answer', 'short answers'] },
      { key: 'select_all_that_apply', patterns: ['select all', 'all that apply'] },
      { key: 'multiple_choice', patterns: ['multiple choice', 'mcq'] },
      { key: 'true_false', patterns: ['true/false', 'true false'] },
    ];
    const weightsByType: Record<string, number> = {
      short_answer: 1,
      select_all_that_apply: 1,
      multiple_choice: 1,
      true_false: 1,
    };

    const explicitPointsByType: Partial<Record<string, number>> = {};
    const setExplicitPoints = (typeKey: string, patterns: string[]) => {
      for (const p of patterns) {
        const re = new RegExp(`${p}[^\\n\\r]*?worth[^\\n\\r]*?(\\d+(?:\\.\\d+)?)\\s*point`, 'i');
        const m = command.match(re);
        if (m) {
          const n = Number(m[1]);
          if (Number.isFinite(n) && n > 0) explicitPointsByType[typeKey] = n;
        }
      }
    };
    setExplicitPoints('short_answer', ['short\\s*answer', 'short\\s*answers']);
    setExplicitPoints('select_all_that_apply', ['select\\s*all', 'all\\s*that\\s*apply']);
    setExplicitPoints('multiple_choice', ['multiple\\s*choice', 'mcq']);
    setExplicitPoints('true_false', ['true\\s*\\/\\s*false', 'true\\s*false']);

    for (const t of typeKeywords) {
      const mentioned = t.patterns.some((p) => lower.includes(p));
      if (!mentioned) continue;
      if (/more|higher|heavier|worth more/.test(lower)) weightsByType[t.key] = 2;
      if (/less|lower|lighter|worth less/.test(lower)) weightsByType[t.key] = 0.5;
    }

    const hasExplicitPoints = Object.keys(explicitPointsByType).length > 0;
    if (hasExplicitPoints) {
      const points = questions.map((q) => {
        const t = q.questionType || 'multiple_choice';
        const n = explicitPointsByType[t];
        return Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n) : 0;
      });
      const pointsSum = points.reduce((s, n) => s + n, 0);
      if (pointsSum > 0) {
        const scaled = points.map((n) => (n <= 0 ? 0 : Number(((n / pointsSum) * totalPoints).toFixed(2))));
        const scaledSum = Number(scaled.reduce((s, n) => s + n, 0).toFixed(2));
        const lastPositiveIdx = [...scaled].map((n, i) => ({ n, i })).reverse().find((x) => x.n > 0)?.i ?? (scaled.length - 1);
        scaled[lastPositiveIdx] = Number((scaled[lastPositiveIdx] + (totalPoints - scaledSum)).toFixed(2));
        return scaled;
      }
    }

    const questionWeights = questions.map((q) => weightsByType[q.questionType || 'multiple_choice'] ?? 1);
    return distributeByWeights(totalPoints, questionWeights);
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      setUploadError('Please enter an assignment title before generating questions.');
      return;
    }
    if (!noDueDate && !dueDate.trim()) {
      setUploadError('Please enter a due date before generating questions.');
      return;
    }
    if (questionTypes.length === 0) {
      setUploadError('Select at least one question type.');
      return;
    }
    const parsedQuestionCount = parseIntInRange(questionCountInput, 1, 70);
    if (parsedQuestionCount == null) {
      setUploadError('Number of questions is required and must be between 1 and 70.');
      return;
    }
    try {
      setIsGenerating(true);
      setUploadError('');
      const filesToExtract = pendingFiles.map((p) => p.file);
      const materials: string[] = filesToExtract.length
        ? await extractPdfText(filesToExtract)
        : [];
      const data = await generateAssignmentQuestions(
        title || 'Assignment',
        materials,
        '', // teacherInstructions for generation; we use generationCommands below
        parsedQuestionCount,
        questionTypes,
        generationCommands
      );
      setPdfSummary(data.pdfSummary ?? null);
      setQuestionsData(data);
      const totalPoints = parsePositiveNumber(assignmentMaxPointsInput) ?? 100;
      const shouldAdjustPoints = /(point|worth|higher|lower|more|less)/i.test(generationCommands);
      const nextPoints = shouldAdjustPoints
        ? pointsFromBatchCommand(generationCommands, data.questions, totalPoints)
        : distributeEvenly(totalPoints, data.questions.length);
      setQuestionPointValues(toPointInputStrings(nextPoints));
      setResult(formatQuestionsForDisplay(data));
      setShowReview(true);
      setBatchMessage('');
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Error generating questions.');
      setQuestionsData(null);
      setShowReview(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBatchUpdate = async () => {
    const parsed = parseQuestionsFromDisplayText(result);
    if (!parsed || !batchCommand.trim()) {
      setUploadError('Enter a command and ensure questions are in the correct format.');
      return;
    }
    setIsBatchUpdating(true);
    setUploadError('');
    try {
      const { data, message } = await batchUpdateQuestions(parsed, batchCommand.trim());
      setQuestionsData(data);
      const totalPoints = parsePositiveNumber(assignmentMaxPointsInput) ?? 100;
      const shouldAdjustPoints = /(point|worth|higher|lower|more|less)/i.test(batchCommand);
      const nextPoints = shouldAdjustPoints
        ? pointsFromBatchCommand(batchCommand, data.questions, totalPoints)
        : distributeEvenly(totalPoints, data.questions.length);
      setQuestionPointValues(toPointInputStrings(nextPoints));
      setResult(formatQuestionsForDisplay(data));
      setBatchMessage(message);
      setBatchCommand('');
    } catch (err) {
      setBatchMessage('');
      setUploadError(err instanceof Error ? err.message : 'Failed to update questions.');
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const handleSave = () => {
    const parsed = parseQuestionsFromDisplayText(result);
    if (!parsed) {
      setUploadError('Could not parse questions. Keep the format: "1. Question\nA. Correct (Correct)\nB. ..."');
      return;
    }
    setQuestionsData(parsed);
    const totalPoints = parsePositiveNumber(assignmentMaxPointsInput) ?? 100;
    setQuestionPointValues(toPointInputStrings(distributeEvenly(totalPoints, parsed.questions.length)));
    setResult(formatQuestionsForDisplay(parsed));
    setUploadError('');
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 5000);
  };

  const handleConfirmYes = useCallback(async () => {
    if (confirmInProgressRef.current) return;
    if (!questionsData || questionsData.questions.length === 0) {
      setConfirmError('No questions to save.');
      return;
    }
    confirmInProgressRef.current = true;
    setConfirmError('');
    setIsSaving(true);
    try {
      const parsedMaxPoints = parsePositiveNumber(assignmentMaxPointsInput);
      if (parsedMaxPoints == null) {
        setConfirmError('Total assignment points is required and must be greater than 0.');
        return;
      }
      const parsedAllowedSubmissions = parseIntInRange(allowedSubmissionsInput, 1, 10);
      if (parsedAllowedSubmissions == null) {
        setConfirmError('Allowed submissions is required and must be between 1 and 10.');
        return;
      }
      const workingQuestionPoints =
        questionPointValues.length === questionsData.questions.length
          ? toPointNumbers(questionPointValues, questionsData.questions.length)
          : distributeEvenly(parsedMaxPoints, questionsData.questions.length);
      const pointsTotal = Number(workingQuestionPoints.reduce((s, n) => s + Number(n || 0), 0).toFixed(2));
      if (Math.abs(pointsTotal - parsedMaxPoints) > 0.01) {
        setConfirmError(`Question point total (${pointsTotal}) must equal assignment total (${parsedMaxPoints}).`);
        return;
      }
      const createRes = await createAssignment(
        classId,
        teacherId,
        title.trim(),
        noDueDate ? '' : dueDate,
        questionsData.directions,
        aiParams.trim() || undefined,
        questionTypes.length ? questionTypes : undefined,
        parsedMaxPoints,
        parsedAllowedSubmissions,
        parsedAllowedSubmissions > 1 ? attemptScoringPolicy : 'latest',
        assignmentType,
        pdfSummary
      );
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
        const idx = Math.max(0, Number(q.questionNumber || 1) - 1);
        const qPoints = Number(workingQuestionPoints[idx] ?? 1);
        const type = q.questionType || 'multiple_choice';
        if (type === 'select_all_that_apply' && q.correctAnswers && q.correctAnswers.length > 0) {
          return { questionText: q.question, questionType: 'select_all_that_apply' as const, maxPoints: qPoints, correctAnswers: q.correctAnswers, falseAnswers: q.falseAnswers || [] };
        }
        return { questionText: q.question, questionType: type, maxPoints: qPoints, correctAnswer: q.correctAnswer ?? '', falseAnswers: q.falseAnswers || [] };
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
      onAssignmentCreated?.(classId, newAssignmentId);
    } finally {
      confirmInProgressRef.current = false;
      setIsSaving(false);
    }
  }, [classId, teacherId, title, dueDate, noDueDate, questionsData, aiParams, questionTypes, pendingFiles, onAssignmentCreated, pdfSummary, allowedSubmissionsInput, attemptScoringPolicy, assignmentType, assignmentMaxPointsInput, questionPointValues]);

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
    <div className="space-y-8 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-gray-900 pb-2">
        <div className="flex items-center gap-2 min-w-[280px] flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ADD ASSIGNMENT TITLE"
            className="text-2xl font-bold bg-transparent focus:outline-none flex-1 placeholder:text-gray-300 min-w-0"
          />
          <Pencil className="w-6 h-6 text-gray-500 shrink-0" />
        </div>
        {!showReview && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Due date</label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            disabled={noDueDate}
          />
          <label className="inline-flex items-center gap-2 text-xs text-gray-600 ml-1">
            <input
              type="checkbox"
              checked={noDueDate}
              onChange={(e) => setNoDueDate(e.target.checked)}
              className="rounded border-gray-300"
            />
            No due date (optional)
          </label>
        </div>
        )}
      </div>

      {!showReview ? (
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Attached Materials</h2>
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 shrink-0">
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
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Total assignment points</h2>
            <input
              type="number"
              min={1}
              value={assignmentMaxPointsInput}
              onChange={(e) => setAssignmentMaxPointsInput(normalizeNumberInput(e.target.value))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Number of questions</h2>
            <input
              type="number"
              min={1}
              max={70}
              value={questionCountInput}
              onChange={(e) => setQuestionCountInput(normalizeNumberInput(e.target.value))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <p className="text-xs text-gray-500">Max: 70</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Allowed student submissions</h2>
            <input
              type="number"
              min={1}
              max={10}
              value={allowedSubmissionsInput}
              onChange={(e) => setAllowedSubmissionsInput(normalizeNumberInput(e.target.value))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <p className="text-xs text-gray-500">Max: 10</p>
            {Number(allowedSubmissionsInput) > 1 && (
              <div className="pt-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Score to save across attempts
                </label>
                <select
                  value={attemptScoringPolicy}
                  onChange={(e) => setAttemptScoringPolicy(e.target.value as 'latest' | 'highest' | 'average')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="latest">Most Recent</option>
                  <option value="highest">Highest</option>
                  <option value="average">Average</option>
                </select>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">AI interaction instructions</h2>
            <p className="text-xs text-gray-500">How the AI should interact with students (e.g. &quot;Emphasize conceptual understanding&quot;).</p>
            <textarea
              value={aiParams}
              onChange={(e) => setAiParams(e.target.value)}
              placeholder="e.g. Emphasize conceptual understanding. Don't give away the answer."
              className="w-full bg-gray-50 resize-none h-28 focus:outline-none text-gray-700 text-sm rounded-2xl p-4 border border-gray-200"
            />
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Question types</h2>
            <p className="text-xs text-gray-500">The AI will only generate the selected type(s).</p>
            <div className="flex flex-wrap gap-4">
              {QUESTION_TYPE_OPTIONS.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={questionTypes.includes(opt.id)}
                    onChange={() => toggleQuestionType(opt.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">AI question instructions</h2>
            <p className="text-xs text-gray-500">Used when generating with AI (e.g. &quot;Make answer choices one sentence each&quot;).</p>
            <textarea
              value={generationCommands}
              onChange={(e) => setGenerationCommands(e.target.value)}
              placeholder="e.g. Make questions long but easy to understand. One sentence per answer choice."
              className="w-full bg-gray-50 resize-none h-28 focus:outline-none text-gray-700 text-sm rounded-2xl p-4 border border-gray-200"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isGenerating ? 'Generating…' : 'Generate with AI'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* AI Batch Update */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3">
            <h2 className="text-sm font-semibold text-gray-800">AI batch update</h2>
            <p className="text-xs text-gray-500">Apply a change to all questions at once (e.g. &quot;Make them more complex&quot;).</p>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={batchCommand}
                onChange={(e) => setBatchCommand(e.target.value)}
                placeholder="e.g. Make them more complex"
                className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <button
                type="button"
                onClick={handleBatchUpdate}
                disabled={isBatchUpdating || !batchCommand.trim()}
                className="px-4 py-2 rounded-xl bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
              >
                {isBatchUpdating ? 'Updating…' : 'Update'}
              </button>
            </div>
            {batchMessage && (
              <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200">
                Sure, here you go. I updated the questions by {batchMessage}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Review generated questions</h2>
              <p className="text-sm text-gray-500">Edit below, then Save and Confirm.</p>
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
          {questionsData && questionsData.questions.length > 0 && (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-800">Question points</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Total points</span>
                  <input
                    type="number"
                    min={1}
                    value={assignmentMaxPointsInput}
                    onChange={(e) => {
                      const normalized = normalizeNumberInput(e.target.value);
                      setAssignmentMaxPointsInput(normalized);
                      const parsedTotal = parsePositiveNumber(normalized);
                      if (parsedTotal != null) {
                        setQuestionPointValues(toPointInputStrings(distributeEvenly(parsedTotal, questionsData.questions.length)));
                      }
                    }}
                    className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-sm text-right"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const totalPoints = parsePositiveNumber(assignmentMaxPointsInput) ?? 100;
                      setQuestionPointValues(toPointInputStrings(distributeEvenly(totalPoints, questionsData.questions.length)));
                    }}
                    className="px-3 py-1 text-xs rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                  >
                    Auto distribute points
                  </button>
                </div>
              </div>
              {questionsData.questions.map((q, idx) => (
                <div key={`${q.questionNumber}-${idx}`} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700 truncate">Q{q.questionNumber}</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={questionPointValues[idx] ?? ''}
                    onChange={(e) => {
                      const next = [...questionPointValues];
                      const normalized = normalizeNumberInput(e.target.value);
                      next[idx] = normalized;
                      setQuestionPointValues(next);
                    }}
                    className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-sm text-right"
                  />
                </div>
              ))}
              <p
                className={`text-xs ${
                  Math.abs(
                    Number(toPointNumbers(questionPointValues, questionsData.questions.length).reduce((s, n) => s + Number(n || 0), 0).toFixed(2)) -
                    (parsePositiveNumber(assignmentMaxPointsInput) ?? 100)
                  ) > 0.01
                    ? 'text-red-600 font-medium'
                    : 'text-gray-600'
                }`}
              >
                Total: {Number(toPointNumbers(questionPointValues, questionsData.questions.length).reduce((s, n) => s + Number(n || 0), 0).toFixed(2))} / {parsePositiveNumber(assignmentMaxPointsInput) ?? 100}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-full border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100"
            >
              Save
            </button>
            {saveFeedback && (
              <span className="px-4 py-2 rounded-lg bg-green-100 text-green-800 text-sm font-medium">Changes saved.</span>
            )}
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
            <p className="text-sm text-gray-600 mb-4">Questions and assignment will be saved. You will get a shareable student link.</p>
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
    </div>
  );
};

export default AssignmentEditor;
