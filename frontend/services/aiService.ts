const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  includeSelectAllThatApply?: boolean
): Promise<GenerateQuestionsResponse> {
  const res = await fetch(`${API_BASE}/api/ai/generate-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      materials,
      teacherInstructions,
      questionCount,
      includeSelectAllThatApply: includeSelectAllThatApply ?? false,
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
