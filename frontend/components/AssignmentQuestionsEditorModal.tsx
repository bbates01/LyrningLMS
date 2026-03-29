import React from 'react';
import { batchUpdateQuestions, type GenerateQuestionsResponse } from '../services/aiService';
import { saveAssignmentQuestions, type AssignmentQuestionPreview } from '../services/api';

function formatQuestionsForDisplay(data: GenerateQuestionsResponse): string {
  const lines: string[] = [];
  lines.push('Directions: ' + (data.directions || ''));
  lines.push('');
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const q of data.questions) {
    const qType = q.questionType || 'multiple_choice';
    lines.push(`${q.questionNumber}. [${qType}] ${q.question}`);
    if (qType === 'short_answer') {
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
    const numMatch = firstLine.match(/^(\d+)\.\s*(?:\[([^\]]+)\]\s*)?(.*)$/);
    if (!numMatch) continue;
    const questionNumber = parseInt(numMatch[1], 10);
    const taggedType = VALID_QUESTION_TYPES.includes(numMatch[2] as typeof VALID_QUESTION_TYPES[number])
      ? (numMatch[2] as typeof VALID_QUESTION_TYPES[number])
      : null;
    const questionText = numMatch[3].trim();

    if (taggedType === 'short_answer') {
      let expectedAnswer = '';
      for (let i = 1; i < lines.length; i++) {
        const m = lines[i].match(/^Expected answer:\s*(.*)$/i);
        if (m) {
          expectedAnswer = m[1].trim();
          break;
        }
      }
      questions.push({
        questionNumber,
        question: questionText,
        questionType: 'short_answer',
        correctAnswer: expectedAnswer,
        falseAnswers: [],
      });
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

function buildEditableData(
  questionsPreview: AssignmentQuestionPreview[],
  directions?: string | null
): GenerateQuestionsResponse {
  return {
    directions: directions || '',
    questions: questionsPreview.map((q, idx) => {
      const correct = q.options.filter((o) => Number(o.isCorrect) === 1).map((o) => o.optionText);
      const incorrect = q.options.filter((o) => Number(o.isCorrect) !== 1).map((o) => o.optionText);
      const type = q.questionType || 'multiple_choice';
      if (type === 'select_all_that_apply') {
        return {
          questionNumber: idx + 1,
          question: q.questionText,
          questionType: 'select_all_that_apply',
          correctAnswers: correct,
          falseAnswers: incorrect,
        };
      }
      return {
        questionNumber: idx + 1,
        question: q.questionText,
        questionType: type,
        correctAnswer: correct[0] || '',
        falseAnswers: incorrect,
      };
    }),
  };
}

interface Props {
  classId: number;
  assignmentId: number;
  assignmentName: string;
  assignmentMaxPoints: number;
  directions?: string | null;
  questionsPreview: AssignmentQuestionPreview[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

const AssignmentQuestionsEditorModal: React.FC<Props> = ({
  classId,
  assignmentId,
  assignmentName,
  assignmentMaxPoints,
  directions,
  questionsPreview,
  onClose,
  onSaved,
}) => {
  const initial = React.useMemo(
    () => buildEditableData(questionsPreview, directions),
    [questionsPreview, directions]
  );
  const [result, setResult] = React.useState(formatQuestionsForDisplay(initial));
  const [batchCommand, setBatchCommand] = React.useState('');
  const [isBatchUpdating, setIsBatchUpdating] = React.useState(false);
  const [batchMessage, setBatchMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [assignmentMaxPointsInput, setAssignmentMaxPointsInput] = React.useState(String(assignmentMaxPoints));
  const [questionPointValues, setQuestionPointValues] = React.useState<string[]>(
    () => initial.questions.map((q, idx) => Number(questionsPreview[idx]?.maxPoints ?? 1).toString())
  );

  const distributeEvenly = (totalPoints: number, questionCount: number): number[] => {
    const count = Math.max(1, questionCount);
    const base = Number((totalPoints / count).toFixed(2));
    const points = new Array(count).fill(base);
    const sum = Number(points.reduce((s, n) => s + n, 0).toFixed(2));
    points[count - 1] = Number((points[count - 1] + (totalPoints - sum)).toFixed(2));
    return points;
  };

  const normalizeNumberInput = (raw: string): string => {
    if (raw === '') return '';
    return raw.replace(/^0+(?=\d)/, '');
  };

  const toPointInputStrings = (values: number[]) =>
    values.map((n) => Number(n.toFixed(2)).toString());

  const toPointNumbers = (values: string[], count: number): number[] => {
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
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
    if ((lower.includes('short answer') || lower.includes('short answers')) && /(more|higher|heavier|worth more)/.test(lower)) {
      weightsByType.short_answer = 2;
    }
    if ((lower.includes('short answer') || lower.includes('short answers')) && /(less|lower|lighter|worth less)/.test(lower)) {
      weightsByType.short_answer = 0.5;
    }
    if ((lower.includes('select all') || lower.includes('all that apply')) && /(more|higher|heavier|worth more)/.test(lower)) {
      weightsByType.select_all_that_apply = 2;
    }
    if ((lower.includes('select all') || lower.includes('all that apply')) && /(less|lower|lighter|worth less)/.test(lower)) {
      weightsByType.select_all_that_apply = 0.5;
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

  const parsedMaxPoints = Number(assignmentMaxPointsInput);
  const effectiveMaxPoints = Number.isFinite(parsedMaxPoints) && parsedMaxPoints > 0 ? parsedMaxPoints : assignmentMaxPoints;
  const parsedQuestions = parseQuestionsFromDisplayText(result);
  const questionCount = parsedQuestions?.questions.length ?? 0;

  const handleBatchUpdate = async () => {
    const parsed = parseQuestionsFromDisplayText(result);
    if (!parsed || !batchCommand.trim()) {
      setError('Enter a command and keep questions in the expected format.');
      return;
    }
    setIsBatchUpdating(true);
    setError('');
    try {
      const { data, message } = await batchUpdateQuestions(parsed, batchCommand.trim());
      setResult(formatQuestionsForDisplay(data));
      const shouldAdjustPoints = /(point|worth|higher|lower|more|less)/i.test(batchCommand);
      const nextPoints = shouldAdjustPoints
        ? pointsFromBatchCommand(batchCommand, data.questions, effectiveMaxPoints)
        : distributeEvenly(effectiveMaxPoints, data.questions.length);
      setQuestionPointValues(toPointInputStrings(nextPoints));
      setBatchMessage(message);
      setBatchCommand('');
    } catch (err) {
      setBatchMessage('');
      setError(err instanceof Error ? err.message : 'Failed to update questions.');
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const handleSaveQuestions = async () => {
    const parsed = parseQuestionsFromDisplayText(result);
    if (!parsed || parsed.questions.length === 0) {
      setError('Could not parse questions. Keep the expected format.');
      return;
    }
    const workingQuestionPoints =
      questionPointValues.length === parsed.questions.length
        ? toPointNumbers(questionPointValues, parsed.questions.length)
        : distributeEvenly(effectiveMaxPoints, parsed.questions.length);
    const pointsTotal = Number(workingQuestionPoints.reduce((s, n) => s + Number(n || 0), 0).toFixed(2));
    if (Math.abs(pointsTotal - Number(effectiveMaxPoints)) > 0.01) {
      setError(`Question point total (${pointsTotal}) must equal assignment total (${effectiveMaxPoints}).`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = parsed.questions.map((q) => {
        const idx = Math.max(0, Number(q.questionNumber || 1) - 1);
        const qPoints = Number(workingQuestionPoints[idx] ?? 1);
        const type = q.questionType || 'multiple_choice';
        if (type === 'select_all_that_apply' && q.correctAnswers && q.correctAnswers.length > 0) {
          return {
            questionText: q.question,
            questionType: 'select_all_that_apply' as const,
            maxPoints: qPoints,
            correctAnswers: q.correctAnswers,
            falseAnswers: q.falseAnswers || [],
          };
        }
        return {
          questionText: q.question,
          questionType: type,
          maxPoints: qPoints,
          correctAnswer: q.correctAnswer ?? '',
          falseAnswers: q.falseAnswers || [],
        };
      });
      const saveRes = await saveAssignmentQuestions(classId, assignmentId, payload, {
        assignmentMaxPoints: effectiveMaxPoints,
      });
      if (!saveRes.success) {
        setError(saveRes.error || 'Failed to save questions.');
        return;
      }
      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && onClose()}>
      <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-white rounded-2xl border border-gray-200 shadow-xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-black">Edit questions: {assignmentName}</h3>
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3">
          <h4 className="text-sm font-semibold text-gray-800">AI batch update</h4>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={batchCommand}
              onChange={(e) => setBatchCommand(e.target.value)}
              placeholder="e.g. Make question wording a little harder"
              className="flex-1 min-w-[220px] px-4 py-2 border border-gray-300 rounded-xl text-sm"
            />
            <button
              type="button"
              onClick={handleBatchUpdate}
              disabled={isBatchUpdating || !batchCommand.trim()}
              className="px-4 py-2 rounded-xl bg-gray-800 text-white text-sm font-medium disabled:opacity-50"
            >
              {isBatchUpdating ? 'Updating...' : 'Update with AI'}
            </button>
          </div>
          {batchMessage && (
            <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200">
              Updated: {batchMessage}
            </p>
          )}
        </div>
        <textarea
          value={result}
          onChange={(e) => setResult(e.target.value)}
          className="w-full min-h-[320px] rounded-2xl border border-gray-200 p-4 text-sm text-gray-800 bg-white"
        />
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-2">
          <div className="flex items-center justify-between">
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
                  const parsed = Number(normalized);
                  if (Number.isFinite(parsed) && parsed > 0 && questionCount > 0) {
                    setQuestionPointValues(toPointInputStrings(distributeEvenly(parsed, questionCount)));
                  }
                }}
                className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-sm text-right"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const count = questionCount;
                if (count > 0) setQuestionPointValues(toPointInputStrings(distributeEvenly(effectiveMaxPoints, count)));
              }}
              className="px-3 py-1 text-xs rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
            >
              Auto distribute
            </button>
          </div>
          {parsedQuestions?.questions.map((q, idx) => (
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
                Number(toPointNumbers(questionPointValues, questionCount).reduce((s, n) => s + Number(n || 0), 0).toFixed(2)) - effectiveMaxPoints
              ) > 0.01
                ? 'text-red-600 font-medium'
                : 'text-gray-600'
            }`}
          >
            Total: {Number(toPointNumbers(questionPointValues, questionCount).reduce((s, n) => s + Number(n || 0), 0).toFixed(2))} / {effectiveMaxPoints}
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700">
            Cancel
          </button>
          <button type="button" onClick={handleSaveQuestions} disabled={saving} className="px-4 py-2 rounded-lg bg-gray-900 text-white">
            {saving ? 'Saving...' : 'Save questions'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignmentQuestionsEditorModal;
