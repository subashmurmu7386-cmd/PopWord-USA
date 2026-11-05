/**
 * Pure game rules and algorithms for PopWord USA.
 * Shared with unit tests (node:test) and embedded in standalone index.html.
 */

export type TileStatus = 'correct' | 'present' | 'absent';
export type KeyStatus = 'correct' | 'present' | 'absent' | 'unused';
export type ThemeId = 'slate_dark' | 'miami_neon' | 'hollywood_gold' | 'matrix_cyber';

export interface TriviaQuestion {
  id: number;
  category: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  fact: string;
}

export interface StreakRewardSpec {
  day: number;
  label: string;
  coins: number;
  revealLifelines: number;
  fiftyFiftyLifelines: number;
}

export interface ThemeSpec {
  id: ThemeId;
  name: string;
  cost: number;
  desc: string;
}

export const COSMETIC_THEMES: readonly ThemeSpec[] = [
  { id: 'slate_dark', name: 'Slate Dark', cost: 0, desc: 'Default tactical slate & emerald palette' },
  { id: 'miami_neon', name: 'Miami Neon', cost: 300, desc: 'Cyan & hot pink synthwave tile accents' },
  { id: 'hollywood_gold', name: 'Hollywood Gold', cost: 500, desc: 'Red-carpet golden borders & amber glow' },
  { id: 'matrix_cyber', name: 'Matrix Cyber', cost: 800, desc: 'Phosphor terminal green & obsidian black' },
];

export const SEVEN_DAY_STREAK_REWARDS: readonly StreakRewardSpec[] = [
  { day: 1, label: '+50 Coins', coins: 50, revealLifelines: 0, fiftyFiftyLifelines: 0 },
  { day: 2, label: '+75 Coins', coins: 75, revealLifelines: 0, fiftyFiftyLifelines: 0 },
  { day: 3, label: '+1 Reveal Letter', coins: 0, revealLifelines: 1, fiftyFiftyLifelines: 0 },
  { day: 4, label: '+100 Coins', coins: 100, revealLifelines: 0, fiftyFiftyLifelines: 0 },
  { day: 5, label: '+1 50:50 Lifeline', coins: 0, revealLifelines: 0, fiftyFiftyLifelines: 1 },
  { day: 6, label: '+150 Coins', coins: 150, revealLifelines: 0, fiftyFiftyLifelines: 0 },
  { day: 7, label: 'Mystery Chest', coins: 300, revealLifelines: 1, fiftyFiftyLifelines: 1 },
];

/**
 * 64 real 5-letter uppercase US Pop-Culture, Entertainment, Sports, Music & Tech words.
 * Every single word is strictly 5 letters (length === 5).
 */
export const POPWORD_BANK: readonly string[] = [
  'OSCAR', 'GRAMY', 'DISNY', 'APPLE', 'TESLA', 'BRONX', 'MIAMI', 'VEGAS',
  'SUPER', 'EAGLE', 'CHIEF', 'RODEO', 'MARCH', 'MUSIC', 'MOVIE', 'ACTOR',
  'STAGE', 'STARS', 'FAITH', 'GLORY', 'QUEEN', 'KINGS', 'VOICE', 'BILLS',
  'POWER', 'MONEY', 'CLOUD', 'SPACE', 'CYBER', 'SMART', 'FRESH', 'VIRAL',
  'INDIE', 'BLUES', 'TRACK', 'ALBUM', 'RADIO', 'PRESS', 'MEDIA', 'TWEET',
  'TREND', 'SHOWS', 'PRIME', 'GUILD', 'COMIC', 'ANIME', 'RETRO', 'PIXEL',
  'HOLLY', 'SWING', 'JAZZY', 'DISCO', 'REMIX', 'CHART', 'AWARD', 'CROWN',
  'BULLS', 'CELTS', 'SPURS', 'MAGIC', 'FINAL', 'COACH', 'ARENA', 'DRAFT'
];

export function getValidFiveLetterWords(words: readonly string[]): string[] {
  return words
    .map((w) => w.trim().toUpperCase())
    .filter((w) => /^[A-Z]{5}$/.test(w));
}

/**
 * Accurate 2-Pass Wordle Evaluation Algorithm:
 * - Pass 1: Mark exact matches as 'correct' (GREEN) and decrement available target letter frequencies.
 * - Pass 2: Mark misplaced letters as 'present' (YELLOW) ONLY if remaining frequency > 0,
 *           and decrement frequency; otherwise mark as 'absent' (DARK GRAY).
 */
export function evaluateWordleGuess(guess: string, target: string): TileStatus[] {
  const cleanGuess = guess.trim().toUpperCase();
  const cleanTarget = target.trim().toUpperCase();
  if (cleanGuess.length !== 5 || cleanTarget.length !== 5) {
    throw new Error('Both guess and target must be exactly 5 characters.');
  }

  const result: TileStatus[] = ['absent', 'absent', 'absent', 'absent', 'absent'];
  const freq: Record<string, number> = {};

  for (let i = 0; i < 5; i++) {
    const ch = cleanTarget[i];
    freq[ch] = (freq[ch] || 0) + 1;
  }

  for (let i = 0; i < 5; i++) {
    if (cleanGuess[i] === cleanTarget[i]) {
      result[i] = 'correct';
      freq[cleanGuess[i]] -= 1;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    const ch = cleanGuess[i];
    if ((freq[ch] || 0) > 0) {
      result[i] = 'present';
      freq[ch] -= 1;
    } else {
      result[i] = 'absent';
    }
  }

  return result;
}

export function mergeKeyboardStatus(
  currentMap: Record<string, KeyStatus>,
  guess: string,
  evaluation: TileStatus[]
): Record<string, KeyStatus> {
  const rank: Record<KeyStatus, number> = {
    unused: 0,
    absent: 1,
    present: 2,
    correct: 3,
  };
  const updated: Record<string, KeyStatus> = { ...currentMap };
  const cleanGuess = guess.trim().toUpperCase();

  for (let i = 0; i < 5; i++) {
    const letter = cleanGuess[i];
    const nextState: KeyStatus = evaluation[i];
    const prevState: KeyStatus = updated[letter] || 'unused';
    if (rank[nextState] > rank[prevState]) {
      updated[letter] = nextState;
    }
  }

  return updated;
}

export function selectFiftyFiftyWrongIndices(
  correctIndex: number,
  totalOptions = 4,
  seed = 0
): [number, number] {
  const wrongIndices: number[] = [];
  for (let i = 0; i < totalOptions; i++) {
    if (i !== correctIndex) {
      wrongIndices.push(i);
    }
  }
  const firstIdx = Math.abs(seed) % wrongIndices.length;
  const first = wrongIndices[firstIdx];
  const remaining = wrongIndices.filter((idx) => idx !== first);
  const second = remaining[Math.abs(seed >> 1) % remaining.length];
  return first < second ? [first, second] : [second, first];
}

export function canTriggerInAppInterstitial(
  lastInterstitialTimeMs: number | null | undefined,
  nowMs: number,
  cooldownSeconds = 180
): boolean {
  if (!lastInterstitialTimeMs || lastInterstitialTimeMs <= 0) {
    return true;
  }
  const elapsedMs = nowMs - lastInterstitialTimeMs;
  return elapsedMs >= cooldownSeconds * 1000;
}

export function calculateTriviaOutcome(
  selectedIndex: number,
  correctIndex: number,
  currentStreak: number,
  currentCoins: number,
  rewardPerCorrect = 20
): { isCorrect: boolean; nextStreak: number; nextCoins: number; coinsDelta: number } {
  const isCorrect = selectedIndex === correctIndex;
  if (isCorrect) {
    return {
      isCorrect: true,
      nextStreak: currentStreak + 1,
      nextCoins: currentCoins + rewardPerCorrect,
      coinsDelta: rewardPerCorrect,
    };
  }
  return {
    isCorrect: false,
    nextStreak: 0,
    nextCoins: currentCoins,
    coinsDelta: 0,
  };
}

/**
 * Generates spoiler-free emoji grid and share payload for Viral Emoji Share System.
 */
export function formatWordleEmojiShare(params: {
  dayNumber: number;
  attempts: number | 'X';
  maxGuesses?: number;
  evaluations: TileStatus[][];
  bestTriviaStreak: number;
}): string {
  const maxG = params.maxGuesses ?? 6;
  const emojiGrid = params.evaluations
    .map((row) =>
      row
        .map((st) => (st === 'correct' ? '🟩' : st === 'present' ? '🟨' : '⬛'))
        .join('')
    )
    .join('\n');

  return [
    'PopWord USA 🇺🇸',
    `Wordle #${params.dayNumber}: ${params.attempts}/${maxG}`,
    emojiGrid,
    `Trivia Streak: ${params.bestTriviaStreak} 🔥`,
    'Play now: https://t.me/YourBotNameBot',
  ]
    .filter((line) => line.length > 0)
    .join('\n');
}

/**
 * Computes 7-Day Login Streak transition and reward spec for a given calendar date (YYYY-MM-DD).
 */
export function evaluateLoginStreakState(
  lastLoginDate: string | null | undefined,
  currentStreakDay: number,
  todayDateStr: string
): { shouldShowModal: boolean; nextStreakDay: number; reward: StreakRewardSpec } {
  if (lastLoginDate === todayDateStr) {
    const clamped = Math.min(7, Math.max(1, currentStreakDay || 1));
    return {
      shouldShowModal: false,
      nextStreakDay: clamped,
      reward: SEVEN_DAY_STREAK_REWARDS[clamped - 1],
    };
  }

  let nextDay = 1;
  if (lastLoginDate) {
    const prevParts = lastLoginDate.split('-').map(Number);
    const currParts = todayDateStr.split('-').map(Number);
    const prevUtc = Date.UTC(prevParts[0], prevParts[1] - 1, prevParts[2]);
    const currUtc = Date.UTC(currParts[0], currParts[1] - 1, currParts[2]);
    const diffDays = Math.round((currUtc - prevUtc) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      nextDay = ((currentStreakDay || 0) % 7) + 1;
    } else {
      nextDay = 1;
    }
  }

  return {
    shouldShowModal: true,
    nextStreakDay: nextDay,
    reward: SEVEN_DAY_STREAK_REWARDS[nextDay - 1],
  };
}

/**
 * Checks whether the 24-hour free daily spin is ready.
 */
export function canClaimFreeDailySpin(
  lastSpinTimestampMs: number | null | undefined,
  nowMs: number
): boolean {
  if (!lastSpinTimestampMs || lastSpinTimestampMs <= 0) return true;
  return nowMs - lastSpinTimestampMs >= 24 * 60 * 60 * 1000;
}

/**
 * Purchases or equips a theme from the Cosmetic Themes Shop.
 */
export function purchaseOrEquipTheme(params: {
  themeId: ThemeId;
  coins: number;
  unlockedThemes: ThemeId[];
  activeTheme: ThemeId;
}): {
  ok: boolean;
  reason?: string;
  coins: number;
  unlockedThemes: ThemeId[];
  activeTheme: ThemeId;
} {
  const spec = COSMETIC_THEMES.find((t) => t.id === params.themeId);
  if (!spec) {
    return {
      ok: false,
      reason: 'unknown_theme',
      coins: params.coins,
      unlockedThemes: params.unlockedThemes,
      activeTheme: params.activeTheme,
    };
  }

  if (params.unlockedThemes.includes(params.themeId)) {
    return {
      ok: true,
      coins: params.coins,
      unlockedThemes: params.unlockedThemes,
      activeTheme: params.themeId,
    };
  }

  if (params.coins < spec.cost) {
    return {
      ok: false,
      reason: 'insufficient_coins',
      coins: params.coins,
      unlockedThemes: params.unlockedThemes,
      activeTheme: params.activeTheme,
    };
  }

  return {
    ok: true,
    coins: params.coins - spec.cost,
    unlockedThemes: [...params.unlockedThemes, params.themeId],
    activeTheme: params.themeId,
  };
}

/**
 * Determines Telegram HapticFeedback variations for a Wordle guess evaluation:
 * - 'heavy' impact (+ 'success' notification) for game-winning completions (all 5 'correct')
 * - 'medium' impact when at least one letter is 'correct' (green)
 * - 'light' impact when no letter is 'correct' but at least one is 'present' (yellow)
 * - 'rigid' impact when all letters are 'absent'
 */
export function determineWordleSubmissionHaptics(evaluation: readonly TileStatus[]): {
  isWin: boolean;
  correctCount: number;
  presentCount: number;
  impactStyle: 'heavy' | 'medium' | 'light' | 'rigid';
  notificationType: 'success' | null;
} {
  const correctCount = evaluation.filter((s) => s === 'correct').length;
  const presentCount = evaluation.filter((s) => s === 'present').length;
  const isWin = evaluation.length === 5 && correctCount === 5;

  if (isWin) {
    return {
      isWin: true,
      correctCount,
      presentCount,
      impactStyle: 'heavy',
      notificationType: 'success',
    };
  }

  if (correctCount > 0) {
    return {
      isWin: false,
      correctCount,
      presentCount,
      impactStyle: 'medium',
      notificationType: null,
    };
  }

  if (presentCount > 0) {
    return {
      isWin: false,
      correctCount,
      presentCount,
      impactStyle: 'light',
      notificationType: null,
    };
  }

  return {
    isWin: false,
    correctCount: 0,
    presentCount: 0,
    impactStyle: 'rigid',
    notificationType: null,
  };
}

export type TriviaPhysicsPhase = 'enter' | 'exit' | 'correct' | 'wrong' | 'eliminated';

export interface TriviaOptionPhysicsSpec {
  phase: TriviaPhysicsPhase;
  optionIndex: number;
  className: string;
  delayMs: number;
  durationMs: number;
  easing: string;
}

/**
 * Computes deterministic CSS keyframe spring-physics timing and class spec
 * for Trivia Blitz answer buttons during high-speed transitions.
 */
export function computeTriviaOptionPhysicsSpec(
  optionIndex: number,
  phase: TriviaPhysicsPhase
): TriviaOptionPhysicsSpec {
  const safeIndex = Math.max(0, Math.min(3, Math.floor(optionIndex)));

  switch (phase) {
    case 'enter':
      return {
        phase,
        optionIndex: safeIndex,
        className: 'trivia-opt-enter',
        delayMs: safeIndex * 45,
        durationMs: 320,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      };
    case 'exit':
      return {
        phase,
        optionIndex: safeIndex,
        className: 'trivia-opt-exit',
        delayMs: safeIndex * 22,
        durationMs: 160,
        easing: 'cubic-bezier(0.4, 0, 1, 1)',
      };
    case 'correct':
      return {
        phase,
        optionIndex: safeIndex,
        className: 'trivia-opt-correct-pop',
        delayMs: 0,
        durationMs: 340,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      };
    case 'wrong':
      return {
        phase,
        optionIndex: safeIndex,
        className: 'trivia-opt-wrong-shake',
        delayMs: 0,
        durationMs: 340,
        easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)',
      };
    case 'eliminated':
      return {
        phase,
        optionIndex: safeIndex,
        className: 'trivia-opt-eliminated',
        delayMs: 0,
        durationMs: 240,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      };
  }
}

export interface CoinCounterAnimationSpec {
  shouldAnimate: boolean;
  delta: number;
  containerClass: string;
  textClass: string;
  durationMs: number;
}

/**
 * Determines whether the header coin counter should play the scale-up and color-transition
 * animation when the user's coin balance updates after a game session or reward.
 */
export function evaluateCoinCounterDelta(
  previousCoins: number,
  nextCoins: number
): CoinCounterAnimationSpec {
  const prev = Math.round(Number(previousCoins) || 0);
  const next = Math.round(Number(nextCoins) || 0);
  const delta = next - prev;

  if (delta > 0) {
    return {
      shouldAnimate: true,
      delta,
      containerClass: 'coin-gain-bump',
      textClass: 'coin-text-gain-flash',
      durationMs: 520,
    };
  }

  return {
    shouldAnimate: false,
    delta,
    containerClass: '',
    textClass: '',
    durationMs: 0,
  };
}

export type BoosterToolId =
  | 'vowel_radar'
  | 'keyboard_purifier'
  | 'pop_sense_clue'
  | 'fifty_fifty_eliminator'
  | 'time_freeze'
  | 'streak_shield';

export interface BoosterToolSpec {
  id: BoosterToolId;
  name: string;
  shortName: string;
  cost: number;
  icon: string;
  mode: 'wordle' | 'trivia' | 'universal';
  desc: string;
}

export const BOOSTER_TOOLS: readonly BoosterToolSpec[] = [
  {
    id: 'vowel_radar',
    name: 'Vowel Radar',
    shortName: 'Vowels',
    cost: 60,
    icon: '📡',
    mode: 'wordle',
    desc: 'Highlights which vowels (A, E, I, O, U) exist in the secret word',
  },
  {
    id: 'keyboard_purifier',
    name: 'Keyboard Purifier',
    shortName: 'Purify 4',
    cost: 40,
    icon: '🧹',
    mode: 'wordle',
    desc: 'Permanently grays out and disables 4 absent keyboard letters',
  },
  {
    id: 'pop_sense_clue',
    name: 'Pop Sense Clue',
    shortName: 'Pop Clue',
    cost: 80,
    icon: '💡',
    mode: 'wordle',
    desc: 'Reveals a contextual US pop-culture clue for the target word',
  },
  {
    id: 'fifty_fifty_eliminator',
    name: '50:50 Eliminator',
    shortName: '50:50',
    cost: 50,
    icon: '✂️',
    mode: 'trivia',
    desc: 'Disables and fades out 2 guaranteed incorrect trivia options',
  },
  {
    id: 'time_freeze',
    name: 'Time Freeze (+10s)',
    shortName: '+10s Freeze',
    cost: 30,
    icon: '⏳',
    mode: 'trivia',
    desc: 'Pauses the countdown timer bar and adds +10s of breathing room',
  },
  {
    id: 'streak_shield',
    name: 'Streak Shield',
    shortName: 'Shield',
    cost: 100,
    icon: '🛡️',
    mode: 'universal',
    desc: 'Automatically saves your daily streak and win rate if a round is lost',
  },
];

export const POPWORD_CLUES: Readonly<Record<string, string>> = {
  OSCAR: 'Hollywood golden statuette awarded every spring at the Dolby Theatre',
  GRAMY: 'Golden gramophone trophy celebrating recording industry excellence',
  DISNY: 'Home of Mickey & Marvel magic across Anaheim and Orlando',
  APPLE: 'Cupertino tech giant behind the iPhone, Mac, and Silicon Valley',
  TESLA: "Elon's EV pioneer charging up American highways",
  BRONX: 'New York City borough famous for Yankee Stadium and the birth of hip-hop',
  MIAMI: 'South Florida neon paradise known for Art Deco beaches and Vice',
  VEGAS: 'Mojave Desert neon strip billed as the Entertainment Capital of the World',
  SUPER: 'Sunday NFL championship spectacle watched by over 120 million Americans',
  EAGLE: 'Philadelphia gridiron bird and America’s national emblem',
  CHIEF: 'Kansas City dynasty led by Patrick Mahomes at Arrowhead Stadium',
  RODEO: 'Wild West bull-riding arena sport and Beverly Hills luxury shopping drive',
  MARCH: 'College basketball tournament madness with 68 teams chasing the bracket',
  MUSIC: 'Nashville Country, Motown Soul, and Billboard Hot 100 soundwaves',
  MOVIE: 'Silver-screen blockbuster premiering on Hollywood Boulevard',
  ACTOR: 'Leading star earning a Walk of Fame plaque on Vine Street',
  STAGE: 'Broadway spotlight where Tony Award musicals come alive',
  STARS: 'Fifty white emblems shining on the American flag and Hollywood pavement',
  FAITH: 'Chart-topping country crossover theme and George Michael classic',
  GLORY: 'Championship ring pursuit and Old ___ flying above the stadium',
  QUEEN: 'Beyoncé Renaissance royalty and rock anthem champions',
  KINGS: 'Sacramento & Los Angeles arena royalty wearing purple or silver',
  VOICE: 'NBC spinning-chair singing competition hosted in Universal City',
  BILLS: 'Buffalo AFC East contender backed by the loud Mafia fanbase',
  POWER: 'High-voltage Starz drama and clean-up hitter home-run strength',
  MONEY: 'Wall Street greenbacks and Floyd Mayweather’s nickname',
  CLOUD: 'Silicon Valley hyperscale servers powering streaming and AI',
  SPACE: 'NASA Cape Canaveral launches and Kennedy Space Center frontiers',
  CYBER: 'Digital matrix defense and futuristic stainless-steel pickup trucks',
  SMART: 'Connected Silicon Valley gadgets from watches to home speakers',
  FRESH: 'Bel-Air sitcom royalty and Rotten Tomatoes certified critic rating',
  VIRAL: 'TikTok & Reels sensation racking up millions of overnight shares',
  INDIE: 'Sundance Film Festival breakout hit made outside major studios',
  BLUES: 'St. Louis & Chicago 12-bar guitar soul rooted in the Mississippi Delta',
  TRACK: 'Daytona 500 asphalt oval and studio album song listing',
  ALBUM: 'Vinyl LP record competing for the top of the Billboard 200',
  RADIO: 'FM airwaves broadcasting Ryan Seacrest’s American Top 40',
  PRESS: 'Red-carpet media junket and Fourth Estate headline reporters',
  MEDIA: 'New York & Los Angeles broadcast networks, podcasts, and streaming apps',
  TWEET: 'Short social media post that sparks breaking trending topics',
  TREND: 'Culture wave dominating US hashtags, fashion, and late-night monologues',
  SHOWS: 'Vegas residency spectacles and binge-worthy prime-time series',
  PRIME: 'Coach Deion Sanders’ nickname and Thursday Night Football streaming home',
  GUILD: 'SAG-AFTRA and WGA Hollywood unions protecting screen talent',
  COMIC: 'San Diego Convention superhero issue from Marvel or DC',
  ANIME: 'Animated saga packing US conventions and Crunchyroll marathons',
  RETRO: 'Throwback 1980s arcade nostalgia, Air Jordans, and synthwave',
  PIXEL: '8-bit video game building block and flagship Android camera phone',
  HOLLY: 'Evergreen hills overlooking Los Angeles with a famous 45-foot white sign',
  SWING: 'Big-band Jazz Age rhythm and decisive election battleground state',
  JAZZY: 'New Orleans French Quarter brass and upbeat Grammy-winning groove',
  DISCO: 'Studio 54 mirror-ball dance fever from late-1970s Manhattan',
  REMIX: 'Club-ready Billboard collaboration featuring a guest verse',
  CHART: 'Weekly Hot 100 countdown ranking America’s biggest hits',
  AWARD: 'Red-carpet trophy night spanning EGOT honors',
  CROWN: 'Pageant tiaras, Triple ___ horse racing, and royal stadium titles',
  BULLS: 'Chicago United Center legends who won six 1990s NBA banners',
  CELTS: 'Boston TD Garden parquet dynasty draped in championship green',
  SPURS: 'San Antonio River Walk five-time NBA champions',
  MAGIC: 'Orlando Amway hardwood squad and Earvin Johnson’s Lakers nickname',
  FINAL: 'Game 7 buzzer-beater stage where champions are crowned',
  COACH: 'Sideline tactician drawing up the game-winning play on a clipboard',
  ARENA: '20,000-seat downtown bowl hosting NBA games and world tours',
  DRAFT: 'Prime-time rookie selection night where franchises pick #1 overall',
};

/**
 * Inspects a 5-letter target word and returns the distinct uppercase vowels (A, E, I, O, U)
 * present in canonical order.
 */
export function inspectTargetVowels(targetWord: string): string[] {
  const clean = (targetWord || '').trim().toUpperCase();
  const vowels = ['A', 'E', 'I', 'O', 'U'];
  return vowels.filter((v) => clean.includes(v));
}

/**
 * Selects up to `count` absent uppercase letters (A-Z) that are NOT in `targetWord`
 * and not already purified/marked absent.
 */
export function selectKeyboardPurifierLetters(
  targetWord: string,
  alreadyEliminated: readonly string[],
  count = 4,
  seed = 0
): string[] {
  const cleanTarget = new Set((targetWord || '').trim().toUpperCase().split(''));
  const eliminatedSet = new Set((alreadyEliminated || []).map((c) => c.toUpperCase()));
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const candidates = alphabet.filter(
    (letter) => !cleanTarget.has(letter) && !eliminatedSet.has(letter)
  );

  if (candidates.length <= count) {
    return candidates;
  }

  const chosen: string[] = [];
  const pool = [...candidates];
  let s = Math.abs(seed) || 1;
  for (let i = 0; i < count && pool.length > 0; i++) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const idx = s % pool.length;
    chosen.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return chosen;
}

/**
 * Evaluates a booster tool's coin-gated Lock (🔒) / Unlock (🔓) status and shortfall.
 */
export function evaluateBoosterToolState(params: {
  toolId: BoosterToolId;
  userCoins: number;
  usedThisRound: boolean;
  streakShieldActive?: boolean;
}): {
  tool: BoosterToolSpec;
  isUnlocked: boolean;
  isUsedOrActive: boolean;
  lockIcon: '🔓' | '🔒' | '✓';
  coinsNeeded: number;
} {
  const spec = BOOSTER_TOOLS.find((t) => t.id === params.toolId) || BOOSTER_TOOLS[0];
  const coins = Math.max(0, Math.floor(Number(params.userCoins) || 0));
  const isUsedOrActive =
    Boolean(params.usedThisRound) ||
    (spec.id === 'streak_shield' && Boolean(params.streakShieldActive));

  if (isUsedOrActive) {
    return {
      tool: spec,
      isUnlocked: true,
      isUsedOrActive: true,
      lockIcon: '✓',
      coinsNeeded: 0,
    };
  }

  const isUnlocked = coins >= spec.cost;
  return {
    tool: spec,
    isUnlocked,
    isUsedOrActive: false,
    lockIcon: isUnlocked ? '🔓' : '🔒',
    coinsNeeded: isUnlocked ? 0 : spec.cost - coins,
  };
}

