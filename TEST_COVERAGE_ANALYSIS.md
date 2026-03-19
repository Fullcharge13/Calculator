# Test Coverage Analysis – Dog Engineering Calculator

## Executive Summary

The codebase currently has **zero automated tests**. Both `v1.html` and `v2.html` are
self-contained single-file applications with all logic embedded in `<script>` tags, making
them untestable without first extracting the logic into importable modules.

This document identifies the highest-risk functional areas and proposes a concrete test
strategy, including a ready-to-run Jest suite provided in the `tests/` directory.

---

## 1. Current State

| Metric | Status |
|---|---|
| Test files | 0 |
| Testing framework | None |
| Code coverage | 0 % |
| CI pipeline | None |
| Build / lint tooling | None |

All verification today is **manual, browser-based, and non-reproducible**.

---

## 2. Functional Areas & Risk Assessment

### 2.1 Core Math Engine (`evaluate()`) — **CRITICAL**

The `evaluate()` function (v1:833, v2: equivalent) is the heart of the calculator. It:

- Preprocesses an expression string via a chain of `.replace()` calls
- Delegates to JavaScript's `Function()` constructor for evaluation
- Handles 10 math function families (trig, inverse trig, log, ln, sqrt, abs, factorial, power,
  constants, arithmetic operators)

**Why it's high-risk:**
- A single incorrect regex in the replace chain silently produces wrong answers
- The `Function()` constructor sandbox is not complete; a crafted expression could break it
- Degree/radian mode is applied inside the helpers passed to `Function()`, so a mode-state
  bug produces wrong trig results with no error

**Bugs found by the new test suite:**

| Bug | Severity | Location |
|---|---|---|
| `asin/acos/atan` broken | **Critical** | v1:837-838, v2:equivalent |
| `(\S+)\^(\S+)` greedy regex | **High** | v1:843, v2:equivalent |

**Bug 1 – Inverse trig functions always throw (Critical)**
The replace chain applies `sin(` → `_sin(` _before_ `asin(` → `_asin(`. Since `asin(`
contains `sin(` as a substring, `asin(1)` is first corrupted to `a_sin(1)`. The subsequent
`asin(` replacement never fires. When `a_sin` (undefined) is called, `Function()` throws.
This means `asin`, `acos`, and `atan` are completely broken in the production calculator.
**Fix:** use a negative lookbehind: `/(?<!a)sin\(/g` (or apply asin/acos/atan first and
use a placeholder to prevent double-replacement).

**Bug 2 – `^` regex mangles nested power expressions (High)**
The pattern `/(\S+)\^(\S+)/g` is greedy. For `sin(45)^2+cos(45)^2` it picks the _last_ `^`
as the separator (due to greedy backtracking), producing `Math.pow(sin(45)^2+cos(45), 2)`.
The remaining `^` is then treated as JavaScript's bitwise XOR, yielding a completely wrong
result (e.g. `4` instead of `1` for the Pythagorean identity). Similarly, `log(10^5)`
produces a malformed call to `_log` and returns `NaN`.
**Fix:** replace `^` with a non-greedy or token-aware pattern, e.g. match only numeric/simple
operands: `/(\d+\.?\d*|\))\^(\d+\.?\d*|\()/g` and handle compound cases via a proper parser.

**Currently untested edge cases (still relevant after bug fixes):**
| Case | Risk |
|---|---|
| `tan(90°)` near-Infinity | Renders as a huge number; could display as `NaN` |
| `log(-1)` | Should produce NaN, not throw |
| `ln(0)` | Should produce -Infinity |
| Empty string | Throws; calling code catches it, but the throw path is untested |
| Unmatched parenthesis | Same as above |
| Very long expressions | No length limit; potential DoS via huge factorial chain |
| `%` operator | The quiz asks "15% of 200" but `evaluate()` has no `%` handler |

---

### 2.2 `factorial()` — **HIGH**

Pure recursive-free loop function (v1:832). Already covers:
- Negative → NaN
- n > 170 → Infinity
- Base cases 0 and 1

**Currently untested edge cases:**
| Case | Risk |
|---|---|
| Fractional rounding (e.g. `4.6!` → same as `5!`) | Quiz questions use integers, but calculator users may enter decimals |
| `factorial(170)` boundary | Last finite factorial; adjacent to the Infinity threshold |

---

### 2.3 `fmt()` — **MEDIUM**

Number formatter (v1:850). Branches:
- `Infinity` → `'∞'`
- Not-Infinity non-finite → `'NaN'` (catches `-Infinity` and `NaN`)
- Integer < 1e15 → plain string
- Otherwise → `toPrecision(10)`

**Currently untested edge cases:**
| Case | Risk |
|---|---|
| `-Infinity` | Returns `'NaN'` — arguably surprising; should it return `'-∞'`? |
| `1e15` exactly | Boundary between the two branches |
| Very small floats (e.g. `1e-20`) | Exercises `toPrecision` branch |
| `-0` | `String(-0)` is `'0'`; this is fine but worth asserting |

---

### 2.4 Angle Conversion (`toRad` / `toDeg`) — **MEDIUM**

These two one-liners (v1:830-831) depend on the global `state.deg` flag. The only risk is
that they are stateful: if a test leaves `state.deg` in the wrong value, subsequent tests
get wrong answers. Extracting them as pure functions (done in `tests/helpers/math.js`)
eliminates this class of bug entirely.

**Currently untested:**
- Round-trip identity `toDeg(toRad(x)) === x`
- Radian-mode pass-through

---

### 2.5 Quiz System — **HIGH**

#### 2.5.1 Question Bank (`QB`)

The quiz bank (v1:681–745) contains 36 questions across three levels. Bugs here are
visible to users as wrong answer keys.

**Gaps:**
| Gap | Risk |
|---|---|
| No validation that `evaluate(hint) ≈ a` | A hint and answer can drift apart silently |
| No check that all answers are finite | `NaN` or `Infinity` in `a` would break scoring |
| `"15% of 200 = ?"` uses `%` in hint but `evaluate()` has no `%` handler | User cannot verify with the calculator itself |

#### 2.5.2 `pickQ()` — randomness and deduplication

- No test verifies that questions are not repeated within a session
- No test verifies that after exhausting the bank the pool resets correctly
- No statistical test checks that all questions have a fair probability of selection

#### 2.5.3 `checkAnswer()` — grading tolerance

The app compares user input to the expected answer. Floating-point answers (e.g. `sin(30°) = 0.5`)
require a tolerance. There is currently no explicit tolerance function; comparison is done
with string equality against `fmt()` output. This can cause subtle failures:
- `fmt(0.49999999999)` might render as `'0.5'` (passes) or `'0.5'` not equal to `'0.5'` (edge cases)
- No test exercises the tolerance boundary

---

### 2.6 Tamagotchi System (v2 only) — **MEDIUM**

The evolution system (`addExp`, `evolve`, `loseHeart`) manages game-progression state.
Bugs here degrade the user experience but do not produce wrong math answers.

**Gaps:**
| Gap | Risk |
|---|---|
| `addExp` never tested for stage boundary transitions | Users may get stuck at stage 3 or evolve at wrong thresholds |
| Champion level-up threshold (`5 + level * 2`) never verified | Scaling formula could be wrong |
| `loseHeart` with `hearts = 0` not tested | Could go negative (guarded by `Math.max`, but untested) |
| Full game-over condition (0 hearts) never tested | No heart-recovery mechanic verified |
| Evolution does not carry surplus EXP in some code paths | Potential EXP loss on evolution |

---

### 2.7 Internationalisation (`I18N` / `t()`) — **LOW-MEDIUM**

The `t(k)` function (v1:636) falls back to Korean if a key is missing in the active language.
Silent fallbacks can cause untranslated UI strings to appear in production.

**Gaps:**
| Gap | Risk |
|---|---|
| No test verifies all 4 languages have the same set of keys | Missing key in EN/JA/ZH is never caught |
| No test for the fallback chain (`lang → ko → key`) | A typo in `I18N.en` silently uses Korean text |
| `applyLang()` touches the DOM; never tested with a real or mocked DOM | Hard to catch rendering regressions |

---

### 2.8 History Management (`addHist`) — **LOW**

The history array is capped at 10 entries. Currently untested:
- Overflow behaviour (11th entry removes the oldest)
- History recall (`recallHist`) restores the correct expression

---

### 2.9 Wrong Answer Note System (v2 only) — **LOW**

Purely UI-driven; lower risk than math logic. No functional unit tests possible without a DOM.
Candidate for Playwright E2E tests.

---

## 3. Proposed Test Strategy

### Layer 1 – Unit Tests (Jest, Node environment) — **START HERE**

Extract pure logic into `tests/helpers/` modules (already done) and write deterministic tests.

```
tests/
  helpers/
    math.js          # factorial, fmt, evaluate, toRad, toDeg
    tamagotchi.js    # addExp, loseHeart (pure, state-in/state-out)
    quiz.js          # QB data, pickQ, checkAnswer
  math.test.js       # ✅ provided
  tamagotchi.test.js # ✅ provided
  quiz.test.js       # ✅ provided
```

Run with: `npm test` (requires `npm install` first)

### Layer 2 – I18N Integrity Tests (Jest)

```js
// tests/i18n.test.js  (to be created)
// Check every key in I18N.ko exists in I18N.en, I18N.ja, I18N.zh
// Check t() fallback chain
```

### Layer 3 – End-to-End Tests (Playwright) — **FUTURE**

Browser-level tests for DOM interactions that cannot be unit-tested:
- Button clicks produce correct display output
- Mode switching (calc ↔ quiz)
- Timer counts down and triggers timeout
- Evolution toasts appear on stage change
- Wrong answer panel populates and archives correctly

```bash
npm install -D playwright
npx playwright test
```

### Layer 4 – Security / Input Fuzzing

The `evaluate()` function uses `new Function()`. While helpers are passed explicitly,
fuzz testing with adversarial strings is recommended to ensure no unintended execution paths.

```js
// tests/fuzz.test.js  (to be created)
// Run evaluate() against a list of injection attempts:
//   'constructor.constructor("return process")()'
//   '__proto__'
//   etc.
```

---

## 4. Priority Recommendations

| Priority | Area | Rationale |
|---|---|---|
| 🔴 P1 | `evaluate()` edge cases | Wrong math answers destroy user trust |
| 🔴 P1 | Quiz answer validation (`QB`) | Incorrect answer key is a correctness bug |
| 🟠 P2 | `factorial()` boundary (170) | Adjacent to the Infinity overflow |
| 🟠 P2 | `fmt()` – `-Infinity` branch | Arguably wrong output; needs spec decision |
| 🟠 P2 | Tamagotchi EXP/heart logic | Game state corruption frustrates users |
| 🟡 P3 | I18N key completeness | Silent missing translations |
| 🟡 P3 | `pickQ()` uniformity | Unfair question distribution |
| 🟢 P4 | E2E (Playwright) | DOM-level regression guard |
| 🟢 P4 | Security fuzzing of `evaluate()` | Low actual risk but good hygiene |

---

## 5. Quick Start

```bash
cd Calculator
npm install        # installs Jest
npm test           # runs all unit tests
npm run test:coverage  # generates coverage report in coverage/
```

The tests in `tests/math.test.js`, `tests/tamagotchi.test.js`, and `tests/quiz.test.js`
are ready to run and will immediately surface any regressions in the extracted helper
modules.
