import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';
import { query } from '../db/connection.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const groq = process.env.GROQ_API_KEY
  ? new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  : null;

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';

/** POST /api/ai/chat — tutor chat (student message + history + teacher instructions) */
router.post('/chat', async (req: express.Request, res: express.Response) => {
  if (!groq) {
    return res.status(503).json({
      success: false,
      error: 'Groq API is not configured. Set GROQ_API_KEY in .env.',
    });
  }

  try {
    const { message, history = [], instructions = '', studentId, assignmentContext = '' } = req.body as {
      message?: string;
      history?: { role: string; content: string }[];
      instructions?: string;
      studentId?: number;
      assignmentId?: number;
      attemptNumber?: number;
      assignmentContext?: string;
    };
    const assignmentId = Number((req.body as { assignmentId?: unknown })?.assignmentId);
    const attemptNumber = Number((req.body as { attemptNumber?: unknown })?.attemptNumber);

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'message is required' });
    }

    const hasChatSessionKeys =
      Number.isFinite(Number(studentId)) &&
      Number(studentId) > 0 &&
      Number.isFinite(assignmentId) &&
      assignmentId > 0 &&
      Number.isFinite(attemptNumber) &&
      attemptNumber > 0;

    // Persist each new student message before forwarding to the AI.
    if (hasChatSessionKeys) {
      await query(
        `INSERT INTO student_chat_messages (student_id, assignment_id, attempt_number, role, content)
         VALUES ($1, $2, $3, $4, $5)`,
        [Number(studentId), assignmentId, attemptNumber, 'user', message]
      );
    }

    // Log AI usage if studentId provided
    if (studentId && Number.isFinite(studentId)) {
      await query(
        `INSERT INTO ai_usage_logs (student_id, action, details) VALUES ($1, $2, $3)`,
        [studentId, 'chat', { messageLength: message.length, historyLength: history.length, assignmentId, attemptNumber }]
      );
    }

    const systemContent = `You are a helpful AI Tutor in the Lyrning LMS.
  You must strictly follow the teacher's restrictions exactly. If a student asks for something that violates those restrictions, refuse and provide only the level of help allowed.
  Teacher's specific restrictions: ${instructions || "Don't give the student the full answer directly. Guide them with hints and examples."}
${assignmentContext ? `\nHere is the assignment context to help you assist the student (DO NOT reveal answers directly — guide them with hints and explanations instead):\n${assignmentContext}` : ''}`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
      ...history.map((h) => ({
        role: (h.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: message },
    ];

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
    });

    const text = completion.choices[0]?.message?.content ?? "I'm having trouble thinking right now. Could you rephrase that?";

    // Persist tutor response for the current session snapshot.
    if (hasChatSessionKeys) {
      await query(
        `INSERT INTO student_chat_messages (student_id, assignment_id, attempt_number, role, content)
         VALUES ($1, $2, $3, $4, $5)`,
        [Number(studentId), assignmentId, attemptNumber, 'assistant', text]
      );
    }

    return res.json({ success: true, text });
  } catch (err) {
    console.error('Groq chat error:', err);
    return res.status(500).json({
      success: false,
      error: 'Unable to connect to AI Tutor.',
    });
  }
});

/** POST /api/ai/extract-pdf-text — extract text from uploaded PDF(s); returns { texts: string[] } */
router.post('/extract-pdf-text', upload.array('pdfs', 10), async (req: express.Request, res: express.Response) => {
  try {
    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (!files?.length) {
      return res.status(400).json({ success: false, error: 'At least one PDF file is required (field: pdfs)' });
    }
    const texts: string[] = [];
    for (const file of files) {
      if (!file.buffer?.length || file.mimetype !== 'application/pdf') {
        texts.push('');
        continue;
      }
      try {
        const parser = new PDFParse({ data: file.buffer });
        const result = await parser.getText();
        await parser.destroy();
        const text = (result?.text ?? '').trim();
        texts.push(text || `[No text extracted from ${file.originalname}]`);
      } catch (err) {
        console.error('PDF extract error for', file.originalname, err);
        texts.push(`[Error extracting text from ${file.originalname}]`);
      }
    }
    return res.json({ success: true, texts });
  } catch (err) {
    console.error('extract-pdf-text error:', err);
    return res.status(500).json({ success: false, error: 'Failed to extract text from PDFs' });
  }
});

const QUESTION_TYPES = ['multiple_choice', 'true_false', 'short_answer', 'select_all_that_apply'] as const;

/** POST /api/ai/generate-questions — assignment questions from topic, materials, instructions, count, questionTypes, generationCommands */
router.post('/generate-questions', async (req: express.Request, res: express.Response) => {
  if (!groq) {
    return res.status(503).json({
      success: false,
      error: 'Groq API is not configured. Set GROQ_API_KEY in .env.',
    });
  }

  try {
    const {
      topic,
      materials = [],
      teacherInstructions = '',
      questionCount = 7,
      questionTypes: requestedTypes = ['multiple_choice'],
      generationCommands = '',
    } = req.body as {
      topic?: string;
      materials?: string[];
      teacherInstructions?: string;
      questionCount?: number;
      questionTypes?: string[];
      generationCommands?: string;
    };

    const safeCount = Math.max(1, Math.min(Number(questionCount) || 1, 30));
    const types: string[] = Array.isArray(requestedTypes)
      ? requestedTypes.filter((t) => typeof t === 'string' && QUESTION_TYPES.includes(t as typeof QUESTION_TYPES[number]))
      : ['multiple_choice'];
    if (types.length === 0) types.push('multiple_choice');

    const tutorBehavior = `You are an AI tutor integrated into a learning management system generating assignment questions.

Assignment question rules:
- Every question MUST include answers: one correct answer and incorrect options (distractors) where appropriate, except for short_answer which may have a single correct answer text only.
- Do NOT use the names of uploaded materials in the question text. Reference the content or concepts only.
- You MUST generate ONLY the following question type(s): ${types.join(', ')}. Do not add any other types.`;

    const typeRules = [
      types.includes('multiple_choice') &&
        'multiple_choice: one "correctAnswer" and "falseAnswers" array; questionType "multiple_choice".',
      types.includes('true_false') &&
        'true_false: questionType "true_false"; correctAnswer "True" or "False"; falseAnswers the other.',
      types.includes('short_answer') &&
        'short_answer: questionType "short_answer"; correctAnswer the expected answer; falseAnswers can be empty array.',
      types.includes('select_all_that_apply') &&
        'select_all_that_apply: questionType "select_all_that_apply"; "correctAnswers" array (2+); include falseAnswers.',
    ]
      .filter(Boolean)
      .join('\n- ');

    const userContent = `${tutorBehavior}

Teacher instructions / constraints:
${teacherInstructions || 'No extra instructions provided.'}
${generationCommands ? `\nQuestion generation commands (follow these): ${generationCommands}` : ''}

Topic: "${topic || 'General course content'}"

Uploaded document content below. Use this content to generate accurate questions. Do not mention filenames or "document" in the question text.
${Array.isArray(materials) && materials.length
  ? materials
      .map((t, i) => `--- Document ${i + 1} ---\n${typeof t === 'string' ? t.slice(0, 80000) : ''}`)
      .join('\n\n')
  : 'No document content provided.'}

Task: Propose exactly ${safeCount} questions. Only use these types: ${types.join(', ')}.
- ${typeRules}

Output format: Return ONLY valid JSON (no markdown, no code fence). Structure:
{
  "directions": "<short directions for students>",
  "questions": [
    {
      "questionNumber": 1,
      "question": "<question text>",
      "questionType": "multiple_choice" | "true_false" | "short_answer" | "select_all_that_apply",
      "correctAnswer": "<single correct answer>",
      "correctAnswers": ["<correct 1>", "<correct 2>"],
      "falseAnswers": ["<wrong option 1>", ...]
    }
  ]
}
Include exactly ${safeCount} items in "questions".`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: userContent }],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    type Q = { questionNumber: number; question: string; questionType?: string; correctAnswer?: string; correctAnswers?: string[]; falseAnswers?: string[] };
    let data: { directions: string; questions: Q[] };
    try {
      const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(jsonStr) as { directions?: string; questions?: Q[] };
      if (!Array.isArray(parsed?.questions)) {
        data = { directions: parsed?.directions ?? '', questions: [] };
      } else {
        data = {
          directions: parsed.directions ?? '',
          questions: parsed.questions.map((q) => ({
          ...q,
          questionType: types.includes(q.questionType ?? '') ? q.questionType : types[0],
          falseAnswers: Array.isArray(q.falseAnswers) ? q.falseAnswers : [],
          })),
        };
      }
    } catch (parseErr) {
      console.error('Groq generate-questions parse error:', parseErr);
      return res.status(500).json({
        success: false,
        error: 'AI did not return valid JSON. Try again.',
      });
    }
    let pdfSummary: string | null = null;
    if (Array.isArray(materials) && materials.length && materials.some((t) => typeof t === 'string' && t.length > 0)) {
      try {
        const summaryCompletion = await groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [{
            role: 'user',
            content: `Summarize the following document content in 2-4 paragraphs for a student study aid. Focus on key concepts, definitions, and main ideas:\n\n${materials.map((t, i) => `--- Document ${i + 1} ---\n${typeof t === 'string' ? t.slice(0, 40000) : ''}`).join('\n\n')}`,
          }],
        });
        pdfSummary = summaryCompletion.choices[0]?.message?.content?.trim() || null;
      } catch (summaryErr) {
        console.error('PDF summary generation error (non-fatal):', summaryErr);
      }
    }

    return res.json({ success: true, data, pdfSummary });
  } catch (err) {
    console.error('Groq generate-questions error:', err);
    return res.status(500).json({
      success: false,
      error: 'Error generating questions.',
    });
  }
});

/** POST /api/ai/batch-update-questions — apply a teacher command to update all questions, return new JSON + message */
router.post('/batch-update-questions', async (req: express.Request, res: express.Response) => {
  if (!groq) {
    return res.status(503).json({
      success: false,
      error: 'Groq API is not configured. Set GROQ_API_KEY in .env.',
    });
  }

  try {
    const { currentQuestions, command } = req.body as {
      currentQuestions?: { directions: string; questions: { questionNumber: number; question: string; questionType?: string; correctAnswer?: string; correctAnswers?: string[]; falseAnswers?: string[] }[] };
      command?: string;
    };

    if (!currentQuestions || !Array.isArray(currentQuestions.questions) || !command || typeof command !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'currentQuestions (with directions and questions array) and command are required.',
      });
    }

    const prompt = `You are helping a teacher edit assignment questions. They want to apply this change to ALL questions:

"${command.trim()}"

Current assignment (JSON):
${JSON.stringify(currentQuestions, null, 2)}

Task:
1. Apply the teacher's request to the questions (and directions if relevant). Output the full updated JSON in the same structure: { "directions": "...", "questions": [ ... ] }.
2. In a short sentence (one line), summarize what you changed (e.g. "I made the wording more complex and added one distractor per question."). Put that summary on a single line after the JSON.

Return ONLY: first the complete JSON (valid, no markdown fence), then a blank line, then the one-line summary. No other text.`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    const jsonEnd = raw.indexOf('\n\n');
    const jsonStr = (jsonEnd > 0 ? raw.slice(0, jsonEnd) : raw).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const summary = jsonEnd > 0 ? raw.slice(jsonEnd).trim().split('\n')[0] : 'Questions updated.';

    type Q = { questionNumber: number; question: string; questionType?: string; correctAnswer?: string; correctAnswers?: string[]; falseAnswers?: string[] };
    let data: { directions: string; questions: Q[] };
    try {
      const parsed = JSON.parse(jsonStr) as { directions?: string; questions?: Q[] };
      if (!Array.isArray(parsed?.questions)) {
        data = { directions: parsed?.directions ?? currentQuestions.directions, questions: [] };
      } else {
        data = {
          directions: parsed.directions ?? currentQuestions.directions,
          questions: parsed.questions.map((q) => ({
            ...q,
            falseAnswers: Array.isArray(q.falseAnswers) ? q.falseAnswers : [],
          })),
        };
      }
    } catch {
      return res.status(500).json({
        success: false,
        error: 'AI did not return valid JSON. Try again.',
      });
    }
    return res.json({ success: true, data, message: summary });
  } catch (err) {
    console.error('Groq batch-update-questions error:', err);
    return res.status(500).json({
      success: false,
      error: 'Error updating questions.',
    });
  }
});

export default router;
