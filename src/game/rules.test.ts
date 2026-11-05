import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POPWORD_BANK,
  getValidFiveLetterWords,
  evaluateWordleGuess,
  mergeKeyboardStatus,
  selectFiftyFiftyWrongIndices,
  canTriggerInAppInterstitial,
  calculateTriviaOutcome,
  formatWordleEmojiShare,
  evaluateLoginStreakState,
  canClaimFreeDailySpin,
  purchaseOrEquipTheme,
  determineWordleSubmissionHaptics,
  computeTriviaOptionPhysicsSpec,
  evaluateCoinCounterDelta,
  BOOSTER_TOOLS,
  POPWORD_CLUES,
  inspectTargetVowels,
  selectKeyboardPurifierLetters,
  evaluateBoosterToolState,
} from './rules';

test('POPWORD_BANK contains at least 50 valid 5-letter uppercase words', () => {
  const validWords = getValidFiveLetterWords(POPWORD_BANK);
  assert.ok(validWords.length >= 50, `Expected >= 50 words, got ${validWords.length}`);
  for (const word of validWords) {
    assert.equal(word.length, 5);
    assert.match(word, /^[A-Z]{5}$/);
  }
});

test('evaluateWordleGuess handles exact matches and complete misses', () => {
  assert.deepEqual(evaluateWordleGuess('OSCAR', 'OSCAR'), [
    'correct',
    'correct',
    'correct',
    'correct',
    'correct',
  ]);
  assert.deepEqual(evaluateWordleGuess('BLUES', 'MARCH'), [
    'absent',
    'absent',
    'absent',
    'absent',
    'absent',
  ]);
});

test('evaluateWordleGuess prevents false duplicate yellow tiles in 2-pass algorithm', () => {
  const res = evaluateWordleGuess('PUPPY', 'APPLE');
  assert.deepEqual(res, ['present', 'absent', 'correct', 'absent', 'absent']);

  const res2 = evaluateWordleGuess('EERIE', 'VEGAS');
  assert.deepEqual(res2, ['absent', 'correct', 'absent', 'absent', 'absent']);
});

test('mergeKeyboardStatus enforces priority Green > Yellow > Dark Gray', () => {
  let kb = mergeKeyboardStatus({}, 'RADIO', ['present', 'absent', 'absent', 'absent', 'correct']);
  assert.equal(kb['R'], 'present');
  assert.equal(kb['A'], 'absent');
  assert.equal(kb['O'], 'correct');

  kb = mergeKeyboardStatus(kb, 'RODEO', ['correct', 'absent', 'absent', 'absent', 'absent']);
  assert.equal(kb['R'], 'correct');
  assert.equal(kb['O'], 'correct');
});

test('selectFiftyFiftyWrongIndices always picks 2 distinct wrong indices and never the correct index', () => {
  for (let correct = 0; correct < 4; correct++) {
    const [a, b] = selectFiftyFiftyWrongIndices(correct, 4, 7);
    assert.notEqual(a, b);
    assert.notEqual(a, correct);
    assert.notEqual(b, correct);
  }
});

test('canTriggerInAppInterstitial enforces strict 180-second cooldown', () => {
  const baseTime = 1_700_000_000_000;
  assert.equal(canTriggerInAppInterstitial(null, baseTime), true);
  assert.equal(canTriggerInAppInterstitial(baseTime, baseTime + 60_000), false);
  assert.equal(canTriggerInAppInterstitial(baseTime, baseTime + 179_999), false);
  assert.equal(canTriggerInAppInterstitial(baseTime, baseTime + 180_000), true);
});

test('calculateTriviaOutcome awards +20 coins and increments streak on correct answer', () => {
  const win = calculateTriviaOutcome(2, 2, 3, 100);
  assert.equal(win.isCorrect, true);
  assert.equal(win.nextStreak, 4);
  assert.equal(win.nextCoins, 120);

  const loss = calculateTriviaOutcome(1, 2, 4, 120);
  assert.equal(loss.isCorrect, false);
  assert.equal(loss.nextStreak, 0);
  assert.equal(loss.nextCoins, 120);
});

test('formatWordleEmojiShare generates spoiler-free emoji grid and exact share template', () => {
  const shareText = formatWordleEmojiShare({
    dayNumber: 4,
    attempts: 2,
    evaluations: [
      ['present', 'absent', 'absent', 'correct', 'absent'],
      ['correct', 'correct', 'correct', 'correct', 'correct'],
    ],
    bestTriviaStreak: 7,
  });

  assert.ok(shareText.includes('PopWord USA 🇺🇸'));
  assert.ok(shareText.includes('Wordle #4: 2/6'));
  assert.ok(shareText.includes('🟨⬛⬛🟩⬛\n🟩🟩🟩🟩🟩'));
  assert.ok(shareText.includes('Trivia Streak: 7 🔥'));
  assert.ok(shareText.includes('Play now: https://t.me/YourBotNameBot'));
});

test('evaluateLoginStreakState increments consecutive days and cycles Day 7 Mystery Chest', () => {
  const day1 = evaluateLoginStreakState(null, 0, '2026-11-04');
  assert.equal(day1.shouldShowModal, true);
  assert.equal(day1.nextStreakDay, 1);
  assert.equal(day1.reward.coins, 50);

  const sameDay = evaluateLoginStreakState('2026-11-04', 1, '2026-11-04');
  assert.equal(sameDay.shouldShowModal, false);
  assert.equal(sameDay.nextStreakDay, 1);

  const day2 = evaluateLoginStreakState('2026-11-04', 1, '2026-11-05');
  assert.equal(day2.shouldShowModal, true);
  assert.equal(day2.nextStreakDay, 2);
  assert.equal(day2.reward.coins, 75);

  const day7 = evaluateLoginStreakState('2026-11-09', 6, '2026-11-10');
  assert.equal(day7.shouldShowModal, true);
  assert.equal(day7.nextStreakDay, 7);
  assert.equal(day7.reward.coins, 300);
  assert.equal(day7.reward.revealLifelines, 1);
  assert.equal(day7.reward.fiftyFiftyLifelines, 1);
});

test('canClaimFreeDailySpin enforces 24-hour cooldown', () => {
  const now = 1_700_000_000_000;
  assert.equal(canClaimFreeDailySpin(null, now), true);
  assert.equal(canClaimFreeDailySpin(now - 3600_000, now), false);
  assert.equal(canClaimFreeDailySpin(now - 24 * 3600_000, now), true);
});

test('purchaseOrEquipTheme deducts coins on unlock and switches active theme', () => {
  const failRes = purchaseOrEquipTheme({
    themeId: 'miami_neon',
    coins: 200,
    unlockedThemes: ['slate_dark'],
    activeTheme: 'slate_dark',
  });
  assert.equal(failRes.ok, false);
  assert.equal(failRes.coins, 200);

  const buyRes = purchaseOrEquipTheme({
    themeId: 'miami_neon',
    coins: 350,
    unlockedThemes: ['slate_dark'],
    activeTheme: 'slate_dark',
  });
  assert.equal(buyRes.ok, true);
  assert.equal(buyRes.coins, 50);
  assert.equal(buyRes.activeTheme, 'miami_neon');
  assert.ok(buyRes.unlockedThemes.includes('miami_neon'));
});

test('determineWordleSubmissionHaptics triggers medium for correct letters and heavy for game-winning completions', () => {
  const winHaptics = determineWordleSubmissionHaptics([
    'correct',
    'correct',
    'correct',
    'correct',
    'correct',
  ]);
  assert.equal(winHaptics.isWin, true);
  assert.equal(winHaptics.impactStyle, 'heavy');
  assert.equal(winHaptics.notificationType, 'success');

  const partialCorrect = determineWordleSubmissionHaptics([
    'correct',
    'absent',
    'present',
    'absent',
    'absent',
  ]);
  assert.equal(partialCorrect.isWin, false);
  assert.equal(partialCorrect.impactStyle, 'medium');
  assert.equal(partialCorrect.notificationType, null);

  const onlyPresent = determineWordleSubmissionHaptics([
    'present',
    'absent',
    'absent',
    'absent',
    'absent',
  ]);
  assert.equal(onlyPresent.impactStyle, 'light');

  const allAbsent = determineWordleSubmissionHaptics([
    'absent',
    'absent',
    'absent',
    'absent',
    'absent',
  ]);
  assert.equal(allAbsent.impactStyle, 'rigid');
});

test('computeTriviaOptionPhysicsSpec returns staggered entry/exit spring timings and impact classes', () => {
  const enter0 = computeTriviaOptionPhysicsSpec(0, 'enter');
  const enter3 = computeTriviaOptionPhysicsSpec(3, 'enter');
  assert.equal(enter0.className, 'trivia-opt-enter');
  assert.equal(enter0.delayMs, 0);
  assert.equal(enter3.delayMs, 135);
  assert.equal(enter3.durationMs, 320);

  const exit2 = computeTriviaOptionPhysicsSpec(2, 'exit');
  assert.equal(exit2.className, 'trivia-opt-exit');
  assert.equal(exit2.delayMs, 44);
  assert.equal(exit2.durationMs, 160);

  const correctSpec = computeTriviaOptionPhysicsSpec(1, 'correct');
  assert.equal(correctSpec.className, 'trivia-opt-correct-pop');
  assert.equal(correctSpec.delayMs, 0);

  const wrongSpec = computeTriviaOptionPhysicsSpec(2, 'wrong');
  assert.equal(wrongSpec.className, 'trivia-opt-wrong-shake');

  const elimSpec = computeTriviaOptionPhysicsSpec(0, 'eliminated');
  assert.equal(elimSpec.className, 'trivia-opt-eliminated');
});

test('evaluateCoinCounterDelta triggers scale-up and color transition only when coins increase', () => {
  const earned = evaluateCoinCounterDelta(120, 140);
  assert.equal(earned.shouldAnimate, true);
  assert.equal(earned.delta, 20);
  assert.equal(earned.containerClass, 'coin-gain-bump');
  assert.equal(earned.textClass, 'coin-text-gain-flash');
  assert.equal(earned.durationMs, 520);

  const unchanged = evaluateCoinCounterDelta(140, 140);
  assert.equal(unchanged.shouldAnimate, false);
  assert.equal(unchanged.delta, 0);

  const spent = evaluateCoinCounterDelta(400, 100);
  assert.equal(spent.shouldAnimate, false);
  assert.equal(spent.delta, -300);
});

test('6-Booster Power Tools specifications, vowel radar, keyboard purifier, pop clues, and coin lock/unlock state', () => {
  assert.equal(BOOSTER_TOOLS.length, 6);

  // Every word in POPWORD_BANK has a non-empty Pop Sense Clue
  for (const w of POPWORD_BANK) {
    assert.ok(POPWORD_CLUES[w] && POPWORD_CLUES[w].length > 5, `Missing clue for ${w}`);
  }

  // Vowel Radar
  assert.deepEqual(inspectTargetVowels('OSCAR'), ['A', 'O']);
  assert.deepEqual(inspectTargetVowels('AUDIO'), ['A', 'I', 'O', 'U']);

  // Keyboard Purifier selects 4 distinct absent letters
  const purified = selectKeyboardPurifierLetters('OSCAR', ['Z', 'X'], 4, 42);
  assert.equal(purified.length, 4);
  for (const ch of purified) {
    assert.equal('OSCAR'.includes(ch), false);
    assert.notEqual(ch, 'Z');
    assert.notEqual(ch, 'X');
  }

  // Coin-Gated Lock/Unlock evaluation
  const unlockedRadar = evaluateBoosterToolState({
    toolId: 'vowel_radar',
    userCoins: 120,
    usedThisRound: false,
  });
  assert.equal(unlockedRadar.isUnlocked, true);
  assert.equal(unlockedRadar.lockIcon, '🔓');
  assert.equal(unlockedRadar.coinsNeeded, 0);

  const lockedShield = evaluateBoosterToolState({
    toolId: 'streak_shield',
    userCoins: 45,
    usedThisRound: false,
  });
  assert.equal(lockedShield.isUnlocked, false);
  assert.equal(lockedShield.lockIcon, '🔒');
  assert.equal(lockedShield.coinsNeeded, 55);
});

