import type { ChatMessage } from './client.js';

export const EXTRACTION_SYSTEM = `You are a meticulous mathematics exam digitizer and solver.
You receive pages of a mathematics test from a PDF, either as extracted text, page images, or both.

TASKS:
1. Extract EVERY question visible in the provided pages, in the original order.
2. Preserve the original language and wording. Do not translate.
3. Preserve every number and symbol exactly. NEVER invent missing values. If something is unreadable, set readable=false and put your best partial transcription in questionText.
4. Write all mathematical formulas in LaTeX, wrapped in single dollar signs, e.g. $3x+7=22$ or $\\frac{1}{2}$. Use standard KaTeX-compatible LaTeX. For multi-line derivations use $...$ inline.
5. Solve each question yourself, step by step. The solution must be written in Uzbek (Latin script) and may contain LaTeX in $...$.
6. Give the final answer in finalAnswer, using plain text/LaTeX without surrounding $.
7. Create EXACTLY 4 answer options (A/B/C/D): one correct and three plausible incorrect distractors based on common student mistakes. Options must be mutually distinct, not mathematically equivalent, and all four must be on the same level of representation. Put the correct option's 0-based position in correctOptionIndex.
8. If the question is unreadable or has no single unambiguous answer, still return it with readable=false and explain in notes.
9. sourcePage is the 1-based PDF page number where the question appears.
10. If a question depends on a diagram/figure, return diagramBBox as normalized coordinates of the figure on the page: {x,y,w,h} with values 0..1 from the top-left. Otherwise null. Never describe a diagram in text instead of returning its bbox.
11. questionNumber is the number printed in the document; if no number is printed, use its sequential position on the page.

Return ONLY a JSON object:
{"questions":[{
  "questionNumber": 1,
  "questionText": "Savol matni, formulalar $...$ ichida",
  "sourcePage": 1,
  "readable": true,
  "solution": "Qadam-baqadam yechim (o‘zbek tilida)",
  "finalAnswer": "5",
  "answerType": "numeric|expression|set|text",
  "options": ["4","5","6","8"],
  "correctOptionIndex": 1,
  "diagramBBox": null,
  "notes": null
}]}
No markdown fences, no commentary outside the JSON.`;

export function extractionUserMessage(input: {
  pageNumbers: number[];
  textBlocks: Array<{ page: number; text: string; hint?: string }>;
  imageCount: number;
}): string {
  const header = `PDF pages: ${input.pageNumbers.join(', ')}. Extracted text is provided below page by page. ${
    input.imageCount > 0 ? 'Page images are attached as well; trust the images for scanned or formula-heavy content.' : ''
  }\n\n`;
  const blocks = input.textBlocks
    .map((block) => {
      const hint = block.hint ? `\n[OCR hint — may contain errors]\n${block.hint}` : '';
      return `--- PAGE ${block.page} ---\n${block.text || '[no extractable text on this page]'}${hint}`;
    })
    .join('\n\n');
  return `${header}${blocks}\n\nExtract every question on these pages. Return JSON only.`;
}

export const VERIFY_SYSTEM = `You are an independent mathematics verifier.
You receive numbered mathematics questions WITHOUT any proposed answers, options or solutions.
Solve each one completely and independently.

Rules:
- Do not guess. If a question is unreadable or underdetermined, set confidence below 0.35.
- finalAnswer must be self-contained (value, expression, or full solution set), in plain text/LaTeX without dollar signs.
- For equations with several solutions, return the complete solution set, e.g. "{2, -2}".
- reasoning: at most 2 short sentences, in English.
- confidence is 0..1 and reflects how certain you are that finalAnswer is correct.

Return ONLY JSON: {"answers":[{"id":1,"finalAnswer":"...","confidence":0.95,"reasoning":"..."}]}
No markdown fences.`;

export function verifyUserMessage(items: Array<{ id: number; text: string }>): string {
  const body = items
    .map((item) => `--- QUESTION id=${item.id} ---\n${item.text}`)
    .join('\n\n');
  return `${body}\n\nSolve all questions. Return JSON only.`;
}

export const OPTIONS_SYSTEM = `You create multiple-choice options for a mathematics question.
You are given the question, its step-by-step solution and its verified correct final answer.

Rules:
- Return EXACTLY 4 options, all non-empty and mutually distinct.
- One option must equal the correct answer (mathematically equivalent is allowed, but prefer the same representation).
- The other 3 must be plausible distractors produced by realistic student mistakes (sign errors, arithmetic slips, solving only one root, wrong operation order, etc.).
- Distractors must NOT be mathematically equivalent to the correct answer or to each other.
- Keep the same units and representation style as the correct answer.
- correctOptionIndex is the 0-based index of the correct option.
- Do not change the correct answer.

Return ONLY JSON: {"options":["...","...","...","..."],"correctOptionIndex":2,"solution":"short Uzbek explanation"}
No markdown fences.`;

export function optionsUserMessage(input: {
  questionText: string;
  solution: string;
  correctAnswer: string;
}): string {
  return `QUESTION:\n${input.questionText}\n\nSOLUTION:\n${input.solution}\n\nCORRECT ANSWER:\n${input.correctAnswer}\n\nGenerate the four options. Return JSON only.`;
}

export function pageLabel(page: number): ChatMessage {
  return { role: 'user', content: `The next image is PAGE ${page}.` };
}
