/**
 * Unit tests for core math utilities.
 *
 * Coverage targets:
 *   - factorial()  – pure function, all edge cases
 *   - fmt()        – number formatter, all output branches
 *   - evaluate()   – expression parser, all operator/function families
 *   - toRad()      – angle conversion
 *   - toDeg()      – angle conversion
 */

const { factorial, fmt, evaluate, toRad, toDeg } = require('./helpers/math');

// ─────────────────────────────────────────────
//  factorial()
// ─────────────────────────────────────────────
describe('factorial()', () => {
  test('0! = 1', () => expect(factorial(0)).toBe(1));
  test('1! = 1', () => expect(factorial(1)).toBe(1));
  test('5! = 120', () => expect(factorial(5)).toBe(120));
  test('7! = 5040', () => expect(factorial(7)).toBe(5040));
  test('10! = 3628800', () => expect(factorial(10)).toBe(3628800));

  test('fractional input is rounded before calculation', () => {
    expect(factorial(4.9)).toBe(factorial(5)); // rounds to 5
    expect(factorial(3.1)).toBe(factorial(3)); // rounds to 3
  });

  test('negative input returns NaN', () => {
    expect(factorial(-1)).toBeNaN();
    expect(factorial(-5)).toBeNaN();
  });

  test('n > 170 returns Infinity (JS float overflow)', () => {
    expect(factorial(171)).toBe(Infinity);
    expect(factorial(200)).toBe(Infinity);
  });

  // MISSING: no test currently exists for the boundary n = 170 (last finite value)
  test('170! is a finite number', () => {
    expect(isFinite(factorial(170))).toBe(true);
  });
});

// ─────────────────────────────────────────────
//  fmt()
// ─────────────────────────────────────────────
describe('fmt()', () => {
  test('integer below 1e15 renders without decimal', () => {
    expect(fmt(42)).toBe('42');
    expect(fmt(-7)).toBe('-7');
    expect(fmt(0)).toBe('0');
  });

  test('integer at/above 1e15 uses toPrecision(10)', () => {
    // 1e15 is NOT < 1e15, so goes through toPrecision branch
    const result = fmt(1e15);
    expect(result).toBe(String(parseFloat((1e15).toPrecision(10))));
  });

  test('float uses toPrecision(10)', () => {
    expect(fmt(3.141592653589793)).toBe('3.141592654');
  });

  test('Infinity renders as ∞', () => {
    expect(fmt(Infinity)).toBe('∞');
  });

  test('-Infinity renders as NaN (per source logic)', () => {
    // Source: if n === Infinity → '∞' else 'NaN' — so -Infinity → 'NaN'
    expect(fmt(-Infinity)).toBe('NaN');
  });

  test('NaN renders as NaN string', () => {
    expect(fmt(NaN)).toBe('NaN');
  });

  // MISSING: no test for very small floats (e.g. 1e-20)
  test('very small float uses toPrecision(10)', () => {
    expect(fmt(1e-20)).toBe(String(parseFloat((1e-20).toPrecision(10))));
  });
});

// ─────────────────────────────────────────────
//  toRad() / toDeg()
// ─────────────────────────────────────────────
describe('toRad() / toDeg()', () => {
  test('toRad converts degrees when degMode=true', () => {
    expect(toRad(180, true)).toBeCloseTo(Math.PI);
    expect(toRad(90, true)).toBeCloseTo(Math.PI / 2);
    expect(toRad(0, true)).toBe(0);
  });

  test('toRad passes value through when degMode=false', () => {
    expect(toRad(Math.PI, false)).toBeCloseTo(Math.PI);
    expect(toRad(1.5, false)).toBe(1.5);
  });

  test('toDeg converts radians when degMode=true', () => {
    expect(toDeg(Math.PI, true)).toBeCloseTo(180);
    expect(toDeg(Math.PI / 2, true)).toBeCloseTo(90);
    expect(toDeg(0, true)).toBe(0);
  });

  test('toDeg passes value through when degMode=false', () => {
    expect(toDeg(1.5, false)).toBe(1.5);
  });

  // MISSING: round-trip test (toRad → toDeg)
  test('toRad and toDeg are inverse operations', () => {
    const deg = 37;
    expect(toDeg(toRad(deg, true), true)).toBeCloseTo(deg);
  });
});

// ─────────────────────────────────────────────
//  evaluate() – basic arithmetic
// ─────────────────────────────────────────────
describe('evaluate() – arithmetic', () => {
  test('addition', () => expect(evaluate('1+2')).toBe(3));
  test('subtraction', () => expect(evaluate('10-4')).toBe(6));
  test('multiplication with ×', () => expect(evaluate('3×4')).toBe(12));
  test('division with ÷', () => expect(evaluate('8÷2')).toBe(4));
  test('division by zero yields Infinity', () => expect(evaluate('1÷0')).toBe(Infinity));
  test('operator precedence: 2+3×4 = 14', () => expect(evaluate('2+3×4')).toBe(14));
  test('parentheses override precedence', () => expect(evaluate('(2+3)×4')).toBe(20));

  // MISSING: negative number arithmetic
  test('unary minus via subtraction', () => expect(evaluate('0-5')).toBe(-5));
});

// ─────────────────────────────────────────────
//  evaluate() – power and roots
// ─────────────────────────────────────────────
describe('evaluate() – power and roots', () => {
  test('2^10 = 1024', () => expect(evaluate('2^10')).toBe(1024));
  test('3^4 = 81', () => expect(evaluate('3^4')).toBe(81));
  test('√(144) = 12', () => expect(evaluate('√(144)')).toBeCloseTo(12));
  test('√9 (no parens) = 3', () => expect(evaluate('√9')).toBeCloseTo(3));

  // MISSING: fractional exponents
  test('4^0.5 = 2', () => expect(evaluate('4^0.5')).toBeCloseTo(2));

  // MISSING: negative base with even exponent
  test('(-2)^2 via expression', () => expect(evaluate('(0-2)^2')).toBeCloseTo(4));
});

// ─────────────────────────────────────────────
//  evaluate() – trig (degree mode)
// ─────────────────────────────────────────────
describe('evaluate() – trigonometry (degree mode)', () => {
  const deg = { deg: true };

  test('sin(0°) = 0', () => expect(evaluate('sin(0)', deg)).toBeCloseTo(0));
  test('sin(30°) = 0.5', () => expect(evaluate('sin(30)', deg)).toBeCloseTo(0.5));
  test('sin(90°) = 1', () => expect(evaluate('sin(90)', deg)).toBeCloseTo(1));
  test('cos(0°) = 1', () => expect(evaluate('cos(0)', deg)).toBeCloseTo(1));
  test('cos(60°) = 0.5', () => expect(evaluate('cos(60)', deg)).toBeCloseTo(0.5));
  test('cos(180°) = -1', () => expect(evaluate('cos(180)', deg)).toBeCloseTo(-1));
  test('tan(45°) = 1', () => expect(evaluate('tan(45)', deg)).toBeCloseTo(1));
  test('tan(0°) = 0', () => expect(evaluate('tan(0)', deg)).toBeCloseTo(0));

  // Inverse trig
  test('asin(1) = 90°', () => expect(evaluate('asin(1)', deg)).toBeCloseTo(90));
  test('acos(0) = 90°', () => expect(evaluate('acos(0)', deg)).toBeCloseTo(90));
  test('atan(1) = 45°', () => expect(evaluate('atan(1)', deg)).toBeCloseTo(45));

  // Pythagorean identity
  // KNOWN BUG: greedy \S+ regex picks the last ^ so sin(45)^2+cos(45)^2 evaluates
  // incorrectly. The workaround in the app is to compute each term separately.
  // This test is marked failing to document the bug; fix in production evaluate().
  test.failing('sin²(45°) + cos²(45°) = 1 [BUG: greedy ^ regex]', () =>
    expect(evaluate('sin(45)^2+cos(45)^2', deg)).toBeCloseTo(1));

  // MISSING: tan(90°) should be very large (near Infinity) but not tested
  test('tan(90°) is very large (approaches Infinity)', () => {
    expect(Math.abs(evaluate('tan(90)', deg))).toBeGreaterThan(1e10);
  });
});

// ─────────────────────────────────────────────
//  evaluate() – trig (radian mode)
// ─────────────────────────────────────────────
describe('evaluate() – trigonometry (radian mode)', () => {
  const rad = { deg: false };

  test('sin(π/6) = 0.5', () => expect(evaluate('sin(0.5235987756)', rad)).toBeCloseTo(0.5));
  test('cos(π) = -1', () => expect(evaluate('cos(3.14159265)', rad)).toBeCloseTo(-1));

  // MISSING: explicit radian mode tests — the app supports RAD mode but it is untested
});

// ─────────────────────────────────────────────
//  evaluate() – logarithms and exponentials
// ─────────────────────────────────────────────
describe('evaluate() – logarithms', () => {
  test('log(1000) = 3', () => expect(evaluate('log(1000)')).toBeCloseTo(3));
  test('log(1) = 0', () => expect(evaluate('log(1)')).toBeCloseTo(0));
  test('log(100) = 2', () => expect(evaluate('log(100)')).toBeCloseTo(2));
  // KNOWN BUG: log(10^5) – the ^ inside the function arg is mangled by the greedy regex
  test.failing('log(10^5) = 5 [BUG: greedy ^ regex mangles nested pow inside log()]', () =>
    expect(evaluate('log(10^5)')).toBeCloseTo(5));
  test('log(10^5) workaround: log(100000) = 5', () =>
    expect(evaluate('log(100000)')).toBeCloseTo(5));
  test('ln(1) = 0', () => expect(evaluate('ln(1)')).toBeCloseTo(0));
  test('ln(e) = 1', () => expect(evaluate('ln(e)')).toBeCloseTo(1));
  // KNOWN BUG: ln(e^2) – same greedy ^ regex issue
  test.failing('ln(e²) = 2 [BUG: greedy ^ regex mangles e^2 inside ln()]', () =>
    expect(evaluate('ln(e^2)')).toBeCloseTo(2));
  test('e^(ln(3)) = 3', () => expect(evaluate('e^(ln(3))')).toBeCloseTo(3));

  // MISSING: log of negative number → NaN
  test('log of negative is NaN', () => expect(evaluate('log(0-1)')).toBeNaN());

  // MISSING: ln of zero → -Infinity
  test('ln(0) = -Infinity', () => expect(evaluate('ln(0)')).toBe(-Infinity));
});

// ─────────────────────────────────────────────
//  evaluate() – constants
// ─────────────────────────────────────────────
describe('evaluate() – constants', () => {
  test('π evaluates to Math.PI', () => expect(evaluate('π')).toBeCloseTo(Math.PI, 10));
  test('e evaluates to Math.E', () => expect(evaluate('e')).toBeCloseTo(Math.E, 10));
  test('2π ≈ 6.2832', () => expect(evaluate('2×π')).toBeCloseTo(2 * Math.PI));
});

// ─────────────────────────────────────────────
//  evaluate() – factorial via !
// ─────────────────────────────────────────────
describe('evaluate() – factorial operator', () => {
  test('5! = 120', () => expect(evaluate('5!')).toBe(120));
  test('7! = 5040', () => expect(evaluate('7!')).toBe(5040));
  test('10! = 3628800', () => expect(evaluate('10!')).toBe(3628800));
});

// ─────────────────────────────────────────────
//  evaluate() – absolute value
// ─────────────────────────────────────────────
describe('evaluate() – absolute value', () => {
  test('|-37| = 37', () => expect(evaluate('|-37|')).toBe(37));
  test('|5| = 5', () => expect(evaluate('|5|')).toBe(5));

  // MISSING: nested absolute value
  test('|0-10| = 10', () => expect(evaluate('|0-10|')).toBe(10));
});

// ─────────────────────────────────────────────
//  evaluate() – error handling
// ─────────────────────────────────────────────
describe('evaluate() – error handling', () => {
  test('malformed expression throws', () => {
    expect(() => evaluate('2+')).toThrow();
  });

  test('completely invalid input throws', () => {
    expect(() => evaluate('abc')).toThrow();
  });

  // MISSING: empty string input
  test('empty string throws', () => {
    expect(() => evaluate('')).toThrow();
  });

  // MISSING: unmatched parentheses
  test('unmatched parenthesis throws', () => {
    expect(() => evaluate('(2+3')).toThrow();
  });
});
