import { answersEquivalent, validateOptions, verifyBySubstitution } from './math.js';
import type { IndependentAnswer } from '../ai/solver.js';

export interface VerificationOutcome {
  status: 'VERIFIED' | 'NEEDS_REVIEW';
  method: string;
  note: string;
}

export function resolveCorrectIndex(
  options: string[],
  finalAnswer: string,
  hintedIndex: number,
): { index: number; note: string } {
  const matches = options
    .map((option, index) => (answersEquivalent(option, finalAnswer) ? index : -1))
    .filter((index) => index >= 0);
  if (matches.length === 1) {
    return { index: matches[0]!, note: '' };
  }
  if (matches.length > 1) {
    return {
      index: hintedIndex,
      note: 'Bir nechta variant hisoblangan javobga mos keladi.',
    };
  }
  return {
    index: hintedIndex,
    note: 'Hisoblangan javob variantlar orasidan aniq topilmadi.',
  };
}

export function evaluateVerification(input: {
  questionText: string;
  correctAnswer: string;
  options: string[];
  correctIndex: number;
  independent?: IndependentAnswer;
}): VerificationOutcome {
  const optionCheck = validateOptions(input.options, input.correctAnswer);
  if (!optionCheck.ok) {
    return {
      status: 'NEEDS_REVIEW',
      method: 'option_validation',
      note: `Variantlar yaroqli emas: ${optionCheck.issues.join(' ')}`,
    };
  }

  const substitution = verifyBySubstitution(input.questionText, input.correctAnswer);
  const independent = input.independent;
  const independentMatches =
    independent !== undefined && answersEquivalent(independent.finalAnswer, input.correctAnswer);
  const independentConfident = independent !== undefined && independent.confidence >= 0.72;

  if (substitution.status === 'contradiction') {
    return {
      status: 'NEEDS_REVIEW',
      method: 'substitution',
      note: substitution.note,
    };
  }
  if (substitution.status === 'verified') {
    if (independent === undefined) {
      return {
        status: 'VERIFIED',
        method: 'substitution',
        note: substitution.note,
      };
    }
    if (independentMatches) {
      return {
        status: 'VERIFIED',
        method: 'substitution+independent_ai',
        note: `${substitution.note} Mustaqil AI yechimi ham mos keldi.`,
      };
    }
    return {
      status: 'NEEDS_REVIEW',
      method: 'conflict',
      note: `${substitution.note} Ammo mustaqil AI yechimi boshqa javob berdi: ${independent.finalAnswer}.`,
    };
  }

  if (substitution.status === 'inconclusive') {
    if (independentMatches && independentConfident) {
      return {
        status: 'VERIFIED',
        method: 'independent_ai',
        note: `Mustaqil AI tekshiruvi mos keldi. ${substitution.note}`,
      };
    }
    return {
      status: 'NEEDS_REVIEW',
      method: 'symbolic',
      note: substitution.note,
    };
  }

  // Tenglamani aniqlab bo'lmadi — faqat ishonchli mustaqil AI yechimiga tayanamiz.
  if (independentMatches && independentConfident) {
    return {
      status: 'VERIFIED',
      method: 'independent_ai',
      note: `Mustaqil AI yechimi bilan tasdiqlandi (ishonch: ${Math.round(
        (independent?.confidence ?? 0) * 100,
      )}%). Tenglamani simvolik tekshirish qo‘llanmadi.`,
    };
  }
  return {
    status: 'NEEDS_REVIEW',
    method: 'unverified',
    note:
      independent === undefined
        ? 'Javobni mustaqil tekshirib bo‘lmadi (tenglama ham topilmadi).'
        : `Mustaqil AI yechimi mos kelmadi yoki ishonch past (${independent.finalAnswer}, ${Math.round(
            independent.confidence * 100,
          )}%).`,
  };
}
