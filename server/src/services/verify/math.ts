import nerdamer from 'nerdamer';
import 'nerdamer/Solve.js';
import { evaluate, parse } from 'mathjs';

/** LaTeX ifodani oddiy matematik sintaksisga aylantiradi. */
export function latexToPlain(input: string): string {
  let text = input;
  text = text.replace(/\$\$?/g, ' ');
  text = text.replace(/\\\(|\\\)|\\\[|\\\]/g, ' ');

  // \frac{a}{b}, \dfrac, \tfrac — ichma-ich qavslar bilan
  const frac = /\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g;
  for (let i = 0; i < 4; i += 1) {
    const next = text.replace(frac, '($1)/($2)');
    if (next === text) break;
    text = next;
  }

  // \sqrt[n]{a} va \sqrt{a}
  text = text.replace(/\\sqrt\s*\[([^\]]+)\]\s*\{([^{}]*)\}/g, '($2)^(1/($1))');
  for (let i = 0; i < 3; i += 1) {
    const next = text.replace(/\\sqrt\s*\{([^{}]*)\}/g, 'sqrt($1)');
    if (next === text) break;
    text = next;
  }

  text = text
    .replace(/\\left|\\right|\\displaystyle|\\limits/g, '')
    .replace(/\\cdot|\\times|\\ast/g, '*')
    .replace(/\\div/g, '/')
    .replace(/\\pi/g, 'pi')
    .replace(/\\infty/g, 'Infinity')
    .replace(/\\ge|\\geq/g, '>=')
    .replace(/\\le|\\leq/g, '<=')
    .replace(/\\neq|\\ne/g, '!=')
    .replace(/\\approx/g, '=')
    .replace(/\\pm/g, '+-')
    .replace(/\\circ/g, '')
    .replace(/\\degree/g, '')
    .replace(/\\text\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\mathrm\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\operatorname\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/\^\{([^{}]*)\}/g, '^($1)')
    .replace(/_\{([^{}]*)\}/g, '_($1)')
    .replace(/[{}]/g, (m) => (m === '{' ? '(' : ')'));

  text = text
    .replace(/[−–—]/g, '-')
    .replace(/[×·∙]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[²]/g, '^2')
    .replace(/[³]/g, '^3')
    .replace(/√/g, 'sqrt')
    .replace(/π/g, 'pi')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/≠/g, '!=')
    .replace(/∞/g, 'Infinity')
    .replace(/°/g, '')
    .replace(/[“”„]/g, '"');

  // O'nlik vergul: 3,5 -> 3.5
  text = text.replace(/(\d),(\d)/g, '$1.$2');
  return text.replace(/\s+/g, ' ').trim();
}

function safeNumber(value: string): number | null {
  const plain = latexToPlain(value)
    .replace(/^[a-zA-Z]\s*=\s*/, '')
    .replace(/[.;]+$/, '')
    .trim();
  if (!plain) return null;
  try {
    const node = parse(plain);
    const result = node.evaluate({});
    if (typeof result === 'number' && Number.isFinite(result)) return result;
    if (typeof result === 'boolean') return null;
  } catch {
    /* ignore */
  }
  try {
    const expr = nerdamer(plain);
    const numeric = Number(expr.evaluate().text('decimals'));
    if (Number.isFinite(numeric)) return numeric;
  } catch {
    /* ignore */
  }
  return null;
}

function normalizeAnswerText(value: string): string {
  return latexToPlain(value)
    .toLowerCase()
    .replace(/^[a-z]\s*=\s*/, '')
    .replace(/\s+/g, '')
    .replace(/[.;,]+$/, '')
    .replace(/\{|\}/g, '')
    .replace(/^\+/, '');
}

/** Ikki javob matematik jihatdan ekvivalentligini tekshiradi. */
export function answersEquivalent(a: string, b: string): boolean {
  const na = normalizeAnswerText(a);
  const nb = normalizeAnswerText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const numA = safeNumber(a);
  const numB = safeNumber(b);
  if (numA !== null && numB !== null) {
    const diff = Math.abs(numA - numB);
    return diff <= 1e-9 * Math.max(1, Math.abs(numA), Math.abs(numB));
  }

  try {
    const exprA = nerdamer(latexToPlain(a));
    const exprB = nerdamer(latexToPlain(b));
    const diff = nerdamer(`(${exprA.toString()})-(${exprB.toString()})`);
    const simplified = diff.toString();
    if (simplified === '0') return true;
    const numeric = Number(diff.evaluate().text('decimals'));
    if (Number.isFinite(numeric) && Math.abs(numeric) < 1e-9) return true;
  } catch {
    /* ignore */
  }

  // To'plamlar: {1,2} va {2,1}
  if (/^[{(]/.test(na) && /^[{(]/.test(nb)) {
    const sa = splitSet(a);
    const sb = splitSet(b);
    if (sa && sb && sa.length === sb.length) {
      return sa.every((item) => sb.some((other) => answersEquivalent(item, other)));
    }
  }
  return false;
}

function splitSet(value: string): string[] | null {
  const plain = latexToPlain(value).trim();
  if (!/^[({[]/.test(plain) || !/[)\]}]$/.test(plain)) return null;
  const inner = plain.slice(1, -1);
  const depth = { open: 0 };
  const parts: string[] = [];
  let current = '';
  for (const char of inner) {
    if (char === '(' || char === '[') depth.open += 1;
    if (char === ')' || char === ']') depth.open -= 1;
    if (char === ',' && depth.open === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.filter(Boolean);
}

export interface OptionValidation {
  ok: boolean;
  issues: string[];
  correctIndexes: number[];
}

/** To'rttalik variantlarni tekshiradi: takrorlar, yagona to'g'ri javob. */
export function validateOptions(
  options: string[],
  correctAnswer: string,
): OptionValidation {
  const issues: string[] = [];
  if (options.length !== 4) issues.push('Aynan 4 ta variant bo‘lishi kerak.');
  if (options.some((option) => !option || !option.trim())) {
    issues.push('Bo‘sh variant mavjud.');
  }

  for (let i = 0; i < options.length; i += 1) {
    for (let j = i + 1; j < options.length; j += 1) {
      if (answersEquivalent(options[i]!, options[j]!)) {
        issues.push(`Variantlar takrorlanadi: ${i + 1} va ${j + 1}.`);
      }
    }
  }

  const correctIndexes = options
    .map((option, index) => (answersEquivalent(option, correctAnswer) ? index : -1))
    .filter((index) => index >= 0);
  if (correctIndexes.length !== 1) {
    issues.push(
      correctIndexes.length === 0
        ? 'To‘g‘ri javob variantlar orasida topilmadi.'
        : 'Bir nechta variant to‘g‘ri javobga mos keladi.',
    );
  }

  return { ok: issues.length === 0, issues, correctIndexes };
}

export interface SubstitutionResult {
  status: 'verified' | 'inconclusive' | 'contradiction' | 'unsupported';
  note: string;
}

const VARIABLE_SKIP = new Set([
  'e',
  'i',
  'pi',
  'sin',
  'cos',
  'tan',
  'cot',
  'log',
  'ln',
  'sqrt',
  'abs',
  's',
  'm',
  'sm',
  'km',
  'mm',
  'kg',
  'min',
  'soat',
]);

/**
 * Tenglamaga javobni qo'yib tekshiradi (SymPy uslubidagi mustaqil tekshiruv).
 * Faqat bitta noma'lumli tenglamalar qo'llab-quvvatlanadi.
 */
export function verifyBySubstitution(questionText: string, answer: string): SubstitutionResult {
  const plain = latexToPlain(questionText);
  const candidate = safeNumber(answer);
  if (candidate === null) {
    return { status: 'unsupported', note: 'Javob son sifatida o‘qilmadi.' };
  }

  const segments = plain.split(/[;\n]|(?:\s{2,})/);
  const equations: string[] = [];
  for (const segment of segments) {
    const matches = segment.match(/[^,.\n]{1,140}=[^,.\n]{1,140}/g) ?? [];
    for (const raw of matches) {
      const trimmed = raw.trim().replace(/^[^a-zA-Z0-9(]*/, '');
      if (!trimmed.includes('=')) continue;
      const sides = trimmed.split('=');
      if (sides.length !== 2) continue;
      const [left, right] = sides;
      if (!left?.trim() || !right?.trim()) continue;
      // "Javob: x = 5" kabi trivial tenglamalarni o'tkazib yuboramiz.
      if (/^\s*[a-zA-Z]\s*$/.test(left) && /^\s*-?\d+(\.\d+)?\s*$/.test(right)) continue;
      equations.push(trimmed);
    }
  }

  if (equations.length === 0) {
    return { status: 'unsupported', note: 'Savolda tekshiriladigan tenglama topilmadi.' };
  }

  let checked = 0;
  let multiRootIssue = '';
  for (const equation of equations) {
    const [leftRaw, rightRaw] = equation.split('=') as [string, string];
    let variables: string[] = [];
    try {
      const left = parse(leftRaw);
      const right = parse(rightRaw);
      const names = new Set<string>();
      left.traverse((node) => {
        if (node.type === 'SymbolNode') names.add((node as unknown as { name: string }).name);
      });
      right.traverse((node) => {
        if (node.type === 'SymbolNode') names.add((node as unknown as { name: string }).name);
      });
      variables = [...names].filter(
        (name) => /^[a-zA-Z]$/.test(name) && !VARIABLE_SKIP.has(name),
      );
    } catch {
      continue;
    }
    if (variables.length !== 1) continue;
    const variable = variables[0]!;

    let leftValue: unknown;
    let rightValue: unknown;
    try {
      leftValue = parse(leftRaw).evaluate({ [variable]: candidate });
      rightValue = parse(rightRaw).evaluate({ [variable]: candidate });
    } catch {
      continue;
    }
    if (typeof leftValue !== 'number' || typeof rightValue !== 'number') continue;
    checked += 1;

    // Ko'p ildizli tenglamalarda to'liq yechim to'plami kerak.
    try {
      const expression = nerdamer(`(${leftRaw})-(${rightRaw})`);
      const degreeText = nerdamer(`deg(${expression.toString()}, ${variable})`).toString();
      const degree = Number(degreeText);
      if (Number.isFinite(degree) && degree > 1) {
        const solveFn = (
          nerdamer as unknown as { solve: (equation: string, variable: string) => { toString(): string } }
        ).solve;
        const roots = solveFn(`${expression.toString()}=0`, variable).toString();
        const rootList: string[] = roots
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map((item: string) => item.trim())
          .filter(Boolean);
        const uniqueRoots = rootList.filter(
          (root: string, index: number) =>
            rootList.findIndex((other: string) => answersEquivalent(root, other)) === index,
        );
        const answerCoversAll = uniqueRoots.every((root: string) => answersEquivalent(root, answer));
        if (uniqueRoots.length > 1 && !answerCoversAll) {
          multiRootIssue =
            'Tenglama bir nechta yechimga ega; javob to‘liq yechim to‘plamini qamramaydi.';
        }
      }
    } catch {
      /* darajani aniqlab bo'lmadi — pastdagi tekshiruvga tayanamiz */
    }

    const tolerance = 1e-8 * Math.max(1, Math.abs(leftValue), Math.abs(rightValue));
    if (Math.abs(leftValue - rightValue) > tolerance) {
      return {
        status: 'contradiction',
        note: `Javob tenglamaga qo‘yilganda tenglik bajarilmadi (${leftValue} ≠ ${rightValue}).`,
      };
    }
  }

  if (checked === 0) {
    return { status: 'unsupported', note: 'Tenglama tuzilishini aniqlab bo‘lmadi.' };
  }
  if (multiRootIssue) {
    return { status: 'inconclusive', note: multiRootIssue };
  }
  return {
    status: 'verified',
    note: `Javob tenglamaga qo‘yib tekshirildi (${checked} ta tenglama).`,
  };
}

export function parseNumeric(value: string): number | null {
  return safeNumber(value);
}
