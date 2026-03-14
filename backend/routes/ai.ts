import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

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
    const { message, history = [], instructions = '' } = req.body as {
      message?: string;
      history?: { role: string; content: string }[];
      instructions?: string;
    };

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'message is required' });
    }

    const systemContent = `You are a helpful AI Tutor in the Lyrning LMS.
Teacher's specific restrictions: ${instructions || "Don't give the student the full answer directly. Guide them with hints and examples."}`;

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
    return res.json({ success: true, text });
  } catch (err) {
    console.error('Groq chat error:', err);
    return res.status(500).json({
      success: false,
      error: 'Unable to connect to AI Tutor.',
    });
  }
});

/** POST /api/ai/generate-questions — assignment questions from topic, materials, instructions, count */
router.post('/generate-questions', async (req: express.Request, res: express.Response) => {
  if (!groq) {
    return res.status(503).json({
      success: false,
      error: 'Groq API is not configured. Set GROQ_API_KEY in .env.',
    });
  }

  try {
    const { topic, materials = [], teacherInstructions = '', questionCount = 7, includeSelectAllThatApply = false } = req.body as {
      topic?: string;
      materials?: string[];
      teacherInstructions?: string;
      questionCount?: number;
      includeSelectAllThatApply?: boolean;
    };

    const safeCount = Math.max(1, Math.min(Number(questionCount) || 1, 30));
    const wantSelectAll = Boolean(includeSelectAllThatApply);

    const tutorBehavior = `You are an AI tutor integrated into a learning management system generating assignment questions.

Assignment question rules:
- Every question MUST include answers: one correct answer and incorrect options (distractors) where appropriate. For multiple-choice or select-all-that-apply, include the correct option(s) and wrong options. If the teacher asks for multiple correct answers, provide them. Do not output questions without answer options or without the correct answer indicated.
- Do NOT use the names of uploaded materials (e.g. file names, document titles) in the question text. Reference the content or concepts only; phrase questions so they stand on their own without mentioning PDF or handout names.`;

    const userContent = `${tutorBehavior}

Teacher instructions / constraints:
${teacherInstructions || 'No extra instructions provided.'}

Topic: "${topic || 'General course content'}"
Reference materials (use content only; do not mention these filenames in questions): ${Array.isArray(materials) && materials.length ? materials.join(', ') : 'None; rely on general textbook knowledge.'}

Task:
- Propose exactly ${safeCount} assessment questions for this assignment.
- Mix of conceptual understanding and application. Prefer multiple-choice with one correct answer and multiple false answers. ${wantSelectAll ? 'Include some "select all that apply" questions (use questionType "select_all_that_apply" and "correctAnswers" array with 2+ correct options); use the rest as multiple_choice.' : 'If the teacher requests "select all that apply" in instructions, use questionType "select_all_that_apply" and "correctAnswers" for those questions; otherwise use "multiple_choice" with a single "correctAnswer".'}

Output format: Return ONLY valid JSON (no markdown, no code fence, no extra text). Use this exact structure:
{
  "directions": "<short directions for students>",
  "questions": [
    {
      "questionNumber": 1,
      "question": "<question text>",
      "questionType": "multiple_choice" or "select_all_that_apply",
      "correctAnswer": "<single correct answer text>",
      "correctAnswers": ["<correct 1>", "<correct 2>", ...],
      "falseAnswers": ["<false answer 1>", "<false answer 2>", ...]
    }
  ]
}
- For multiple_choice: set "correctAnswer" and leave "correctAnswers" empty or omit it. Include at least one falseAnswer.
- For select_all_that_apply: set "correctAnswers" (array of 2+ correct option texts) and omit or leave "correctAnswer" empty. Include at least one falseAnswer.
Include exactly ${safeCount} items in the "questions" array.`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: userContent }],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    type Q = { questionNumber: number; question: string; questionType?: string; correctAnswer?: string; correctAnswers?: string[]; falseAnswers?: string[] };
    let data: { directions: string; questions: Q[] };
    try {
      const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      data = JSON.parse(jsonStr) as { directions?: string; questions?: Q[] };
      if (!Array.isArray(data?.questions)) {
        data = { directions: data?.directions ?? '', questions: [] };
      } else {
        data.questions = data.questions.map((q) => ({
          ...q,
          falseAnswers: Array.isArray(q.falseAnswers) ? q.falseAnswers : [],
        }));
      }
    } catch (parseErr) {
      console.error('Groq generate-questions parse error:', parseErr);
      return res.status(500).json({
        success: false,
        error: 'AI did not return valid JSON. Try again.',
      });
    }
    return res.json({ success: true, data });
  } catch (err) {
    console.error('Groq generate-questions error:', err);
    return res.status(500).json({
      success: false,
      error: 'Error generating questions.',
    });
  }
});

export default router;
