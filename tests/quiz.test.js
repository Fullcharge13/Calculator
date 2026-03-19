/**
 * Unit tests for quiz bank and question-selection logic.
 *
 * Coverage targets:
 *   - QB              – data integrity of all question banks
 *   - pickQ()         – random selection, exhaustion/reset, deduplication
 *   - checkAnswer()   – tolerance-based answer grading
 */

const { QB, pickQ, checkAnswer } = require('./helpers/quiz');
const { evaluate } = require('./helpers/math');

// ─────────────────────────────────────────────
//  Question bank – structural integrity
// ─────────────────────────────────────────────
describe('QB – structure', () => {
  const LEVELS = ['basic', 'mid', 'advanced'];

  test.each(LEVELS)('%s bank has exactly 12 questions', (level) => {
    expect(QB[level]).toHaveLength(12);
  });

  test.each(LEVELS)('%s questions all have q, a, and hint fields', (level) => {
    QB[level].forEach((item, i) => {
      expect(item).toHaveProperty('q');
      expect(item).toHaveProperty('a');
      expect(item).toHaveProperty('hint');
      expect(typeof item.q).toBe('string');
      expect(typeof item.a).toBe('number');
    });
  });

  test.each(LEVELS)('%s expected answers are all finite numbers', (level) => {
    QB[level].forEach((item) => {
      expect(isFinite(item.a)).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────
//  QB – answer correctness (math validation)
// ─────────────────────────────────────────────
describe('QB – answer correctness via evaluate()', () => {
  const DEG = { deg: true };
  const RAD = { deg: false };

  // Basic arithmetic answers
  const basicCases = [
    ['15 + 28',    43],
    ['72÷8',       9],
    ['13×7',       91],
    ['256-89',     167],
    ['√144',       12],
    ['2^10',       1024],
    ['|0-37|',     37],
    ['7!',         5040],
    ['3^4',        81],
    ['√625',       25],
    ['9×9-18',     63],
  ];
  test.each(basicCases)('evaluate(%s) ≈ %d', (expr, expected) => {
    expect(evaluate(expr, DEG)).toBeCloseTo(expected, 6);
  });

  // Trig answers (degree mode)
  const trigCases = [
    ['sin(30)',        0.5],
    ['cos(60)',        0.5],
    ['tan(45)',        1],
    ['sin(90)',        1],
    ['cos(0)',         1],
    ['tan(0)',         0],
    ['cos(180)',       -1],
    ['sin(45)^2+cos(45)^2', 1],
  ];
  // sin²(45°)+cos²(45°) is known-buggy due to greedy ^ regex – skip in this suite
  const trigCasesFiltered = trigCases.filter(([expr]) => !expr.includes('^'));
  test.each(trigCasesFiltered)('evaluate(%s, deg) ≈ %d', (expr, expected) => {
    expect(evaluate(expr, DEG)).toBeCloseTo(expected, 6);
  });
  test.failing('sin²(45°)+cos²(45°)=1 [BUG: greedy ^ regex]', () =>
    expect(evaluate('sin(45)^2+cos(45)^2', DEG)).toBeCloseTo(1, 6));

  // Inverse trig answers
  test('asin(1) = 90°', () => expect(evaluate('asin(1)', DEG)).toBeCloseTo(90));
  test('acos(0) = 90°', () => expect(evaluate('acos(0)', DEG)).toBeCloseTo(90));
  test('atan(1) = 45°', () => expect(evaluate('atan(1)', DEG)).toBeCloseTo(45));

  // Log / ln answers
  test('log(1000) = 3', () => expect(evaluate('log(1000)', DEG)).toBeCloseTo(3));
  test('log(1) = 0',    () => expect(evaluate('log(1)', DEG)).toBeCloseTo(0));
  test('log(100) = 2',  () => expect(evaluate('log(100)', DEG)).toBeCloseTo(2));
  test.failing('log(10^5) = 5 [BUG: greedy ^ regex]', () =>
    expect(evaluate('log(10^5)', DEG)).toBeCloseTo(5));
  test('log(100000) = 5 (workaround)',
    () => expect(evaluate('log(100000)', DEG)).toBeCloseTo(5));
  test('ln(e) = 1',     () => expect(evaluate('ln(e)', DEG)).toBeCloseTo(1));
  test.failing('ln(e^2) = 2 [BUG: greedy ^ regex]', () =>
    expect(evaluate('ln(e^2)', DEG)).toBeCloseTo(2));
  test('e^(ln(3)) = 3', () => expect(evaluate('e^(ln(3))', DEG)).toBeCloseTo(3));
  test('ln(1) = 0',     () => expect(evaluate('ln(1)', DEG)).toBeCloseTo(0));
  test('10! = 3628800', () => expect(evaluate('10!', DEG)).toBe(3628800));

  // MISSING: "15% of 200" – the quiz expects 30 but the calculator has no % operator defined
  // in evaluate(); this is a known gap that should be documented and either fixed or excluded.
  test.skip('15% of 200 = 30 (% operator not yet implemented in evaluate())', () => {
    expect(evaluate('200×0.15', DEG)).toBeCloseTo(30); // workaround hint
  });
});

// ─────────────────────────────────────────────
//  pickQ() – selection behaviour
// ─────────────────────────────────────────────
describe('pickQ()', () => {
  const LEVELS = ['basic', 'mid', 'advanced'];

  test.each(LEVELS)('returns a question object with q, a, idx for %s', (level) => {
    const { question } = pickQ(level, []);
    expect(question).toHaveProperty('q');
    expect(question).toHaveProperty('a');
    expect(question).toHaveProperty('idx');
  });

  test.each(LEVELS)('idx is within valid range for %s', (level) => {
    const { question } = pickQ(level, []);
    expect(question.idx).toBeGreaterThanOrEqual(0);
    expect(question.idx).toBeLessThan(QB[level].length);
  });

  test('does not repeat the same question until the bank is exhausted', () => {
    let usedQ = [];
    const seen = new Set();
    for (let i = 0; i < 12; i++) {
      const { question, usedQ: next } = pickQ('basic', usedQ);
      expect(seen.has(question.idx)).toBe(false);
      seen.add(question.idx);
      usedQ = next;
    }
  });

  test('resets usedQ when the entire bank has been shown', () => {
    // Exhaust the bank
    let usedQ = QB.basic.map((_, i) => i); // all indices used
    const { question } = pickQ('basic', usedQ);
    // Should get a valid question even though all were "used"
    expect(question).toHaveProperty('idx');
  });

  // MISSING: verify randomness is uniform (statistical smoke-test)
  test('all questions have a non-zero chance of being selected', () => {
    const counts = new Array(12).fill(0);
    const RUNS = 5000;
    for (let i = 0; i < RUNS; i++) {
      const { question } = pickQ('basic', []);
      counts[question.idx]++;
    }
    counts.forEach((c) => {
      // Each question should appear roughly 1/12 of the time; allow ±50% slack
      expect(c).toBeGreaterThan(RUNS / 12 / 2);
    });
  });
});

// ─────────────────────────────────────────────
//  checkAnswer()
// ─────────────────────────────────────────────
describe('checkAnswer()', () => {
  test('exact match returns true', () => {
    expect(checkAnswer(42, 42)).toBe(true);
  });

  test('within default tolerance (1e-6) returns true', () => {
    expect(checkAnswer(0.5000001, 0.5)).toBe(true);
  });

  test('outside default tolerance returns false', () => {
    expect(checkAnswer(0.50001, 0.5)).toBe(false);
  });

  test('custom tolerance is respected', () => {
    expect(checkAnswer(0.501, 0.5, 0.01)).toBe(true);
    expect(checkAnswer(0.52, 0.5, 0.01)).toBe(false);
  });

  test('negative values compared correctly', () => {
    expect(checkAnswer(-1, -1)).toBe(true);
    expect(checkAnswer(-0.999999, -1, 1e-5)).toBe(true);
  });

  // MISSING: NaN input handling
  test('NaN user answer returns false', () => {
    expect(checkAnswer(NaN, 5)).toBe(false);
  });

  // MISSING: Infinity
  test('Infinity user answer returns false for finite expected', () => {
    expect(checkAnswer(Infinity, 5)).toBe(false);
  });
});
