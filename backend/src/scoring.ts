/**
 * Pure scoring functions for song rating system.
 * These functions are isolated from the rest of the app and can be tested independently.
 *
 * Scoring Model:
 * - TimeScore: How long the song survived (0-100%)
 * - VoteMultiplier: Compounds based on crowd reactions
 * - FinalScore: TimeScore * VoteMultiplier, clamped to [0, 100]
 */

/**
 * Calculate the time-based score as a percentage.
 *
 * @param playedSeconds - How many seconds the song actually played
 * @param durationSeconds - Total song duration in seconds
 * @returns TimeScore from 0 to 100
 *
 * Safety: Pure function, no side effects.
 * Example: playedSeconds=60, durationSeconds=120 → 50.0
 */
export function computeTimeScore(
  playedSeconds: number,
  durationSeconds: number
): number {
  // Guard against invalid inputs
  if (durationSeconds <= 0) return 0;
  if (playedSeconds < 0) return 0;

  // Calculate percentage (0-100)
  const percentage = (playedSeconds / durationSeconds) * 100;

  // Clamp to [0, 100] in case playedSeconds exceeds duration
  return Math.max(0, Math.min(100, percentage));
}

/**
 * Update the vote multiplier based on a new vote.
 *
 * Vote scores map to multipliers:
 * - 🔥 Play (5) → multiply by 1.04 (+4% boost)
 * - 👍 Keep (4) → multiply by 1.02 (+2% boost)
 * - 😐 Meh (2)  → multiply by 0.98 (-2% penalty)
 * - ⛔ Cut (1)  → multiply by 0.94 (-6% penalty)
 *
 * @param currentMultiplier - Current multiplier value (starts at 1.0)
 * @param voteScore - Vote score (1-5 scale)
 * @returns Updated multiplier
 *
 * Safety: Pure function, no side effects. Caller maintains state.
 * Example: currentMultiplier=1.0, voteScore=5 → 1.04
 */
export function updateVoteMultiplier(
  currentMultiplier: number,
  voteScore: number
): number {
  // Map vote scores to multiplier adjustments
  const multiplierMap: Record<number, number> = {
    1: 0.94, // Cut: -6%
    2: 0.98, // Meh: -2%
    4: 1.02, // Keep: +2%
    5: 1.04, // Play: +4%
  };

  // Get the adjustment factor (default to 1.0 for unexpected scores)
  const adjustmentFactor = multiplierMap[voteScore] ?? 1.0;

  // Apply the adjustment
  const newMultiplier = currentMultiplier * adjustmentFactor;

  // Ensure multiplier never goes negative
  return Math.max(0, newMultiplier);
}

/**
 * Compute the final score by combining time and vote multiplier.
 *
 * @param timeScore - TimeScore (0-100)
 * @param voteMultiplier - VoteMultiplier (typically 0.5 - 2.0)
 * @returns FinalScore clamped to [0, 100]
 *
 * Safety: Pure function, deterministic output.
 * Example: timeScore=50, voteMultiplier=1.2 → 60.0
 */
export function computeFinalScore(
  timeScore: number,
  voteMultiplier: number
): number {
  const rawScore = timeScore * voteMultiplier;

  // Clamp to [0, 100] range
  return Math.max(0, Math.min(100, rawScore));
}

/**
 * Helper: Get a human-readable description of current scoring state.
 * Useful for logging and debugging.
 *
 * @param playedSeconds - Played time
 * @param durationSeconds - Total duration
 * @param voteMultiplier - Current multiplier
 * @returns Object with all computed scores
 */
export function getScoringSnapshot(
  playedSeconds: number,
  durationSeconds: number,
  voteMultiplier: number
) {
  const timeScore = computeTimeScore(playedSeconds, durationSeconds);
  const finalScore = computeFinalScore(timeScore, voteMultiplier);

  return {
    playedSeconds,
    durationSeconds,
    timeScore: Number(timeScore.toFixed(2)),
    voteMultiplier: Number(voteMultiplier.toFixed(4)),
    finalScore: Number(finalScore.toFixed(2)),
  };
}
