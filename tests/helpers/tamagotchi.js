/**
 * Tamagotchi evolution logic extracted from Dog Engineering Calculator v2.
 * All functions are pure (no DOM side-effects) and accept state as a parameter,
 * making them straightforward to unit-test.
 */

const TAMA_STAGES = [
  { lv: 1, expNeeded: 5  },   // 0 – Egg
  { lv: 3, expNeeded: 15 },   // 1 – Puppy
  { lv: 6, expNeeded: 30 },   // 2 – Adult
  { lv: 10, expNeeded: null }, // 3 – Champion (infinite levels)
];

/**
 * Return a fresh Tamagotchi state object.
 * @returns {object}
 */
function createTama() {
  return { stage: 0, level: 1, exp: 0, hearts: 3, wrongCount: 0 };
}

/**
 * Add EXP to the Tamagotchi, triggering evolution or level-up as needed.
 * Returns the new state (does NOT mutate the original).
 * @param {object} tama
 * @param {number} amount
 * @returns {{ tama: object, evolved: boolean, leveledUp: boolean }}
 */
function addExp(tama, amount) {
  tama = { ...tama };
  let evolved = false;
  let leveledUp = false;

  tama.exp += amount;
  const stageData = TAMA_STAGES[tama.stage];

  if (tama.stage < 3 && tama.exp >= stageData.expNeeded) {
    tama.exp -= stageData.expNeeded;
    tama.stage = Math.min(tama.stage + 1, 3);
    tama.level = TAMA_STAGES[tama.stage].lv;
    evolved = true;
  } else if (tama.stage === 3) {
    const nextLvExp = 5 + tama.level * 2;
    if (tama.exp >= nextLvExp) {
      tama.level++;
      tama.exp -= nextLvExp;
      leveledUp = true;
    }
  }

  return { tama, evolved, leveledUp };
}

/**
 * Record a wrong answer; lose a heart every 3 consecutive wrongs.
 * Returns the new state (does NOT mutate the original).
 * @param {object} tama
 * @returns {{ tama: object, lostHeart: boolean }}
 */
function loseHeart(tama) {
  tama = { ...tama };
  tama.wrongCount++;
  let lostHeart = false;
  if (tama.wrongCount >= 3) {
    tama.wrongCount = 0;
    tama.hearts = Math.max(0, tama.hearts - 1);
    lostHeart = true;
  }
  return { tama, lostHeart };
}

module.exports = { TAMA_STAGES, createTama, addExp, loseHeart };
