/**
 * Unit tests for Tamagotchi evolution system (v2 only).
 *
 * Coverage targets:
 *   - addExp()    – EXP accumulation, stage evolution, Champion level-ups
 *   - loseHeart() – wrong-answer heart penalty with 3-wrong threshold
 *   - TAMA_STAGES – data integrity
 */

const { TAMA_STAGES, createTama, addExp, loseHeart } = require('./helpers/tamagotchi');

// ─────────────────────────────────────────────
//  TAMA_STAGES data integrity
// ─────────────────────────────────────────────
describe('TAMA_STAGES', () => {
  test('has exactly 4 stages', () => expect(TAMA_STAGES).toHaveLength(4));

  test('stages have non-decreasing starting levels', () => {
    for (let i = 1; i < TAMA_STAGES.length; i++) {
      expect(TAMA_STAGES[i].lv).toBeGreaterThan(TAMA_STAGES[i - 1].lv);
    }
  });

  test('non-Champion stages have positive expNeeded', () => {
    for (let i = 0; i < 3; i++) {
      expect(TAMA_STAGES[i].expNeeded).toBeGreaterThan(0);
    }
  });

  // MISSING: verify the Champion stage (index 3) has no fixed expNeeded cap
  test('Champion stage has null expNeeded (uses per-level formula)', () => {
    expect(TAMA_STAGES[3].expNeeded).toBeNull();
  });
});

// ─────────────────────────────────────────────
//  addExp() – normal accumulation (no evolution)
// ─────────────────────────────────────────────
describe('addExp() – accumulation without evolution', () => {
  test('adds EXP to current total', () => {
    const tama = createTama(); // stage 0, exp 0
    const { tama: next, evolved } = addExp(tama, 2);
    expect(next.exp).toBe(2);
    expect(evolved).toBe(false);
  });

  test('does not mutate the original state object', () => {
    const tama = createTama();
    addExp(tama, 3);
    expect(tama.exp).toBe(0); // unchanged
  });

  test('accumulates across multiple calls', () => {
    let tama = createTama();
    ({ tama } = addExp(tama, 1));
    ({ tama } = addExp(tama, 1));
    ({ tama } = addExp(tama, 1));
    expect(tama.exp).toBe(3);
    expect(tama.stage).toBe(0);
  });
});

// ─────────────────────────────────────────────
//  addExp() – evolution
// ─────────────────────────────────────────────
describe('addExp() – evolution', () => {
  test('evolves from Egg to Puppy when EXP reaches threshold (5)', () => {
    const tama = createTama(); // stage 0, expNeeded = 5
    const { tama: next, evolved } = addExp(tama, 5);
    expect(evolved).toBe(true);
    expect(next.stage).toBe(1);
    expect(next.level).toBe(TAMA_STAGES[1].lv);
  });

  test('surplus EXP after evolution is carried over', () => {
    const tama = createTama();
    const { tama: next } = addExp(tama, 7); // 5 needed, 2 leftover
    expect(next.exp).toBe(2);
  });

  test('evolves from Puppy to Adult (expNeeded = 15)', () => {
    let tama = { ...createTama(), stage: 1, level: TAMA_STAGES[1].lv, exp: 0 };
    const { tama: next, evolved } = addExp(tama, 15);
    expect(evolved).toBe(true);
    expect(next.stage).toBe(2);
  });

  test('evolves from Adult to Champion (expNeeded = 30)', () => {
    let tama = { ...createTama(), stage: 2, level: TAMA_STAGES[2].lv, exp: 0 };
    const { tama: next, evolved } = addExp(tama, 30);
    expect(evolved).toBe(true);
    expect(next.stage).toBe(3);
  });

  // MISSING: stage cannot exceed 3 (Champion is the cap)
  test('stage is capped at 3 (Champion)', () => {
    let tama = { ...createTama(), stage: 3, level: TAMA_STAGES[3].lv, exp: 0 };
    const { tama: next, evolved } = addExp(tama, 999);
    expect(evolved).toBe(false);
    expect(next.stage).toBe(3);
  });
});

// ─────────────────────────────────────────────
//  addExp() – Champion level-up
// ─────────────────────────────────────────────
describe('addExp() – Champion level-up', () => {
  function makeChampion(level = 10, exp = 0) {
    return { stage: 3, level, exp, hearts: 3, wrongCount: 0 };
  }

  test('levels up when EXP reaches 5 + level*2 (at lv 10: needs 25)', () => {
    const tama = makeChampion(10, 0);
    const { tama: next, leveledUp } = addExp(tama, 25);
    expect(leveledUp).toBe(true);
    expect(next.level).toBe(11);
  });

  test('surplus EXP after level-up is carried over', () => {
    const tama = makeChampion(10, 0); // needs 25
    const { tama: next } = addExp(tama, 27);
    expect(next.exp).toBe(2);
  });

  // MISSING: Champion level-up threshold scales with level
  test('EXP threshold increases with each level', () => {
    const t10 = makeChampion(10, 0);
    const t11 = makeChampion(11, 0);
    // level 10 needs 25, level 11 needs 27
    const { leveledUp: up10 } = addExp(t10, 24);
    const { leveledUp: up11 } = addExp(t11, 26);
    expect(up10).toBe(false);
    expect(up11).toBe(false);

    const { leveledUp: yes10 } = addExp(t10, 25);
    expect(yes10).toBe(true);
  });
});

// ─────────────────────────────────────────────
//  loseHeart()
// ─────────────────────────────────────────────
describe('loseHeart()', () => {
  test('increments wrongCount on first wrong answer', () => {
    const tama = createTama();
    const { tama: next, lostHeart } = loseHeart(tama);
    expect(next.wrongCount).toBe(1);
    expect(lostHeart).toBe(false);
    expect(next.hearts).toBe(3); // unchanged
  });

  test('does not lose a heart until 3 wrong answers', () => {
    let tama = createTama();
    ({ tama } = loseHeart(tama));
    ({ tama } = loseHeart(tama));
    expect(tama.hearts).toBe(3);
    expect(tama.wrongCount).toBe(2);
  });

  test('loses a heart exactly on the 3rd wrong answer and resets counter', () => {
    let tama = createTama();
    ({ tama } = loseHeart(tama));
    ({ tama } = loseHeart(tama));
    const { tama: next, lostHeart } = loseHeart(tama);
    expect(lostHeart).toBe(true);
    expect(next.hearts).toBe(2);
    expect(next.wrongCount).toBe(0);
  });

  test('hearts do not go below 0', () => {
    let tama = { ...createTama(), hearts: 0 };
    for (let i = 0; i < 3; i++) ({ tama } = loseHeart(tama));
    expect(tama.hearts).toBe(0);
  });

  test('does not mutate the original state object', () => {
    const tama = createTama();
    loseHeart(tama);
    expect(tama.wrongCount).toBe(0);
  });

  // MISSING: losing all 3 hearts (game-over state) is never explicitly checked
  test('can lose all 3 hearts with 9 consecutive wrong answers', () => {
    let tama = createTama();
    for (let i = 0; i < 9; i++) ({ tama } = loseHeart(tama));
    expect(tama.hearts).toBe(0);
  });
});
