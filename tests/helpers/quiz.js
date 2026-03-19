/**
 * Quiz bank and selection logic extracted from Dog Engineering Calculator.
 * The question bank mirrors the one in the v1/v2 HTML files.
 */

const QB = {
  basic: [
    { q: '15 + 28 = ?',       a: 43,      hint: '' },
    { q: '72 ÷ 8 = ?',        a: 9,       hint: '' },
    { q: '13 × 7 = ?',        a: 91,      hint: '' },
    { q: '256 - 89 = ?',      a: 167,     hint: '' },
    { q: '√144 = ?',          a: 12,      hint: '√144' },
    { q: '2^10 = ?',          a: 1024,    hint: '2^10' },
    { q: '15% of 200 = ?',    a: 30,      hint: '200×0.15' },
    { q: '|−37| = ?',         a: 37,      hint: '|-37|' },
    { q: '7! = ?',            a: 5040,    hint: '7!' },
    { q: '3^4 = ?',           a: 81,      hint: '3^4' },
    { q: '√625 = ?',          a: 25,      hint: '√625' },
    { q: '9 × 9 − 18 = ?',   a: 63,      hint: '9×9-18' },
  ],
  mid: [
    { q: 'sin(30°) = ?',      a: 0.5,     hint: 'sin(30)' },
    { q: 'cos(60°) = ?',      a: 0.5,     hint: 'cos(60)' },
    { q: 'tan(45°) = ?',      a: 1,       hint: 'tan(45)' },
    { q: 'log₁₀(1000) = ?',  a: 3,       hint: 'log(1000)' },
    { q: 'log₁₀(√10) = ?',   a: 0.5,     hint: 'log(√10)' },
    { q: 'sin²(45°)+cos²(45°)=?', a: 1,  hint: 'sin(45)^2+cos(45)^2' },
    { q: 'sin(90°) = ?',      a: 1,       hint: 'sin(90)' },
    { q: 'cos(0°) = ?',       a: 1,       hint: 'cos(0)' },
    { q: 'tan(0°) = ?',       a: 0,       hint: 'tan(0)' },
    { q: 'log₁₀(1) = ?',     a: 0,       hint: 'log(1)' },
    { q: 'log₁₀(100) = ?',   a: 2,       hint: 'log(100)' },
    { q: 'cos(180°) = ?',     a: -1,      hint: 'cos(180)' },
  ],
  advanced: [
    { q: 'ln(e) = ?',          a: 1,      hint: 'ln(e)' },
    { q: 'ln(e²) = ?',         a: 2,      hint: 'ln(e^2)' },
    { q: 'e⁰ = ?',             a: 1,      hint: 'e^(0)' },
    { q: 'asin(1) = ? (°)',    a: 90,     hint: 'asin(1)' },
    { q: 'acos(0) = ? (°)',    a: 90,     hint: 'acos(0)' },
    { q: 'atan(1) = ? (°)',    a: 45,     hint: 'atan(1)' },
    { q: '10! = ?',            a: 3628800,hint: '10!' },
    { q: 'ln(1) = ?',          a: 0,      hint: 'ln(1)' },
    { q: 'log₁₀(10⁵) = ?',   a: 5,      hint: 'log(10^5)' },
    { q: 'sin(π/6) = ? (rad)',a: 0.5,    hint: 'sin(0.5236)' },
    { q: 'e^(ln 3) = ?',      a: 3,      hint: 'e^(ln(3))' },
    { q: 'asin(sin 30°) = ?', a: 30,     hint: 'asin(sin(30))' },
  ],
};

/**
 * Pick a random question from the given level, avoiding recently used indices.
 * @param {'basic'|'mid'|'advanced'} level
 * @param {number[]} usedQ  Indices already shown in this session.
 * @returns {{ question: object, idx: number, usedQ: number[] }}
 */
function pickQ(level, usedQ = []) {
  const bank = QB[level];
  let avail = bank.map((_, i) => i).filter((i) => !usedQ.includes(i));
  if (!avail.length) {
    usedQ = [];
    avail = bank.map((_, i) => i);
  }
  const idx = avail[Math.floor(Math.random() * avail.length)];
  const newUsed = [...usedQ, idx];
  return { question: { ...bank[idx], idx }, usedQ: newUsed };
}

/**
 * Check whether a user answer matches the expected answer within tolerance.
 * @param {number} userAns
 * @param {number} expected
 * @param {number} [tolerance=1e-6]
 * @returns {boolean}
 */
function checkAnswer(userAns, expected, tolerance = 1e-6) {
  return Math.abs(userAns - expected) <= tolerance;
}

module.exports = { QB, pickQ, checkAnswer };
