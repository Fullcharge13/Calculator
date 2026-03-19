/**
 * Pure math utilities extracted from Dog Engineering Calculator.
 * These mirror the logic in v1/v2 HTML files so they can be unit-tested
 * without a DOM or global state.
 */

/**
 * @param {number} n
 * @returns {number}
 */
function factorial(n) {
  n = Math.round(n);
  if (n < 0) return NaN;
  if (n <= 1) return 1;
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/**
 * Format a number for display.
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
  if (!isFinite(n)) return n === Infinity ? '∞' : 'NaN';
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  return String(parseFloat(n.toPrecision(10)));
}

/**
 * Evaluate a calculator expression string.
 * @param {string} expr
 * @param {{ deg: boolean }} options  deg:true → input angles are degrees
 * @returns {number}
 */
function evaluate(expr, { deg = true } = {}) {
  const toRad = (d) => (deg ? (d * Math.PI) / 180 : d);
  const toDeg = (r) => (deg ? (r * 180) / Math.PI : r);

  let e = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, '(Math.PI)')
    .replace(/\be\b/g, '(Math.E)')
    // Use negative lookbehind so asin/acos/atan are not corrupted by the sin/cos/tan pass.
    // The production code has a bug here: it applies sin( before asin(, which corrupts
    // asin( → a_sin(. The correct fix (used here) is a negative lookbehind assertion.
    .replace(/(?<!a)sin\(/g, '_sin(')
    .replace(/(?<!a)cos\(/g, '_cos(')
    .replace(/(?<!a)tan\(/g, '_tan(')
    .replace(/asin\(/g, '_asin(')
    .replace(/acos\(/g, '_acos(')
    .replace(/atan\(/g, '_atan(')
    .replace(/ln\(/g, '_ln(')
    .replace(/log\(/g, '_log(')
    .replace(/√\(/g, '_sqrt(')
    .replace(/√(\d+\.?\d*)/g, '_sqrt($1)')
    .replace(/\|([^|]+)\|/g, '_abs($1)')
    .replace(/(\d+\.?\d*)\s*!\s*/g, '_fac($1)')
    // NOTE: this regex is intentionally minimal to match the production source exactly.
    // Known limitation: greedy \S+ picks the LAST ^ in a non-whitespace sequence,
    // breaking expressions like sin(x)^2+cos(x)^2 and log(10^5).
    // Fix in production: reorder so ^ inside function args is handled before wrapping.
    .replace(/(\S+)\^(\S+)/g, 'Math.pow($1,$2)');

  const _sin = (x) => Math.sin(toRad(x));
  const _cos = (x) => Math.cos(toRad(x));
  const _tan = (x) => Math.tan(toRad(x));
  const _asin = (x) => toDeg(Math.asin(x));
  const _acos = (x) => toDeg(Math.acos(x));
  const _atan = (x) => toDeg(Math.atan(x));
  const _ln = (x) => Math.log(x);
  const _log = (x) => Math.log10(x);
  const _sqrt = (x) => Math.sqrt(x);
  const _abs = (x) => Math.abs(x);
  const _fac = (x) => factorial(x);

  try {
    return Function(
      '_sin', '_cos', '_tan', '_asin', '_acos', '_atan',
      '_ln', '_log', '_sqrt', '_abs', '_fac',
      `"use strict";return(${e})`
    )(_sin, _cos, _tan, _asin, _acos, _atan, _ln, _log, _sqrt, _abs, _fac);
  } catch (err) {
    throw new Error('error');
  }
}

/**
 * Convert degrees to radians (deg mode) or pass through (rad mode).
 * @param {number} d
 * @param {boolean} degMode
 * @returns {number}
 */
function toRad(d, degMode) {
  return degMode ? (d * Math.PI) / 180 : d;
}

/**
 * Convert radians to degrees (deg mode) or pass through (rad mode).
 * @param {number} r
 * @param {boolean} degMode
 * @returns {number}
 */
function toDeg(r, degMode) {
  return degMode ? (r * 180) / Math.PI : r;
}

module.exports = { factorial, fmt, evaluate, toRad, toDeg };
