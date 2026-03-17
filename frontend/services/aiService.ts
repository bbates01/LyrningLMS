const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

/** Extract text from uploaded PDFs (backend reads file content). Returns array of text per file. */
export async function extractPdfText(files: File[]): Promise<string[]> {
  if (!files.length) return [];
  const formData = new FormData();
  files.forEach((f) => formData.append('pdfs', f));
  const res = await fetch(`${API_BASE}/api/ai/extract-pdf-text`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to extract text from PDFs');
  return data.texts ?? [];
}

export type QuestionType = 'multiple_choice' | 'select_all_that_apply';

export interface GeneratedQuestion {
  questionNumber: number;
  question: string;
  /** Single correct answer for multiple_choice */
  correctAnswer?: string;
  /** Multiple correct answers for select_all_that_apply */
  correctAnswers?: string[];
  falseAnswers: string[];
  questionType?: QuestionType;
}

export interface GenerateQuestionsResponse {
  directions: string;
  questions: GeneratedQuestion[];
}

export async function chatWithTutor(
  message: string,
  history: { role: string; content: string }[],
  instructions: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, instructions }),
  });
  const data = await res.json();
  if (!res.ok) {
    return data.error || 'Unable to connect to AI Tutor.';
  }
  return data.text ?? "I'm having trouble thinking right now. Could you rephrase that?";
}

export async function generateAssignmentQuestions(
  topic: string,
  materials: string[],
  teacherInstructions: string,
  questionCount: number,
  questionTypes: string[],
  generationCommands?: string
): Promise<GenerateQuestionsResponse> {
  const res = await fetch(`${API_BASE}/api/ai/generate-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      materials,
      teacherInstructions,
      questionCount,
      questionTypes: questionTypes.length ? questionTypes : ['multiple_choice'],
      generationCommands: generationCommands || '',
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Error generating questions.');
  }
  if (!body.data || !Array.isArray(body.data.questions)) {
    throw new Error('Invalid response from server.');
  }
  return body.data as GenerateQuestionsResponse;
}

export async function batchUpdateQuestions(
  currentQuestions: GenerateQuestionsResponse,
  command: string
): Promise<{ data: GenerateQuestionsResponse; message: string }> {
  const res = await fetch(`${API_BASE}/api/ai/batch-update-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentQuestions, command }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Error updating questions.');
  }
  if (!body.data || !Array.isArray(body.data.questions)) {
    throw new Error('Invalid response from server.');
  }
  return { data: body.data as GenerateQuestionsResponse, message: body.message || 'Questions updated.' };
}
